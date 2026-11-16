// node tools/check_pitwall.cjs [--offline|--source]
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const target = process.argv[2] || '--offline';
assert(process.argv.length <= 3 && ['--source', '--offline'].includes(target),
  'Usage: node tools/check_pitwall.cjs [--offline|--source]');
const html = fs.readFileSync(path.join(root, target === '--offline' ? 'GT3-Pitwall-Offline.html' : 'dist/index.html'), 'utf8');
const blocks = target === '--offline'
  ? Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi), match => match[1])
  : [];

function load(file, name, context = vm.createContext({window:{}})) {
  let code;
  if (target === '--source') {
    code = fs.readFileSync(path.join(root, 'dist', file), 'utf8');
  } else {
    const matches = blocks.filter(block => new RegExp('\\bscope\\.' + name + '\\s*=').test(block));
    assert.equal(matches.length, 1, name + ' missing or duplicated in the offline HTML. Rebuild with tools/build_offline.py.');
    code = matches[0];
  }
  vm.runInContext(code, context, {filename:file});
  assert(context.window[name], name + ' failed to load');
  return context.window[name];
}

// Both full-distance modes share a track model. Keep the advisor isolated from them.
const trackContext = vm.createContext({window:{}});
const roster = load('hypergrid.js', 'HyperGrid', trackContext).entries;
const fullRace = load('fullrace.js', 'FullRace', trackContext);
const hyperRace = trackContext.window.HyperRace;
const sprintRace = load('race.js', 'RaceEngine');
const advisor = load('advisor.js', 'PitwallAdvisor');

const template = html.match(/<template id="timingMedia">([\s\S]*?)<\/template>/);
assert(template, 'timing image template missing');
const art = new Set();
for (const [tag] of template[1].matchAll(/<img\b[^>]*>/g)) {
  const key = tag.match(/\bdata-key="([^"]+)"/)?.[1];
  const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
  assert(key && src && !art.has(key), 'missing or duplicate timing image key: ' + key);
  let data;
  if (target === '--source') {
    assert.equal(src, 'assets/timing/' + (/^(gt|hyper)-/.test(key) ? '' : 'marks/') + key + '.webp');
    data = fs.readFileSync(path.join(root, 'dist', src));
  } else {
    assert(src.startsWith('data:image/webp;base64,'), key + ' must be embedded for offline play');
    data = Buffer.from(src.slice('data:image/webp;base64,'.length), 'base64');
  }
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', key);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', key);
  assert.equal(data.readUInt32LE(4) + 8, data.length, 'truncated timing image: ' + key);
  art.add(key);
}

const liveryTemplate = html.match(/<template id="liveryMedia">([\s\S]*?)<\/template>/);
assert(liveryTemplate, 'original livery image template missing');
const liveryBrands = new Set();
for (const [tag] of liveryTemplate[1].matchAll(/<img\b[^>]*>/g)) {
  const brand = tag.match(/\bdata-brand="([^"]+)"/)?.[1];
  const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
  assert(brand && src && !liveryBrands.has(brand), 'missing or duplicate livery brand: ' + brand);
  let data;
  if (target === '--source') {
    assert.equal(src, 'assets/liveries/' + brand + '.webp');
    data = fs.readFileSync(path.join(root, 'dist', src));
  } else {
    const prefix = 'data:image/webp;base64,';
    assert(src.startsWith(prefix), brand + ' livery must be embedded for offline play');
    data = Buffer.from(src.slice(prefix.length), 'base64');
  }
  assert(data.length >= 12, 'empty livery image: ' + brand);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', brand);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', brand);
  assert.equal(data.readUInt32LE(4) + 8, data.length, 'truncated livery image: ' + brand);
  liveryBrands.add(brand);
}
const hypercarEntries = roster.filter(team => team.category !== 'LMGT3');
assert.deepEqual(liveryBrands, new Set([...hypercarEntries.map(team => team.mark), 'aston', 'genesis']));
const liveries = load('liveries.js', 'PitwallLiveries');
for (const {mark, number, model} of hypercarEntries) {
  const livery = liveries.forBrand(mark);
  assert(livery, 'missing original livery metadata: ' + mark);
  assert.equal(livery.number, number, 'livery number differs from the selected race entry: ' + mark);
  assert.equal(livery.model, model, 'livery model differs from the selected race entry: ' + mark);
}
for (const [brand, number, model] of [
  ['aston', '007', 'Aston Martin Valkyrie'],
  ['genesis', '19', 'Genesis GMR-001']
]) {
  const livery = liveries.forBrand(brand);
  assert(livery, 'missing gallery livery metadata: ' + brand);
  assert.equal(livery.number, number, 'wrong gallery livery number: ' + brand);
  assert.equal(livery.model, model, 'wrong gallery livery model: ' + brand);
}
assert.equal(liveries.forBrand('corvette'), null, 'Corvette must use its existing car artwork');

function checkIdentity(row, profile, model) {
  const car = trackContext.window.PitwallCars.forStanding(row);
  assert.equal(car.model, model, 'wrong model for ' + row.id);
  assert.equal(car.profile, profile, 'wrong profile for ' + row.id);
  assert(car.brand && car.displayModel && art.has(profile), 'missing timing identity: ' + row.id);
  if (profile === 'gt-warspite') assert.equal(car.mark, null); // The fictional W27 uses a text monogram.
  else {
    assert.equal(car.mark, profile.split('-')[1]);
    assert(art.has(car.mark), 'missing manufacturer badge: ' + car.mark);
  }
}

function checkRadio(state, opening) {
  assert(state.radioCalls.length > 0 && state.radio, 'missing radio on L' + state.lap);
  for (const call of state.radioCalls) {
    assert(['engineer','driver'].includes(call.role), 'unknown radio role: ' + call.role);
    assert.equal(typeof call.text, 'string');
    assert(call.text.trim() && state.radio.includes(call.text), 'radio summary lost the original message');
    if (/方格旗|本圈上升|本圈下降/.test(call.text)) assert.equal(call.role, 'engineer');
  }
  if (opening) assert.equal(state.radioCalls[0].role, 'driver');
  if (state.driver && !opening) {
    assert(state.radioCalls.some(call => call.role === 'driver' && call.text === state.driver.feedback),
      'driver feedback lost its speaker on L' + state.lap);
  }
  if (state.finished) assert(state.radioCalls.some(call => call.role === 'engineer' && call.text.includes('方格旗')));
}

function follow(engine, mode, laps) {
  const orders = [];
  let state = engine.simulate(orders);
  checkRadio(state, true);
  for (let i = 0; i < laps; i++) {
    assert(!state.finished);
    assert(state.history.every(row => row.lap <= state.lap), 'engine published a future lap');
    // Only the observed prefix is available. No future snapshots or commands are supplied.
    const advice = advisor.recommend(state, [], mode);
    assert(['routine','key'].includes(advice.priority));
    for (const key of ['action','reason','risk']) {
      assert(typeof advice[key] === 'string' && advice[key].trim(), 'missing advisor ' + key);
    }
    assert(['balanced','save','push'].includes(advice.pace));
    assert(['none','slick','wet'].includes(advice.pit));
    const next = {pace:advice.pace, pit:advice.pit};
    if (i === Math.floor(laps / 2)) {
      const reference = engine.simulate([...orders, next]);
      const alternative = {pace:'save', pit:next.pit === 'slick' ? 'wet' : 'slick'};
      engine.simulate([...orders, alternative]);
      const restored = engine.simulate(orders);
      assert.deepEqual(restored, state, mode + ' rewind changed the past');
      assert.deepEqual(advisor.recommend(restored, [], mode), advice, mode + ' advice changed after rewind');
      assert.deepEqual(engine.simulate([...orders, next]), reference, mode + ' repeat changed the result');
    }
    orders.push(next);
    state = engine.simulate(orders);
    checkRadio(state, false);
  }
  assert(state.finished && state.remaining === 0);
  const review = advisor.recommend(state, [], mode);
  assert(review.action && !review.pace && !review.pit, 'advisor issued a command after the flag');
  console.log(mode + ' with advisor: P' + state.position + ', ' + state.elapsed.toFixed(3) + ' s');
}

follow(fullRace, 'full', 32);
follow(sprintRace, 'sprint', 8);

const referenceRun = Array.from({length:32}, (_, i) => {
  const lap = i + 1;
  const pit = lap === 15 ? 'wet' : lap === 24 ? 'slick' : 'none';
  return {pace:lap >= 31 ? 'push' : 'balanced', pit};
});
// Multiple events from the same engineer share one call, with one event per line.
const sprintPit = sprintRace.simulate([
  ...Array(3).fill({pace:'balanced', pit:'none'}), {pace:'balanced', pit:'wet'}
]);
const invitationalPit = hyperRace.simulate(referenceRun.slice(0, 15), 'warspite');
assert.equal(sprintPit.radioCalls.find(call => call.role === 'engineer')?.text,
  '换胎完成，驶出维修区。\n本圈下降 2 位。\n#08、#19 刚刚进站换了雨胎。');
assert.equal(invitationalPit.radioCalls.find(call => call.role === 'engineer')?.text,
  '本圈下降 3 位。\n#52、#81、#16 本圈进站。');

// Use the normal UI startup and lap commands. Record text written to each report
// without requiring a browser for the standalone source and offline checks.
function checkRadioPanel() {
  const live = html.match(/<section class="panel radio">([\s\S]*?)<details\b/);
  assert(live && !/<button\b|\shidden\b/.test(live[1]), 'live radio reports must open together');
  const ids = ['radioWeather','radioDriver','radioTyres','radioRivals'];
  for (const id of ids) assert(live[1].includes('<dd id="' + id + '">'), 'missing live report: ' + id);
  function element() {
    return {
      textContent:'', dataset:{}, classList:{toggle() {}}, addEventListener() {},
      querySelectorAll:() => [], insertAdjacentHTML() {},
      append(...items) { this.textContent += items.map(item => item.textContent).join('\n'); },
      replaceChildren(...items) { this.textContent = ''; this.append(...items); }
    };
  }
  const nodes = new Map();
  const document = {createElement:element, querySelector:() => null, getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  }};
  const context = vm.createContext({
    document, window:{addEventListener() {}}, localStorage:{getItem:() => null, setItem() {}},
    ...trackContext.window, RaceEngine:sprintRace, PitwallAdvisor:advisor,
    PitwallGarage:{figure:element}, Engineering:{render() {}}, PitwallTiming:{render() {}}
  });
  const ui = target === '--source' ? fs.readFileSync(path.join(root, 'dist/ui.js'), 'utf8')
    : blocks.find(script => script.includes('function renderRadio('));
  assert(ui, 'missing UI script');
  vm.runInContext(ui, context);
  const values = () => ids.map(id => nodes.get(id)?.textContent || '');
  const opening = values();
  assert(opening.every(Boolean), 'all four reports must be populated at startup');
  for (let i = 0; i < 15; i++) {
    context.order = referenceRun[i];
    vm.runInContext('next={...order}; sendOrder(1)', context);
  }
  const reports = values();
  for (let i = 0; i < ids.length; i++) assert.notEqual(reports[i], opening[i], 'stale report: ' + ids[i]);
  assert(reports[0].includes(invitationalPit.weather.forecast));
  assert(reports[1].includes(invitationalPit.driver.feedback));
  assert(reports[2].includes('雨胎'));
  assert(reports[3].includes(invitationalPit.standings[invitationalPit.position - 1].interval.toFixed(2)));
  vm.runInContext("switchSession('sprint')", context);
  for (let i = 0; i < 4; i++) {
    context.order = {pace:'balanced', pit:i === 3 ? 'wet' : 'none'};
    vm.runInContext('next={...order}; sendOrder(1)', context);
  }
  const sprintReports = values();
  assert(sprintReports.every(Boolean), 'sprint must also show all four reports');
  const previousDriver = sprintRace.simulate(referenceRun.slice(0, 3)).radioCalls.find(c => c.role === 'driver');
  assert(previousDriver && sprintReports[1].includes(previousDriver.text) && sprintReports[1].includes('L27'),
    'an engineer-only lap must date and retain the most recent driver message');
}
checkRadioPanel();

const full = fullRace.simulate(referenceRun);
assert.equal(full.position, 1);
assert.equal(full.elapsed, 3346.041);
assert.equal(full.standings[1].gap, 0.500);
const sprint = sprintRace.simulate(Array.from({length:8}, () => ({pace:'balanced', pit:'none'})));
assert.equal(sprint.position, 8);
assert.equal(sprint.elapsed, 876.016);

const gtModels = {
  arco:['gt-aston', 'Aston Martin Vantage GT3'], meridian:['gt-ferrari', 'Ferrari 296 GT3'],
  kessel:['gt-bmw', 'BMW M4 GT3 EVO'], atlas:['gt-porsche', 'Porsche 911 GT3 R'],
  vela:['gt-corvette', 'Corvette Z06 GT3.R'], warspite:['gt-warspite', 'W27 GT3'],
  vector:['gt-mclaren', 'McLaren 720S GT3 Evo'], north:['gt-lexus', 'Lexus RC F GT3']
};
for (const row of [...full.standings, ...sprint.standings]) checkIdentity(row, ...gtModels[row.id]);

// Changing the player reorders only the start grid; each real model retains its team,
// driver and tuning through the timing tower, telemetry and deterministic replay.
assert.equal(roster.length, 8);
const byId = new Map(roster.map(team => [team.id, team]));
assert.equal(byId.size, roster.length);
// Save files address these slots by their original IDs. The classic GT3
// field above still assigns different cars to the same two identifiers.
const replacements = [
  ['arco', '6', 'porsche', 'Porsche Penske Motorsport', 'Porsche 963', 'LMDh'],
  ['vector', '81', 'corvette', 'TF Sport', 'Corvette Z06 GT3.R', 'LMGT3']
];
for (const [id, number, mark, name, model, category] of replacements) {
  const team = byId.get(id);
  assert(team, 'lost saved team slot: ' + id);
  assert.deepEqual([team.number, team.mark, team.name, team.model, team.category],
    [number, mark, name, model, category], 'wrong replacement for ' + id);
  const photo = html.match(new RegExp('<figure data-team="' + id + '">\\s*(<img\\b[^>]*>)'))?.[1];
  assert(photo?.match(/\balt="([^"]+)"/)?.[1].includes(model), 'wrong garage photo for ' + model);
  const src = photo.match(/\bsrc="([^"]+)"/)?.[1];
  if (target === '--offline') assert(src?.startsWith('data:image/jpeg;base64,/9j/'), 'garage image must be embedded: ' + id);
  else assert(src && fs.existsSync(path.join(root, 'dist', src)), 'missing garage image: ' + id);
}

const gallery = html.match(/<template id="driverPages">([\s\S]*?)<\/template>/);
assert(gallery, 'driver gallery missing');
const drivers = new Map();
for (const [, attributes, card] of gallery[1].matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)) {
  const brand = attributes.match(/\bdata-brand="([^"]+)"/)?.[1];
  const name = card.match(/<h3>([^<]+)<\/h3>/)?.[1];
  assert(brand && name && !drivers.has(brand), 'invalid or duplicate driver card: ' + brand);
  drivers.set(brand, name);
}
assert.deepEqual(new Set(drivers.keys()), new Set([...roster.map(team => team.mark), 'genesis', 'aston']));
assert.equal(drivers.get('genesis'), '韩瑞允');
assert.equal(drivers.get('aston'), '埃莉诺·维尔');
const elapsedByTeam = new Set();
for (const team of roster) {
  assert.equal(team.driver, drivers.get(team.mark), 'driver gallery mismatch for ' + team.model);
  let last;
  for (let n = 0; n <= referenceRun.length; n++) {
    const state = hyperRace.simulate(referenceRun.slice(0, n), team.id);
    const players = state.standings.filter(row => row.player);
    assert.equal(players.length, 1);
    assert.equal(players[0].id, team.id);
    assert.equal(state.position, players[0].position);
    assert.equal(state.driver.name, team.driver);
    assert.equal(state.car.name, team.model);
    assert.equal(state.car.trait, team.trait);
    assert.equal(state.standings.length, roster.length);
    assert.equal(new Set(state.standings.map(row => row.id)).size, roster.length);
    for (const row of state.standings) {
      assert.equal(row.model, byId.get(row.id).model);
      assert.equal(row.number, byId.get(row.id).number);
      const entry = byId.get(row.id);
      const profile = entry.mark === 'corvette' ? 'gt-corvette-81' : 'hyper-' + entry.mark;
      checkIdentity(row, profile, row.model);
    }
    checkRadio(state, !n);
    assert(state.radio.startsWith(team.driver + '：') || state.radio.includes(' ' + team.driver + '：'));
    assert.equal(state.finished, n === referenceRun.length);
    if (!n) assert.equal(state.position, 6);
    if (n === 5) {
      const rewound = hyperRace.simulate(referenceRun.slice(0, n - 1), team.id);
      assert.deepEqual(rewound, last);
    }
    last = state;
  }
  elapsedByTeam.add(last.elapsed);
}
assert(elapsedByTeam.size > 1, 'all selectable cars produced the same result');
const fallback = hyperRace.simulate([], 'missing-team');
assert.equal(fallback.standings.find(row => row.player).id, roster[0].id);
console.log('PASS ' + target + ': radio, advisor, rewind, both GT3 baselines, all ' + roster.length + ' invitational crews and ' + art.size + ' timing images');
