import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const baselineFile = new URL('baseline.json', import.meta.url);
const projectRoot = new URL('../../../', import.meta.url);
const scope = { window: {} };
const sourceSha256 = {};
for (const file of ['dist/hypergrid.js', 'dist/fullrace.js', 'dist/race.js', 'dist/advisor.js']) {
  const source = readFileSync(new URL(file, projectRoot));
  sourceSha256[file] = createHash('sha256').update(source).digest('hex');
  runInNewContext(source.toString('utf8'), scope, { filename: file });
}
const { HyperGrid, HyperRace, FullRace, RaceEngine, PitwallAdvisor } = scope.window;
const strategies = ['balanced-stay', 'push-stay', 'observed-tyres'];

function observe(state, previousWetnessPct) {
  // These values already exist at the timing line. The policy receives this copy only.
  return {
    lap: state.lap,
    position: state.position,
    tyre: state.tyre,
    wetnessPct: state.weather.wetness,
    previousWetnessPct,
    sectorWetnessPct: state.weather.sectors ? [...state.weather.sectors] : null
  };
}

function choose(strategy, seen) {
  if (strategy === 'balanced-stay') return { pace: 'balanced', pit: 'none', reason: '固定均衡，整场留场。' };
  if (strategy === 'push-stay') return { pace: 'push', pit: 'none', reason: '固定追击，整场留场。' };
  assert.equal(strategy, 'observed-tyres');
  const { tyre, wetnessPct, previousWetnessPct, sectorWetnessPct } = seen;
  const rising = previousWetnessPct !== null && wetnessPct > previousWetnessPct;
  const falling = previousWetnessPct !== null && wetnessPct < previousWetnessPct;
  if (tyre === 'slick' && rising && sectorWetnessPct.filter(value => value >= 30).length >= 2) {
    return { pace: 'balanced', pit: 'wet', reason: '全场湿度上升，至少两个区段已达 30%，换雨胎。' };
  }
  if (tyre === 'wet' && falling && sectorWetnessPct.filter(value => value <= 45).length >= 2) {
    return { pace: 'balanced', pit: 'slick', reason: '全场湿度回落，至少两个区段已降至 45% 或以下，换干胎。' };
  }
  const reason = tyre === 'slick' ? '换雨胎的观测条件尚未满足，维持干胎。' : '换干胎的观测条件尚未满足，维持雨胎。';
  return { pace: 'balanced', pit: 'none', reason };
}

function run(teamId, mode, strategy, simulate) {
  const commands = [];
  const trace = [];
  let state = simulate(commands);
  assert.equal(state.standings.find(car => car.player).id, teamId);
  while (!state.finished) {
    const before = observe(state, trace.at(-1)?.before.wetnessPct ?? null);
    const decision = strategy === 'advisor' ? PitwallAdvisor.recommend(state, [], mode) : choose(strategy, before);
    const { pace, pit, reason } = decision;
    commands.push({ pace, pit });
    state = simulate(commands);
    assert.equal(before.lap + 1, state.lap);
    const after = {
      position: state.position,
      lapSeconds: state.lastLap,
      elapsedSeconds: state.elapsed,
      tyre: state.tyre,
      rightRearLifePct: state.rr
    };
    if (state.effects) {
      after.fatiguePct = state.driver.fatigue;
      after.lowestTyreLifePct = Math.min(...Object.values(state.tyres).map(wheel => wheel.remaining));
      after.effectsSeconds = state.effects;
    }
    trace.push({ lap: state.lap, before, reason, after });
  }
  // Use the exact list again, through the same public entry point, then check the
  // model's entire final state, including the complete lap-by-lap history.
  assert.deepEqual(simulate(commands), state);
  assert.equal(Math.round(trace.reduce((sum, row) => sum + row.after.lapSeconds, 0) * 1000),
    Math.round(state.elapsed * 1000));
  return { teamId, mode, strategy, commands, trace, finishPosition: state.position, elapsedSeconds: state.elapsed };
}

function runAll() {
  const invitational = HyperGrid.entries.flatMap(team =>
    strategies.map(strategy => run(team.id, 'hyper', strategy, commands => HyperRace.simulate(commands, team.id))));
  const compatibility = [
    run('warspite', 'full', 'advisor', commands => FullRace.simulate(commands)),
    run('warspite', 'sprint', 'advisor', commands => RaceEngine.simulate(commands)),
    run('warspite', 'sprint', 'balanced-stay', commands => RaceEngine.simulate(commands))
  ];
  assert.equal(invitational.length, 24);
  for (const replay of invitational) {
    assert.equal(replay.trace.length, 32);
    assert.equal(replay.trace[0].before.position, 6);
  }
  assert.deepEqual(compatibility.map(row => [row.finishPosition, row.elapsedSeconds]),
    [[1, 3345.893], [5, 856.262], [8, 876.016]]);
  return { sourceSha256, invitational, compatibility };
}

const flag = process.argv[2] ?? '--check';
assert(process.argv.length <= 3 && ['--check', '--write'].includes(flag),
  'Usage: node handoff/deepseek/b3/replay.mjs [--check|--write]');
const first = runAll();
assert.deepEqual(runAll(), first);
if (flag === '--write') writeFileSync(baselineFile, JSON.stringify(first, null, 2) + '\n');
const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
assert.deepEqual(baseline.sourceSha256, sourceSha256, '模型源码与归档版本不同。');
for (const group of ['invitational', 'compatibility']) {
  assert.equal(baseline[group].length, first[group].length);
  for (const [index, replay] of first[group].entries()) {
    assert.deepEqual(baseline[group][index], JSON.parse(JSON.stringify(replay)),
      [replay.mode, replay.teamId, replay.strategy].join(' / ') + ' 与归档回放不同。');
  }
}
console.log('通过：八队 24 条策略回放、3 条 GT3 基准的两次决策与逐圈结果一致。已核对 baseline.json。');
