/* Fictional GT3 sprint finish. All times are in seconds; RR is remaining tread in percent.
 * simulate([{pace: 'balanced'|'push'|'save', pit: 'none'|'slick'|'wet'}, ...])
 * replays completed commands from the timing line at L24. Decisions take effect on the
 * following lap; a stop is charged at the beginning of that lap, before the timed running.
 */
(function (scope) {
  'use strict';

  const START = 24;
  const FINISH = 32;
  const PIT_LOSS = 22;
  const playerId = 'warspite';
  const round = (value, digits = 3) => Number(value.toFixed(digits));

  // Row L is the observed surface at the end of lap L. Before each command only the
  // current observation and the contemporary radar report are returned to the player.
  const track = [
    [0, '干地', '西侧有一片雨云。两圈内赛道大概率保持干燥，之后的雨量还不好判断。'],
    [0, '干地', '云团正往赛道移动。预计一至三圈内开始落雨，强度仍不确定。'],
    [0, '干地', '二号区段的观察员看见零星雨点。接下来两圈的抓地力可能变化很快。'],
    [9, '零星小雨', '二号区段的雨带正在接近主直道。预计未来一至两圈积水增加。'],
    [38, '路面转湿', '局部出现积水，雷达显示雨区主体还在靠近。'],
    [73, '中雨', '三个区段都在持续落雨，未来一圈缺少明显干线。'],
    [86, '大面积积水', '雨区尾端已接近，但赛道排水还需要时间。'],
    [68, '中雨减弱', '雨势正在减弱，最后一圈部分弯道仍有积水。'],
    [45, '湿地', '本场已完赛。']
  ];

  // Every rival starts on slicks. Numbers, team names, pace and stop plans are fictional.
  // Offsets are the times at which each car crossed the L24 timing line relative to us.
  const field = [
    {id:'arco', number:'08', name:'Arco Corse', offset:-17.8, pace:-0.52, rr:58, stop:28},
    {id:'meridian', number:'16', name:'Meridian GT', offset:-12.1, pace:-0.27, rr:62, stop:29},
    {id:'kessel', number:'64', name:'Kestrel Racing', offset:-8.6, pace:0.04, rr:52, stop:27},
    {id:'atlas', number:'31', name:'Atlas Sport', offset:-4.8, pace:0.13, rr:59, stop:30},
    {id:'vela', number:'52', name:'Vela Racing', offset:-2.4, pace:0.18, rr:48, stop:30},
    {id:playerId, number:'27', name:'Warspite Racing', offset:0, pace:-0.32, rr:43, stop:0},
    {id:'vector', number:'19', name:'Vector GT', offset:0.8, pace:-0.02, rr:68, stop:28},
    {id:'north', number:'83', name:'Northline', offset:5.4, pace:0.18, rr:53, stop:0}
  ];

  const openingTimes = [100.991, 101.475, 101.672, 102.119, 102.38];
  const openingTread = [63, 58, 53, 48, 43];
  const dryLastLaps = [101.483, 101.522, 101.760, 101.604, 101.925, 102.380, 101.241, 102.027];
  const paceProfiles = {
    balanced: {time:0, wear:1},
    push: {time:-0.78, wear:1.8},
    save: {time:0.55, wear:0.48}
  };

  function openingHistory() {
    return openingTimes.map((time, index) => ({
      lap:20 + index, time, rr:openingTread[index], position:6,
      pace:'balanced', pit:'none', weather:'干地', tyre:'slick'
    }));
  }

  function startField() {
    return field.map((entry, index) => ({
      ...entry, index, total:entry.offset, lastLap:dryLastLaps[index],
      tyre:'slick', pitted:false
    }));
  }

  function standings(cars) {
    const sorted = [...cars].sort((a, b) => a.total - b.total || a.index - b.index);
    return sorted.map((car, index) => ({
      id:car.id, number:car.number, name:car.name, position:index + 1,
      player:car.id === playerId, gap:round(car.total - sorted[0].total),
      interval:index ? round(car.total - sorted[index - 1].total) : 0,
      tyre:car.tyre, pitted:car.pitted, lastLap:car.lastLap
    }));
  }

  function carLap(car, lap, action, surface) {
    car.pitted = action.pit !== 'none';
    if (car.pitted) {
      car.tyre = action.pit;
      car.rr = 100;
    }
    const wet = surface / 100;
    const slick = car.tyre === 'slick';
    const profile = paceProfiles[action.pace];
    const drag = slick ? 14.1 * wet ** 1.48 : 2.65 + 2.9 * wet + 3.3 * (1 - wet) ** 3;
    const treadPenalty = (100 - car.rr) * 0.021 + Math.max(0, 42 - car.rr) ** 1.35 * 0.057;
    const instability = action.pace === 'push' ? (slick ? wet * 1.65 : 0) + Math.max(0, 35 - car.rr) * 0.058 : 0;
    const paceBenefit = action.pace === 'save' && slick ? -0.26 * wet : 0;
    const variance = Math.sin(lap * 1.58 + car.index * 2.06) * 0.19;
    const stop = car.pitted ? PIT_LOSS + 0.85 : 0;
    const wear = slick ? 5.3 - 1.2 * wet : 4.2 + 7.8 * (1 - wet) ** 2;
    car.lastLap = round(100.9 + car.pace + drag + treadPenalty + profile.time + instability + paceBenefit + variance + stop);
    car.total = round(car.total + car.lastLap);
    car.rr = Math.max(0, round(car.rr - wear * profile.wear, 2));
  }

  function normalize(input) {
    const pace = Object.hasOwn(paceProfiles, input?.pace) ? input.pace : 'balanced';
    const pit = ['slick','wet'].includes(input?.pit) ? input.pit : 'none';
    return {pace, pit};
  }

  function rivalOrder(car, lap) {
    const pace = (car.index === 6 && lap < 28) || lap === FINISH ? 'push' : 'balanced';
    return {pace, pit:car.stop === lap ? 'wet' : 'none'};
  }

  function radioReport(cars, me, before, after, surface, finished) {
    const calls = [];
    if (finished) calls.push('方格旗！我们以 P' + after + ' 完赛。');
    else if (me.pitted) calls.push('换胎完成，驶出维修区。');
    if (after !== before) calls.push('本圈' + (after < before ? '上升 ' : '下降 ') + Math.abs(after - before) + ' 位。');
    const stops = cars.filter(c => c.id !== playerId && c.pitted).map(c => '#' + c.number);
    if (stops.length) calls.push(stops.join('、') + ' 刚刚进站换了雨胎。');
    const messages = calls.length ? [{role:'engineer', text:calls.join('\n')}] : [];
    let driver = '';
    if (surface >= 65 && me.tyre === 'slick') driver = '过弯时积水明显，光头胎出弯难以给油。';
    else if (me.rr < 28) driver = '右后胎只剩 ' + Math.round(me.rr) + '%，后轴抓地力在下降。';
    else if (!calls.length) driver = surface >= 30 ? '路肩湿滑，我在沿主线行驶。' : '制动点稳定，后轴状态可控。';
    if (driver) messages.push({role:'driver', text:driver});
    return messages;
  }

  function simulate(commands = []) {
    const orders = Array.isArray(commands) ? commands.slice(0, FINISH - START) : [];
    const cars = startField();
    const me = cars.find(c => c.id === playerId);
    const history = openingHistory();
    let radioCalls = [{role:'driver', text:'右后胎越来越难受了。后面那台 #19 已经追到一秒以内，给我下一圈的指令。'}];
    let ranking = standings(cars);
    let position = 6;
    for (let i = 0; i < orders.length; i++) {
      const lap = START + i + 1;
      const [surface, label] = track[i + 1];
      const order = normalize(orders[i]);
      for (const car of cars) carLap(car, lap, car === me ? order : rivalOrder(car, lap), surface);
      ranking = standings(cars);
      const nextPosition = ranking.find(c => c.player).position;
      radioCalls = radioReport(cars, me, position, nextPosition, surface, lap === FINISH);
      position = nextPosition;
      history.push({lap, time:me.lastLap, rr:Math.round(me.rr), position,
        pace:order.pace, pit:order.pit, weather:label, tyre:me.tyre});
    }
    const lap = START + orders.length;
    const [wetness, label, forecast] = track[orders.length];
    return {lap, totalLaps:FINISH, remaining:FINISH-lap, finished:lap===FINISH,
      position, elapsed:me.total, tyre:me.tyre, rr:Math.round(me.rr), lastLap:me.lastLap,
      weather:{label, wetness, forecast}, standings:ranking, history, radioCalls,
      radio:radioCalls.map(call => (call.role === 'driver' ? '27 号车手：' : '') + call.text).join(' ')};
  }

  scope.RaceEngine = Object.freeze({simulate});
})(typeof window !== 'undefined' ? window : globalThis);
