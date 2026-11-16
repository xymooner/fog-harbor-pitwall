// Run "node handoff/deepseek/b1/check.mjs" from the project root.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import '../../../dist/hypergrid.js';
import '../../../dist/fullrace.js';
import '../../../dist/race.js';

const packageFile = new URL('./teams.json', import.meta.url);
const triggerNotes = {
  dryPush:'干胎追击，平均积水低于 2%，四胎均在温窗且余量均高于 60%，疲劳低于 45%。',
  pushFatigue:'连续追击至少 3 圈，疲劳超过 42%。',
  wetRun:'使用雨胎，三个区段的积水都至少 40%，四胎均在温窗且余量均超过 50%，疲劳低于 55%。',
  dryingWet:'使用雨胎且积水正在下降，一区积水最多 32%，三区至少比一区高 14 个百分点。',
  dryStint:'干胎均衡，同一套胎至少 4 圈，平均积水低于 2%，四胎均余 60% 以上，右后余量高于右前。',
  s2Ahead:'使用干胎，二区积水至少 30%，一区积水低于 20%。',
  longStint:'同一套干胎至少 10 圈，四胎均余 60% 以上，平均积水低于 2%，本圈为均衡或保胎。',
  closeAhead:'前车存在，冲线间隔最多 1.6 秒。',
  hotRightRear:'右后胎温度高于所装胎种的工作温度上限。',
  rrWorn:'右后余量低于 45%，并且少于右前。',
  closeBehind:'后车存在，冲线间隔低于 1 秒。',
  usedSet:'四条胎中至少一条余量低于 50%。',
  gapAhead:'前车存在，冲线间隔超过 3 秒。',
  lateReserve:'已完成至少 24 圈，使用干胎，平均积水低于 16%，疲劳低于 50%，四胎均在温窗且余量均高于 50%。'
};

const entries = globalThis.HyperGrid.entries;
const crews = entries.map(team => ({
  teamId:team.id, name:team.name, number:team.number, model:team.model, driver:team.driver,
  story:team.story, paddock:team.paddock, style:team.style, strength:team.strength, weakness:team.weakness,
  radioLines:team.radioLines.map(line => ({...line, condition:triggerNotes[line.trigger]})),
  gameCoefficients:{speed:team.speed, wetSkill:team.wetSkill, care:team.care, load:team.load, effort:team.effort},
  realVehicle:{category:team.category, engine:team.engine, layout:team.layout},
  sources:{
    realVehicle:[team.source, team.specSource].filter(Boolean),
    gameModel:['dist/hypergrid.js', 'dist/fullrace.js'],
    fiction:'队史、围场手记、车手和通话均为雾港原创。车号沿用邀请赛车组。优势与代价依据雾港模型。'
  }
}));
const formatted = JSON.stringify(crews, null, 2) + '\n';
if (process.argv[2] === '--export') writeFileSync(packageFile, formatted);
assert.equal(readFileSync(packageFile, 'utf8'), formatted, 'B1 数据和参赛车组有差异，请重新核对或导出。');

const allLines = new Set(crews.flatMap(team => team.radioLines.map(line => line.text)));
for (const crew of crews) {
  assert.equal(crew.radioLines.length, 2);
  const seen = new Map();
  for (const pace of ['balanced', 'push']) {
    const commands = [];
    const thisRun = new Set();
    for (let lap = 1; lap <= 32; lap++) {
      commands.push({pace, pit:lap === 15 ? 'wet' : lap === 25 ? 'slick' : 'none'});
      const state = globalThis.HyperRace.simulate(commands, crew.teamId);
      for (const call of state.radioCalls.filter(call => allLines.has(call.text))) {
        const line = crew.radioLines.find(line => line.text === call.text);
        assert(line && line.condition && line.speaker === call.role, '通话车组、触发条件或说话人错误');
        assert(!thisRun.has(line.trigger), '同场重复通报');
        assert(commands.at(-1).pit === 'none' && !state.finished, '进站或完赛时覆盖了关键反馈');
        if (call.role === 'driver') assert.equal(call.text, state.driver.feedback);
        const alternate = [...commands.slice(0, -1), {pace:'save', pit:'slick'}];
        globalThis.HyperRace.simulate(alternate, crew.teamId);
        assert.deepEqual(globalThis.HyperRace.simulate(commands, crew.teamId), state);
        thisRun.add(line.trigger);
        if (!seen.has(line.trigger)) seen.set(line.trigger, pace + ' L' + lap);
      }
    }
  }
  assert.equal(seen.size, 2, '无法通过比赛指令触发 ' + crew.name + ' 的全部通话');
  console.log('#' + crew.number, Object.fromEntries(seen));
}
for (const [engine, laps] of [[globalThis.FullRace, 32], [globalThis.RaceEngine, 8]]) {
  for (let n = 0; n <= laps; n++) {
    const state = engine.simulate(Array(n).fill({pace:'balanced', pit:'none'}));
    assert(state.radioCalls.every(call => !allLines.has(call.text)), '旧 GT3 收到邀请赛专属通话');
  }
}
console.log('PASS 8 crews, 16 calls, replay, legacy GT3');
