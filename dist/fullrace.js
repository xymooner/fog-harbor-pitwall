/* Fictional 32-lap GT3 and Hypercar simulations. No wall clock, network, or random input.
 * Input: one {pace:'balanced'|'push'|'save', pit:'none'|'slick'|'wet'} per completed lap.
 * Stops are requested before that lap. Lap times include pit loss and the cold-tyre out-lap.
 * Percentages describe tyre life, driver fatigue/focus and sector wetness. Times are seconds.
 */
(function (scope) {
  'use strict';
  const LAPS = 32;
  const REFERENCE = 100.8;
  const WHEELS = ['LF', 'RF', 'LR', 'RR'];
  const SECTOR_SHARE = [0.322, 0.358, 0.320];
  const PLAYER = 'warspite';
  const playerCar = {name:'W27 GT3', layout:'中置后驱', trait:'慢弯牵引稳定，右后胎负荷偏高'};
  const pace = {
    push:     {time:-1.03, wear:1.52, temp:12, fatigue:4.45},
    balanced: {time:0, wear:1, temp:0, fatigue:1.18},
    save:     {time:0.84, wear:0.62, temp:-5.5, fatigue:-1.20}
  };
  const windowFor = {slick:{low:76, high:92}, wet:{low:61, high:80}};
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const num = (n, places = 3) => Number(n.toFixed(places));
  const mean = values => values.reduce((s, v) => s + v, 0) / values.length;

  // Each weather station observes its own location; the shower reaches S2 first
  // and the sheltered S3 surface dries more slowly. The series is private to the race.
  const sectorSurface = [
    [0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],
    [0,0,0],[0,1,0],[0,3,0],[1,10,1],[5,19,3],[16,34,10],[32,55,24],
    [53,74,42],[71,85,63],[80,91,79],[84,90,85],[80,86,88],[74,80,86],
    [63,71,81],[52,60,73],[42,48,66],[32,37,56],[23,27,47],[16,19,38],
    [9,12,30],[5,8,22],[2,5,15],[1,2,9],[0,1,5],[0,0,3]
  ];
  // Radar is an independent pre-written observation; forecasts never consult a
  // future sector sample. A high rainfall probability does not imply all sectors are wet.
  const radar = [9,12,8,10,12,16,22,35,43,52,62,72,80,86,92,96,98,98,92,77,58,39,23,18,13,10,8,7,9,9,7,6,4];

  function weatherAt(lap) {
    const sectors = [...sectorSurface[lap]];
    const wetness = Math.round(mean(sectors));
    const past = mean(sectorSurface[Math.max(0, lap - 1)]);
    const trend = wetness > past + 2 ? 'rising' : wetness < past - 2 ? 'falling' : 'steady';
    const rainChance = radar[lap];
    let label = wetness >= 75 ? '大面积积水' : wetness >= 45 ? '湿地' : wetness >= 16 ? '路面半湿' : wetness >= 2 ? '局部潮湿' : '干地';
    let forecast;
    if (lap === LAPS) forecast = '方格旗已出，雷达停止更新。';
    else if (rainChance >= 75) forecast = '雨带覆盖赛道附近，接下来仍可能有较强降水；各区段积水深度存在差异。';
    else if (trend === 'falling') forecast = '主雨区向外移动，干线正在扩大；背阴弯道的水膜可能保留更久。';
    else if (rainChance >= 40) forecast = '雷达回波接近二号区段，局部可能先落雨；雨带到达时间尚不确定。';
    else if (rainChance >= 20) forecast = '赛道外围有零散回波，进场时间和雨量仍有不确定性。';
    else forecast = '近场回波较弱，短时出现明显降水的概率较低。';
    const airTemp = num(23.9 + 0.45 * Math.sin(lap / 4) - 0.033 * wetness, 1);
    const trackTemp = num(airTemp + 6.3 - 0.053 * wetness + 0.7 * Math.sin((lap + 1) / 4), 1);
    return {label, wetness, trend, forecast, airTemp, trackTemp, sectors, rainChance};
  }

  // Vehicle and driver coefficients are fictional and are used for every car with
  // the same equations. Wet skill, tyre care and aggression affect grip, wear and effort.
  const grid = [
    {id:'arco', number:'08', name:'Arco Corse', driver:'E. Rossi', style:'前轴进攻', speed:-0.36, wetSkill:0.60, care:0.99, load:1.00, effort:1.03, plan:[14,26]},
    {id:'meridian', number:'16', name:'Meridian GT', driver:'F. Keller', style:'雨战稳健', speed:-0.21, wetSkill:0.90, care:1.01, load:1.04, effort:0.92, plan:[15,26]},
    {id:'kessel', number:'64', name:'Kestrel Racing', driver:'M. Vale', style:'偏早换胎', speed:-0.08, wetSkill:0.61, care:1.00, load:1.04, effort:1.02, plan:[13,25]},
    {id:'atlas', number:'31', name:'Atlas Sport', driver:'R. Laurent', style:'延长首段', speed:-0.08, wetSkill:0.70, care:0.92, load:1.02, effort:0.94, plan:[16,27]},
    {id:'vela', number:'52', name:'Vela Racing', driver:'J. Cao', style:'激进进攻', speed:0.03, wetSkill:0.53, care:1.04, load:1.03, effort:1.04, plan:[15,25]},
    {id:PLAYER, number:'27', name:'Warspite Racing', driver:'林澄', style:'顺滑控胎', speed:-0.09, wetSkill:0.70, care:0.90, load:1.13, effort:0.96, s2WetTraction:0.39, plan:[]},
    {id:'vector', number:'19', name:'Vector GT', driver:'L. Novak', style:'短段冲刺', speed:0.02, wetSkill:0.66, care:1.04, load:1.06, effort:1.06, plan:[14,26]},
    {id:'north', number:'83', name:'Northline', driver:'S. Mori', style:'耐力节奏', speed:0.16, wetSkill:0.57, care:0.94, load:1.02, effort:0.91, plan:[17,28]}
  ];

  function newSet(compound, gridStart = false) {
    const temp = gridStart ? 68 : compound === 'slick' ? 56 : 48;
    return WHEELS.map(() => ({remaining:100, temp}));
  }

  function readTyres(car) {
    return Object.fromEntries(WHEELS.map((label, i) => [label, {
      remaining:num(car.wheels[i].remaining, 1), temp:num(car.wheels[i].temp, 1)
    }]));
  }

  function newField(entries, playerId) {
    return entries.map((spec, index) => ({spec, index, player:spec.id === playerId, total:0, lastLap:null, tyre:'slick',
      wheels:newSet('slick', true), fatigue:8, focus:93, feedback:'无线电清晰，已就位。',
      stint:0, stops:0, pitted:false, pushRun:0, effects:null, sectors:null}));
  }

  function execution(input) {
    return {
      pace:Object.hasOwn(pace, input?.pace) ? input.pace : 'balanced',
      pit:input?.pit === 'wet' || input?.pit === 'slick' ? input.pit : 'none'
    };
  }

  function rivalCall(car, lap) {
    const [wetLap, slickLap] = car.spec.plan;
    const pit = lap === wetLap ? 'wet' : lap === slickLap ? 'slick' : 'none';
    let effort = 'balanced';
    if ((lap + car.index * 2) % 6 < 2 || lap === LAPS || lap === slickLap - 1) effort = 'push';
    if (car.fatigue > 66 || ((lap + car.index) % 11 === 0 && lap < LAPS)) effort = 'save';
    return {pace:effort, pit};
  }

  function driverReading(car) {
    return {name:car.spec.driver, style:car.spec.style, fatigue:Math.round(car.fatigue),
      focus:Math.round(car.focus), feedback:car.feedback};
  }

  function driverState(car, action, weather, mismatch) {
    const profile = pace[action.pace];
    car.pushRun = action.pace === 'push' ? car.pushRun + 1 : 0;
    const workload = weather.wetness / 100 * (0.42 + mismatch * 0.8);
    car.fatigue = clamp(car.fatigue + profile.fatigue * car.spec.effort + workload - (car.pitted ? 0.45 : 0), 0, 100);
    const target = 97 - 0.19 * car.fatigue - 9 * mismatch - Math.max(0, car.pushRun - 2) * 0.95 + (action.pace === 'save' ? 3 : 0);
    car.focus = clamp(car.focus * 0.62 + target * 0.38, 40, 100);
    return Math.max(0, car.fatigue - 42) * 0.039 + (94 - car.focus) * 0.030;
  }

  function tyreState(car, profile, weather) {
    const wet = weather.wetness / 100;
    const slick = car.tyre === 'slick';
    const target = slick ? 85 + (weather.trackTemp - 27) * 0.35 - 26 * wet
                         : 73 + (weather.trackTemp - 25) * 0.35 + 15 * (1 - wet) - 3 * wet;
    const load = [0.99, 1.065, 0.96, car.spec.load];
    const heatOffset = [-0.5, 2.1, -0.8, 1.3 + (car.spec.load - 1) * 20];
    const range = windowFor[car.tyre];
    let heatCost = 0;
    const midLife = [];
    for (let i = 0; i < WHEELS.length; i++) {
      const wheel = car.wheels[i];
      const previousTemp = wheel.temp;
      wheel.temp += (target + profile.temp * (slick ? 1 : 0.81) + heatOffset[i] - wheel.temp) * 0.47;
      const workingTemp = (previousTemp + wheel.temp) / 2;
      const cold = Math.max(0, range.low - workingTemp);
      const hot = Math.max(0, workingTemp - range.high);
      heatCost += (cold * 0.039 + hot * 0.068) / 4;
      const wear = (slick ? 2.61 - 0.55 * wet : 2.31 + 4.95 * (1 - wet) ** 2)
        * profile.wear * car.spec.care * load[i] * (1 + hot * 0.019);
      const oldLife = wheel.remaining;
      wheel.remaining = Math.max(0, oldLife - wear);
      midLife.push((oldLife + wheel.remaining) / 2);
    }
    const degradation = (100 - mean(midLife)) * 0.016 + Math.max(0, 39 - Math.min(...midLife)) ** 1.32 * 0.074;
    return heatCost + degradation;
  }

  function trafficLoss(car, ranking, lap) {
    if (lap === 1) return 1.02 + car.index * 0.38;
    if (car.pitted) return 0;
    const index = ranking.findIndex(c => c.id === car.spec.id);
    const gap = ranking[index].interval;
    if (!index || gap > 1.6) return 0;
    return (1.6 - gap) * (0.21 + 0.06 * (1 + Math.sin(lap * 0.64 + car.index)));
  }

  function relay(car, action, weather) {
    const hottest = Math.max(...car.wheels.map(w => w.temp));
    const lowest = Math.min(...car.wheels.map(w => w.remaining));
    if (car.pitted) return '换好胎了。这一圈我把轮胎带进工作温度。';
    if (car.fatigue > 76 && action.pace === 'push') return '可以继续推，但我开始错过刹车点，连续进攻的收益在掉。';
    if (lowest < 27) return '轮胎快到末段了，重刹和出弯都不能像刚才那样用。';
    if (weather.sectors[1] > 57 && car.tyre === 'slick') return '二号区段积水，光头胎打滑。我得等车身摆正再给油。';
    if (hottest > windowFor[car.tyre].high + 2) return '胎温偏高，弯中开始推头；下一圈我可以少给一点滑移。';
    if (action.pace === 'save') return '收到，我把刹车点提前了一点，出弯也会轻一点。';
    if (action.pace === 'push') return '收到，正在进攻。我会注意后轴温度。';
    if (weather.trend === 'falling' && car.tyre === 'wet') return '干线正在出现。雨胎在干线外抓地还行，但旁边的沥青已经亮出来了。';
    return weather.wetness > 25 ? '当前节奏能维持，过湿路肩时后轮有一点滑移。' : '节奏稳定。方向盘手感正常，可以继续这个配速。';
  }

  function drive(car, action, lap, weather, ranking, referenceTime) {
    car.pitted = action.pit !== 'none';
    if (car.pitted) {
      car.tyre = action.pit;
      car.wheels = newSet(action.pit);
      car.stops += 1;
      car.stint = 0;
    }
    car.stint += 1;
    const slick = car.tyre === 'slick';
    const wet = weather.wetness / 100;
    const mismatch = slick ? wet : (1 - wet) * 0.64;
    const sectorWeather = weather.sectors.map((level, i) => {
      const w = level / 100;
      const cost = slick ? 15.1 * w ** 1.5 : 1.35 + 4.5 * w + 5.7 * (1 - w) ** 2.4;
      // S2's slow exits give the rear-loaded W27 a modest traction advantage.
      const traction = i === 1 ? -(car.spec.s2WetTraction || 0) * w : 0;
      return (cost + traction) * SECTOR_SHARE[i];
    });
    const driverCost = driverState(car, action, weather, mismatch);
    const chargingOnSlicks = action.pace === 'push' && slick ? 1.4 * wet ** 1.5 : 0;
    const variance = Math.sin(lap * 1.31 + car.index * 1.95) * 0.15;
    const effects = {
      pace:pace[action.pace].time + chargingOnSlicks,
      weather:sectorWeather.reduce((a,b) => a+b,0),
      tyres:tyreState(car, pace[action.pace], weather),
      driver:car.spec.speed + driverCost + (0.7 - car.spec.wetSkill) * 1.3 * wet + variance,
      traffic:trafficLoss(car, ranking, lap), pit:car.pitted ? 22 : 0
    };
    car.effects = Object.fromEntries(Object.entries(effects).map(([label, value]) => [label, num(value)]));
    car.lastLap = num(referenceTime + Object.values(car.effects).reduce((a,b) => a+b, 0));
    const otherTime = car.lastLap - effects.weather - effects.pit;
    const s1 = num(otherTime * SECTOR_SHARE[0] + sectorWeather[0] + effects.pit);
    const s2 = num(otherTime * SECTOR_SHARE[1] + sectorWeather[1]);
    car.sectors = [s1, s2, num(car.lastLap - s1 - s2)];
    car.total = num(car.total + car.lastLap);
    car.feedback = relay(car, action, weather);
  }

  function standings(cars, lap) {
    const sorted = [...cars].sort((a,b) => a.total - b.total || a.index - b.index);
    return sorted.map((car, i) => ({
      id:car.spec.id, name:car.spec.name, number:car.spec.number, driver:car.spec.driver, style:car.spec.style,
      ...(car.spec.model ? {model:car.spec.model} : {}),
      position:i + 1, player:car.player, lastLap:car.lastLap, tyre:car.tyre, pitted:car.pitted,
      gap:lap ? num(car.total - sorted[0].total) : null,
      interval:lap ? (i ? num(car.total - sorted[i-1].total) : 0) : null
    }));
  }

  function engineerRadio(me, ranking, previous, lap) {
    const now = ranking.find(c => c.player).position;
    const stops = ranking.filter(c => !c.player && c.pitted).map(c => '#' + c.number);
    const messages = [];
    if (lap === LAPS) messages.push('方格旗，P' + now + ' 完赛！');
    if (now !== previous) messages.push('本圈' + (now < previous ? '上升 ' : '下降 ') + Math.abs(now - previous) + ' 位。');
    if (stops.length) messages.push(stops.join('、') + ' 本圈进站。');
    const calls = [];
    if (messages.length) calls.push({role:'engineer', text:messages.join('\n')});
    calls.push({role:'driver', text:me.feedback});
    return calls;
  }

  // Only observations available at this crossing are passed to a crew's radio cue.
  const crewCues = {
    dryPush: s => s.pace === 'push' && s.slick && s.wetness < 2 && s.leastLife > 60 && s.fatigue < 45 && s.inWindow,
    pushFatigue: s => s.pushRun >= 3 && s.fatigue > 42,
    wetRun: s => !s.slick && s.sectors.every(level => level >= 40) && s.inWindow && s.leastLife > 50 && s.fatigue < 55,
    dryingWet: s => !s.slick && s.trend === 'falling' && s.sectors[0] <= 32 && s.sectors[2] - s.sectors[0] >= 14,
    dryStint: s => s.slick && s.wetness < 2 && s.stint >= 4 && s.pace === 'balanced' && s.rr > s.rf && s.leastLife > 60,
    s2Ahead: s => s.slick && s.sectors[1] >= 30 && s.sectors[0] < 20,
    longStint: s => s.stint >= 10 && s.slick && s.wetness < 2 && s.leastLife > 60 && s.pace !== 'push',
    closeAhead: s => s.ahead !== null && s.ahead <= 1.6,
    hotRightRear: s => s.rrHot,
    rrWorn: s => s.rr < 45 && s.rr < s.rf,
    closeBehind: s => s.behind !== null && s.behind < 1,
    usedSet: s => s.leastLife < 50,
    gapAhead: s => s.ahead !== null && s.ahead > 3,
    lateReserve: s => s.lap >= 24 && s.fatigue < 50 && s.leastLife > 50 && s.slick && s.wetness < 16 && s.inWindow
  };

  function crewRadio(car, row, ranking, spoken) {
    if (!car.spec.radioLines || car.pitted || row.lap === LAPS) return;
    const current = ranking[row.position - 1];
    const wheels = Object.values(row.tyres);
    const range = windowFor[row.tyre];
    const observation = {
      lap:row.lap, pace:row.pace, slick:row.tyre === 'slick', stint:car.stint, pushRun:car.pushRun,
      fatigue:row.driver.fatigue, wetness:row.weatherData.wetness, trend:row.weatherData.trend, sectors:row.weatherData.sectors,
      ahead:row.position > 1 ? current.interval : null, behind:ranking[row.position]?.interval ?? null,
      rr:row.tyres.RR.remaining, rf:row.tyres.RF.remaining, rrHot:row.tyres.RR.temp > range.high,
      leastLife:Math.min(...wheels.map(wheel => wheel.remaining)),
      inWindow:wheels.every(wheel => wheel.temp >= range.low && wheel.temp <= range.high)
    };
    const line = car.spec.radioLines.find(line => !spoken.has(line.trigger) && crewCues[line.trigger](observation));
    if (line) spoken.add(line.trigger);
    return line;
  }

  function runRace(commands, entries, playerId, carSpec, referenceTime) {
    const orders = Array.isArray(commands) ? commands.slice(0, LAPS) : [];
    const field = newField(entries, playerId);
    const me = field.find(c => c.player);
    const history = [];
    const spoken = new Set();
    let ranking = standings(field, 0);
    let position = me.index + 1;
    let weather = weatherAt(0);
    const startReport = me.spec.model ? '编队圈结束' : '胎毯已撤';
    let radioCalls = [{role:'driver', text:'无线电清晰。P' + position + ' 发车，' + startReport + '，等你下发首圈节奏。'}];
    for (let i = 0; i < orders.length; i++) {
      const lap = i + 1;
      const action = execution(orders[i]);
      weather = weatherAt(lap);
      for (const car of field) {
        const call = car === me ? action : rivalCall(car, lap);
        drive(car, call, lap, weather, ranking, referenceTime);
      }
      ranking = standings(field, lap);
      const previousPosition = position;
      position = ranking.find(c => c.player).position;
      const row = {lap, time:me.lastLap, rr:Math.round(me.wheels[3].remaining), position,
        pace:action.pace, pit:action.pit, tyre:me.tyre, weather:weather.label, weatherData:weather,
        tyres:readTyres(me), driver:driverReading(me), effects:me.effects, sectors:me.sectors};
      const line = crewRadio(me, row, ranking, spoken);
      if (line?.speaker === 'driver') {
        me.feedback = line.text;
        row.driver.feedback = line.text;
      }
      radioCalls = engineerRadio(me, ranking, previousPosition, lap);
      if (line?.speaker === 'engineer') radioCalls.push({role:'engineer', text:line.text});
      history.push(row);
    }
    const lap = orders.length;
    const radio = radioCalls.map(call => (call.role === 'driver' ? me.spec.driver + '：' : '') + call.text).join(' ');
    return {
      lap, totalLaps:LAPS, remaining:LAPS - lap, finished:lap === LAPS, position, elapsed:me.total,
      lastLap:me.lastLap, tyre:me.tyre, rr:Math.round(me.wheels[3].remaining), radio, radioCalls, standings:ranking, history,
      tyres:readTyres(me), weather, driver:driverReading(me), car:{...carSpec}, stint:me.stint, pitStops:me.stops,
      referenceTime, lastSectors:me.sectors, effects:me.effects, tyreWindow:{...windowFor[me.tyre]}
    };
  }

  function simulate(commands = []) {
    return runRace(commands, grid, PLAYER, playerCar, REFERENCE);
  }

  function simulateHypercar(commands = [], teamId) {
    const entries = scope.HyperGrid.entries;
    const selected = entries.find(entry => entry.id === teamId) || entries[0];
    // Keep opponents in catalogue order and give each choice the same starting slot.
    const startingGrid = entries.filter(entry => entry.id !== selected.id);
    startingGrid.splice(5, 0, selected);
    const car = {name:selected.model, layout:selected.layout, trait:selected.trait};
    return runRace(commands, startingGrid, selected.id, car, 90.0);
  }

  scope.FullRace = Object.freeze({simulate});
  scope.HyperRace = Object.freeze({simulate:simulateHypercar});
})(typeof window !== 'undefined' ? window : globalThis);
