import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// East/north Cartesian coordinates. The meteorological bearing says where wind comes FROM.
function rainField(setup, cell, wallSeconds) {
  const rad = cell.windFromDeg * Math.PI / 180;
  const travelKm = cell.windSpeedMps * wallSeconds / 1000;
  const eastKm = cell.startEastKm - Math.sin(rad) * travelKm;
  const northKm = cell.startNorthKm - Math.cos(rad) * travelKm;
  const rates = setup.sectors.map(s => {
    const distance = Math.hypot(eastKm - s.eastKm, northKm - s.northKm);
    return cell.peakMmPerHour * Math.max(0, 1 - distance / cell.radiusKm);
  });
  return { eastKm, northKm, rates };
}

function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const round = value => Number(value.toFixed(5));
const order = cars => [...cars].sort((a, b) => b.distanceM - a.distanceM || a.grid - b.grid);
const standings = cars => order(cars).map((c, index) => ({
  position: index + 1, car: c.id, distanceM: round(c.distanceM)
}));
const paceFactor = { balanced: 1, push: 1.035, conserve: 0.975 };
const wetness = sector => Math.min(1, sector.waterMm / 1.2 + sector.rainMmPerHour / 160);
function targetSpeed(car, sector) {
  const gripLoss = wetness(sector);
  const tyreFactor = car.tyre === 'wet' ? 0.95 - 0.13 * gripLoss : 1 - 0.34 * gripLoss;
  return car.baseSpeedMps * paceFactor[car.pace] * tyreFactor;
}

function sectorIndex(sectors, lapLengthM, distanceM) {
  let offset = distanceM % lapLengthM;
  for (let i = 0; i < sectors.length - 1; i++) {
    if (offset < sectors[i].lengthM) return i;
    offset -= sectors[i].lengthM;
  }
  return sectors.length - 1;
}

function runGreen(ctx, weather, random, events) {
  const { setup, cars, race, greenSeconds, lapLengthM } = ctx;
  const dt = setup.stepSeconds;
  const sorted = order(cars);
  for (const cmd of race.commands.filter(c => c.greenSeconds === greenSeconds)) {
    const car = cars.find(c => c.id === cmd.car);
    if (cmd.pace) car.pace = cmd.pace;
    if (cmd.pitTyre) car.pitRequest = cmd.pitTyre;
    events.push({ type: 'command', ...cmd });
  }
  const ledger = {};
  // Stable grid order gives each car the same two draws per green step across strategies.
  for (const car of cars) {
    const sector = weather.sectors[sectorIndex(setup.sectors, lapLengthM, car.distanceM)];
    const front = sorted[sorted.indexOf(car) - 1];
    const gapM = front ? front.distanceM - car.distanceM : Infinity;
    const speedMps = targetSpeed(car, sector);
    const close = gapM <= 25;
    const exposure = Math.max(0, dt - car.delaySeconds);
    const hazard = 0.0003 + 0.0015 * Number(close) + 0.0011 * Number(car.pace === 'push')
      + 0.002 * wetness(sector) + 0.001 * Math.max(0, speedMps / 50 - 1);
    const draw = random(), severity = random();
    let ownDelay = 0;
    const incidentProbability = 1 - Math.exp(-hazard * exposure);
    if (draw < incidentProbability) {
      const contact = close && front.delaySeconds === 0 && car.delaySeconds === 0 && severity < 0.45;
      ownDelay = contact ? 4 + 5 * severity : 3 + 6 * severity;
      events.push({ type: contact ? 'contact' : 'slide', car: car.id,
        front: contact ? front.id : null, delaySeconds: round(ownDelay),
        frontDelaySeconds: contact ? round(ownDelay / 2) : 0, origin: 'seeded-draw' });
    }
    ledger[car.id] = { startM: round(car.distanceM), sector: sector.id, tyre: car.tyre,
      pace: car.pace, gapAheadM: front ? round(gapM) : null, speedMps: round(speedMps),
      risk: round(incidentProbability), draw: round(draw), carryDelaySeconds: round(car.delaySeconds),
      incidentDelaySeconds: ownDelay };
  }
  for (const event of events.filter(e => e.type === 'contact')) {
    ledger[event.front].incidentDelaySeconds += event.frontDelaySeconds;
  }
  for (const car of cars) {
    const item = ledger[car.id];
    car.delaySeconds += item.incidentDelaySeconds;
    const lost = Math.min(dt, car.delaySeconds);
    car.delaySeconds -= lost;
    const start = car.distanceM;
    let moved = (dt - lost) * item.speedMps;
    let service = 0;
    // The pit is on the timing line. Split the interval at pit entry, so service can
    // straddle a red flag and the new compound first applies on release.
    const toLine = lapLengthM - (start % lapLengthM);
    if (car.pitRequest && moved >= toLine) {
      const available = (moved - toLine) / item.speedMps;
      service = Math.min(available, setup.rules.pitStopSeconds);
      const releaseTyre = car.pitRequest;
      car.pitRequest = null;
      car.delaySeconds += setup.rules.pitStopSeconds - service;
      car.tyre = releaseTyre;
      item.afterPitSeconds = round(available - service);
      item.afterPitSpeedMps = round(targetSpeed(car, weather.sectors[0]));
      moved = toLine + (available - service) * item.afterPitSpeedMps;
      events.push({ type: 'pit', car: car.id, tyre: releaseTyre,
        offsetSeconds: round(lost + toLine / item.speedMps), serviceSeconds: setup.rules.pitStopSeconds });
    }
    car.distanceM += moved;
    Object.assign(item, { incidentDelaySeconds: round(item.incidentDelaySeconds),
      lostSeconds: round(lost + service), movedM: round(moved), endM: round(car.distanceM) });
  }
  const before = sorted.map(c => c.id);
  const after = order(cars).map(c => c.id);
  const changes = after.flatMap((id, index) => {
    const passed = after.slice(index + 1).filter(other => before.indexOf(other) < before.indexOf(id));
    return passed.length ? [{ car: id, passed }] : [];
  });
  if (changes.length) events.push({ type: 'overtakes', changes, basis: 'interval.ledger' });
  return ledger;
}

export function simulate(setup, race) {
  const { stepSeconds: dt, rules } = setup;
  assert(Number.isInteger(dt) && dt > 0 && setup.sectors.length === 3);
  assert(rules.greenDurationSeconds > 0 && rules.greenDurationSeconds % dt === 0);
  assert(setup.radarSweepSeconds > 0 && setup.radarDelaySeconds >= 0);
  assert(rules.maximumHoldSeconds > 0 && rules.safeSweepsToRestart > 0);
  assert(rules.safeRainMmPerHour < rules.redRainMmPerHour && rules.safeWaterMm < rules.redWaterMm);
  assert(setup.sectors.every(s => s.lengthM > 0) && race.cell.radiusKm > 0);
  assert(rules.pitStopSeconds >= 0 && setup.drainMmPerHour >= 0);
  const cars = setup.cars.map((c, grid) => ({ ...c, grid, distanceM: c.gridDistanceM, delaySeconds: 0,
    tyre: 'slick', pitRequest: null }));
  assert(new Set(cars.map(c => c.id)).size === cars.length);
  for (const c of race.commands) {
    assert(c.greenSeconds >= 0 && c.greenSeconds % dt === 0 && cars.some(car => car.id === c.car));
    assert((c.pace || c.pitTyre) && (!c.pace || Object.hasOwn(paceFactor, c.pace)));
    assert(!c.pitTyre || ['slick', 'wet'].includes(c.pitTyre));
  }
  const random = generator(race.seed);
  const water = setup.sectors.map(() => 0);
  const lapLengthM = setup.sectors.reduce((sum, s) => sum + s.lengthM, 0);
  const timeline = [];
  let previous, holdAt = null, safe = 0, greenSeconds = 0, interval = null;
  let checkpoint = { wallSeconds: 0, greenSeconds: 0, standings: standings(cars) };
  for (let wallSeconds = 0; ; wallSeconds += dt) {
    const field = rainField(setup, race.cell, wallSeconds);
    const sectors = setup.sectors.map((s, i) => {
      const rainMm = previous ? (field.rates[i] + previous.rates[i]) * dt / 7200 : 0;
      if (previous) water[i] = Math.max(0, water[i] + rainMm - setup.drainMmPerHour * dt / 3600);
      return { id: s.id, rainMmPerHour: round(field.rates[i]), intervalRainMm: round(rainMm),
        waterMm: round(water[i]) };
    });
    previous = field;
    const sampledAt = Math.floor((wallSeconds - setup.radarDelaySeconds) / setup.radarSweepSeconds)
      * setup.radarSweepSeconds;
    let radar = null;
    if (sampledAt >= 0) {
      const scan = rainField(setup, race.cell, sampledAt);
      radar = { sampledAt, eastKm: +scan.eastKm.toFixed(1), northKm: +scan.northKm.toFixed(1),
        sectorRatesMmPerHour: scan.rates.map(v => Math.round(v / 5) * 5) };
    }
    const actual = { eastKm: round(field.eastKm), northKm: round(field.northKm), sectors };
    const events = [];
    if (interval) checkpoint = { wallSeconds, greenSeconds, standings: standings(cars) };
    const frame = { wallSeconds, greenSeconds, interval, observation: { radar }, actual,
      standings: checkpoint.standings, events };
    timeline.push(frame);
    let terminal = null;
    if (greenSeconds === rules.greenDurationSeconds) {
      terminal = 'finish';
    } else if (holdAt === null) {
      if (sectors.some(s => s.rainMmPerHour >= rules.redRainMmPerHour || s.waterMm >= rules.redWaterMm)) {
        holdAt = wallSeconds;
        safe = 0;
        events.push({ type: 'red', timingPointWallSeconds: checkpoint.wallSeconds });
      }
    } else {
      const clear = sectors.every(s => s.rainMmPerHour <= rules.safeRainMmPerHour && s.waterMm <= rules.safeWaterMm);
      safe = clear ? safe + 1 : 0;
      if (safe >= rules.safeSweepsToRestart) {
        events.push({ type: 'restart', timingPointWallSeconds: checkpoint.wallSeconds });
        holdAt = null;
      } else if (wallSeconds - holdAt >= rules.maximumHoldSeconds) {
        terminal = 'abandon';
      }
    }
    if (terminal) {
      events.push({ type: terminal, timingPointWallSeconds: checkpoint.wallSeconds });
      return { id: race.id, seed: race.seed, outcome: terminal, endedWallSeconds: wallSeconds,
        classification: checkpoint, timeline };
    }
    frame.flag = holdAt === null ? 'green' : 'red';
    interval = null;
    if (frame.flag === 'green') {
      const driving = [];
      const ledger = runGreen({ setup, cars, race, greenSeconds, lapLengthM }, actual, random, driving);
      interval = { fromWallSeconds: wallSeconds, greenStartSeconds: greenSeconds, ledger, events: driving };
      greenSeconds += dt;
    }
  }
}

function testResult(result, setup, race) {
  assert.deepEqual(result, simulate(setup, race));
  let last = standings(setup.cars.map((c, grid) => ({ ...c, grid, distanceM: c.gridDistanceM })));
  let prev;
  for (const frame of result.timeline) {
    const radar = frame.observation.radar;
    if (radar) {
      assert(radar.sampledAt <= frame.wallSeconds - setup.radarDelaySeconds);
      const scan = rainField(setup, race.cell, radar.sampledAt);
      assert.equal(radar.eastKm, +scan.eastKm.toFixed(1));
      assert.equal(radar.northKm, +scan.northKm.toFixed(1));
      assert.deepEqual(radar.sectorRatesMmPerHour, scan.rates.map(v => Math.round(v / 5) * 5));
    }
    if (prev) {
      assert.equal(frame.wallSeconds - prev.wallSeconds, setup.stepSeconds);
      assert.equal(Boolean(frame.interval), prev.flag === 'green');
      assert.equal(frame.greenSeconds - prev.greenSeconds, frame.interval ? setup.stepSeconds : 0);
      for (const [i, sector] of frame.actual.sectors.entries()) {
        const expected = Math.max(0, prev.actual.sectors[i].waterMm + sector.intervalRainMm
          - setup.drainMmPerHour * setup.stepSeconds / 3600);
        assert(Math.abs(sector.waterMm - expected) < 0.00002);
      }
    }
    if (frame.interval) {
      const { ledger, events } = frame.interval;
      const grid = setup.cars.map(c => c.id);
      const after = [...last].sort((a, b) => ledger[b.car].endM - ledger[a.car].endM || grid.indexOf(a.car) - grid.indexOf(b.car));
      for (const { car, distanceM } of last) {
        const v = ledger[car];
        assert(Math.abs(distanceM - v.startM) < 0.0001);
        assert(Math.abs(v.endM - v.startM - v.movedM) < 0.0001);
        const afterPit = v.afterPitSeconds || 0;
        const moving = setup.stepSeconds - v.lostSeconds - afterPit;
        assert(Math.abs(v.speedMps * moving + afterPit * (v.afterPitSpeedMps || 0) - v.movedM) < 0.002);
      }
      const overtakes = events.find(e => e.type === 'overtakes')?.changes || [];
      for (let i = 0; i < last.length; i++) {
        for (const oldBehind of last.slice(i + 1)) {
          const flipped = after.indexOf(oldBehind) < after.indexOf(last[i]);
          assert.equal(overtakes.some(e => e.car === oldBehind.car && e.passed.includes(last[i].car)), flipped);
        }
      }
      last = after.map(({ car }, i) => ({ position: i + 1, car, distanceM: ledger[car].endM }));
    }
    assert.deepEqual(frame.standings, last);
    prev = frame;
  }
  assert.deepEqual(result.classification.standings, last);
  const point = result.timeline.find(f => f.wallSeconds === result.classification.wallSeconds);
  assert.equal(point.greenSeconds, result.classification.greenSeconds);
}

function main(args) {
  const { setup, scenarios } = JSON.parse(readFileSync(new URL('./scenarios.json', import.meta.url)));
  if (args.length === 1 && args[0] === '--check') {
    const results = scenarios.map(s => simulate(setup, s));
    results.forEach((r, i) => testResult(r, setup, scenarios[i]));
    const find = id => results.find(r => r.id === id);
    const controls = r => r.timeline.flatMap(f => f.events.map(e => e.type));
    assert.deepEqual(controls(find('edge')), ['finish']);
    const wetSectors = new Set(find('edge').timeline.flatMap(f => f.actual.sectors.filter(s => s.intervalRainMm > 0).map(s => s.id)));
    assert.deepEqual([...wetSectors], ['S2']);
    assert.deepEqual(controls(find('restart')), ['red', 'restart', 'finish']);
    assert.deepEqual(controls(find('abandon')), ['red', 'abandon']);
    const controlAt = (r, type) => r.timeline.find(f => f.events.some(e => e.type === type));
    const abandoned = find('abandon');
    const redAt = controlAt(abandoned, 'red').wallSeconds;
    assert.equal(abandoned.classification.wallSeconds, redAt);
    assert.equal(abandoned.endedWallSeconds - redAt, setup.rules.maximumHoldSeconds);
    const restarted = find('restart');
    const restartAt = controlAt(restarted, 'restart');
    assert.equal(restartAt.greenSeconds, controlAt(restarted, 'red').greenSeconds);
    assert.equal(restartAt.events[0].timingPointWallSeconds, controlAt(restarted, 'red').wallSeconds);
    assert.equal(restarted.classification.greenSeconds, setup.rules.greenDurationSeconds);
    const drivers = results.flatMap(r => r.timeline.flatMap(f => f.interval?.events || []));
    assert(drivers.some(e => ['contact', 'slide'].includes(e.type) && setup.cars.some(c => c.id === e.car && !c.isPlayer)));
    assert(drivers.some(e => e.type === 'contact' && e.frontDelaySeconds > 0));
    assert(drivers.some(e => e.type === 'pit'));
    console.log('PASS: three deterministic traces, delayed radar, rain graze, clocks, ledger, overtakes, pit, opponent incident and both red-flag outcomes.');
    return;
  }
  if (args.length !== 1 || !scenarios.some(s => s.id === args[0])) {
    throw new Error('Usage: node prototype.mjs --check | edge | restart | abandon');
  }
  console.log(JSON.stringify(simulate(setup, scenarios.find(s => s.id === args[0])), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
