/* Offline pit-wall advice. Read only completed observations a player can inspect. */
(function (scope) {
  'use strict';

  const paceLabels = {balanced:'均衡', push:'追击', save:'保胎'};
  const pitLabels = {none:'留场', wet:'进站换雨胎', slick:'进站换干胎'};
  const wheelLabels = {LF:'左前胎', RF:'右前胎', LR:'左后胎', RR:'右后胎'};

  function call(pace, pit, reason, risk, priority = 'routine') {
    return {action:pitLabels[pit] + '，' + paceLabels[pace] + '配速', reason, risk, priority, pace, pit};
  }

  function recommend(state, frames, mode) {
    if (state.finished) return {
      action:'查看赛后复盘', reason:'方格旗已出，本场 P' + state.position + ' 完赛。',
      risk:'重试时可只改一条指令，比较两次完赛用时。', priority:'routine'
    };

    const {weather, remaining, tyre, history} = state;
    const full = mode === 'full' || Boolean(state.tyres);
    const last = history.at(-1);
    const previousWeather = history.at(-2)?.weatherData;
    const drying = full && previousWeather && weather.wetness < previousWeather.wetness;
    const rising = full && previousWeather && weather.wetness > previousWeather.wetness;
    const wheels = Object.entries(state.tyres || {});
    const weakest = wheels.sort((a, b) => a[1].remaining - b[1].remaining)[0];
    const wheelName = weakest ? wheelLabels[weakest[0]] : '右后胎';
    const life = weakest ? Math.round(weakest[1].remaining) : state.rr;
    const wheelReading = wheelName + '余量 ' + life + '%';
    const wetSectors = weather.sectors || [];
    const substantialRain = full ? weather.wetness >= 60 : ['路面转湿','中雨','大面积积水','中雨减弱','湿地'].includes(weather.label);
    const rainBuilding = full
      ? rising && weather.wetness >= 30 && Math.max(...wetSectors) >= 45 && weather.rainChance >= 65
      : weather.label === '零星小雨' && life <= 40 && weather.forecast.includes('积水增加');
    const dryingWindow = full && drying && weather.rainChance <= 30 &&
      wetSectors.filter(wetness => wetness <= 50).length >= 2;
    const dryNow = full ? weather.wetness <= 12 && weather.rainChance <= 35 : weather.label === '干地';
    const wetNow = substantialRain || rainBuilding;
    const fatigue = state.driver?.fatigue || 0;
    const changingTyre = tyre === 'slick' ? wetNow : dryNow || dryingWindow;

    if (changingTyre && remaining >= 3) {
      if (tyre === 'slick') {
        const reason = full
          ? '最湿区段已到 ' + Math.max(...wetSectors) + '%，' + (rising ? '积水还在增加。' : '干胎出弯抓地受限。')
          : '刚报' + weather.label + '，' + (rainBuilding ? '预报积水会增加，' + wheelReading + '。' : '干胎出弯抓地受限。');
        return call('balanced', 'wet', reason, '进站约损失 22 秒；若雨势很快减弱，可能收不回这次停站时间。', 'key');
      }
      const reason = dryingWindow
        ? '至少两个区段的湿度已降至 50% 以内，短时降雨概率为 ' + weather.rainChance + '%。'
        : '路况已适合干胎，雨胎在干线上升温、磨耗更快。';
      return call('balanced', 'slick', reason, '进站约损失 22 秒，出站圈要给冷胎留余量。', 'key');
    }

    // A late extra stop can cost more than nursing the current tyre to the flag.
    if (changingTyre) return call('balanced', 'none',
      '还剩 ' + remaining + ' 圈，换胎约损失 22 秒，回收时间有限。',
      tyre === 'slick' ? '积水处干胎抓地弱，下圈要再看雨量。' : '干线会消耗雨胎，留意下一圈的胎面余量。', 'key');

    const rainApproaching = full ? rising && weather.rainChance >= 55 : /落雨|雨点|雨带/.test(weather.forecast);
    if (life <= 20 && remaining >= 4 && !(tyre === 'slick' && rainApproaching)) {
      return call('balanced', tyre, wheelReading + '，还有 ' + remaining + ' 圈，继续跑会损失圈速。',
        '这次进站约损失 22 秒，留意出站时可能遇到的车流。', 'key');
    }
    if (fatigue >= 75 || life <= 30 && remaining > 2) {
      return call('save', 'none', fatigue >= 75
        ? '车手疲劳度达到 ' + fatigue + '%，先让他缓一圈再评估。'
        : wheelReading + '，先减少滑移，给下一次进站留出选择。',
      '这一圈可能被后车拉近。', last?.pace === 'save' ? 'routine' : 'key');
    }

    const me = state.standings[state.position - 1];
    const behind = state.standings[state.position];
    const aheadGap = state.position > 1 ? me.interval : null;
    const behindGap = behind?.interval;
    const inReach = Number.isFinite(aheadGap) && aheadGap <= remaining * 2;
    const underPressure = Number.isFinite(behindGap) && behindGap <= 2;
    if (remaining <= 3 && life >= 30 && fatigue < 70 && (inReach || underPressure)) {
      const target = inReach ? '前车只领先 ' + aheadGap.toFixed(2) + ' 秒' : '后车只落后 ' + behindGap.toFixed(2) + ' 秒';
      return call('push', 'none', target + '，还剩 ' + remaining + ' 圈，' + wheelReading + '。',
        '追击会增加磨耗，若车距拉开可以回到均衡。', last?.pace === 'push' ? 'routine' : 'key');
    }
    if (tyre === 'slick' && rainApproaching) return call('balanced', 'none',
      '雷达提示降雨接近，眼下干胎仍可用，下一圈再看路况。',
      '若雨带提前抵达，干胎会先在积水区丢时间。');
    if (!state.lap) return call('balanced', 'none',
      '从 P' + state.position + ' 起步，先跑出首圈，拿到前后车的实测差距。', '起步车流密，第一圈用时包含交通损失。');
    return call('balanced', 'none', wheelReading + '，还剩 ' + remaining + ' 圈，先保持节奏。',
      tyre === 'wet' ? '若干线扩大，雨胎会加速磨耗。' : '继续观察后车间隔和下一次路况报告。');
  }

  scope.PitwallAdvisor = Object.freeze({recommend});
})(typeof window !== 'undefined' ? window : globalThis);
