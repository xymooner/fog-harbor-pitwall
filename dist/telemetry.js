/* Current engineering observations. Future simulation inputs are never read here. */
(function (scope) {
  'use strict';
  const corners = [['LF', '左前'], ['RF', '右前'], ['LR', '左后'], ['RR', '右后']];
  const compounds = { slick: '干胎', wet: '雨胎' };
  const isNumber = value => typeof value === 'number' && Number.isFinite(value);
  const clampPercent = value => Math.min(100, Math.max(0, isNumber(value) ? value : 0));
  const number = (value, digits = 0) => isNumber(value) ? value.toFixed(digits) : '—';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
  const pct = value => isNumber(value) ? `${Math.round(value)}%` : '—';
  const temp = value => isNumber(value) ? `${Math.round(value)}°C` : '—';

  function measurement(label, value) {
    return `<div class="eng-measure"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;
  }

  function weatherPanel(state) {
    const weather = state.weather;
    const last = state.lastSectors;
    const heading = state.finished ? '终点路况' : '赛道路况';
    const sectors = [0, 1, 2].map(index => {
      const wetness = weather.sectors?.[index];
      return `<div class="eng-sector"><span class="eng-sector-name">S${index + 1}</span><div class="eng-sector-times"><strong>${number(last?.[index], 3)}${isNumber(last?.[index]) ? '<small> s</small>' : ''}</strong><div>湿度 ${pct(wetness)}</div></div><div class="eng-meter" aria-hidden="true"><i style="width:${clampPercent(wetness)}%"></i></div></div>`;
    }).join('');
    return `<section class="eng-card eng-weather"><div class="eng-title"><h3>${heading}</h3><span class="eng-chip">${escape(weather.label)}</span></div><div class="eng-weather-row">${measurement('气温', temp(weather.airTemp))}${measurement('赛道温度', temp(weather.trackTemp))}${measurement('路面湿度', pct(weather.wetness))}${state.finished ? '' : measurement('未来 1–3 圈降雨概率', pct(weather.rainChance))}</div><div class="eng-sectors" aria-label="最近一圈各计时区段用时与当前路面湿度">${sectors}</div>${!last ? '<p class="eng-footnote">首圈通过计时线后显示分段用时。</p>' : ''}${!state.finished && weather.forecast ? `<p class="eng-forecast"><b>雷达预报</b>${escape(weather.forecast)}</p>` : ''}</section>`;
  }

  function tyrePanel(state) {
    const window = state.tyreWindow || {};
    const hasWindow = isNumber(window.low) && isNumber(window.high);
    const tyres = corners.map(([id, label]) => {
      const tyre = state.tyres[id];
      let status = '';
      let statusClass = '';
      if (hasWindow && isNumber(tyre?.temp)) {
        if (tyre.temp > window.high) { status = '偏热'; statusClass = 'hot'; }
        else if (tyre.temp < window.low) { status = '偏冷'; statusClass = 'cold'; }
        else { status = '温度正常'; statusClass = 'normal'; }
      }
      return `<div class="eng-wheel ${statusClass}"><div class="eng-wheel-id"><b>${id}</b>${label}</div><div class="eng-wheel-values"><strong>${pct(tyre?.remaining)}</strong><span>${temp(tyre?.temp)}</span></div><div class="eng-meter" aria-hidden="true"><i style="width:${clampPercent(tyre?.remaining)}%"></i></div><small>${status}</small></div>`;
    }).join('');
    return `<section class="eng-card eng-tyres"><div class="eng-title"><h3>四轮状态</h3><span class="eng-chip">${escape(compounds[state.tyre] || state.tyre)} · 已跑 ${number(state.stint)} 圈</span></div><div class="eng-wheels" aria-label="四角轮胎余量与胎温">${tyres}</div><div class="eng-wheel-key"><span>每轮显示胎面余量 / 胎温</span>${hasWindow ? `<span>工作温度 ${number(window.low)}–${number(window.high)}°C</span>` : ''}</div></section>`;
  }

  function driverPanel(state) {
    const { driver, car = {} } = state;
    return `<section class="eng-card eng-driver"><div class="eng-title"><h3>车手与赛车</h3><span class="eng-chip">#${escape(state.standings[state.position - 1].number)}</span></div><div class="eng-driver-id"><strong>${escape(driver.name)}</strong><span>${escape(driver.style)}</span></div><div class="eng-driver-bars">${[['专注度',driver.focus],['疲劳度',driver.fatigue]].map(([label, value]) => `<div><div class="eng-bar-label"><span>${label}</span><b>${pct(value)}</b></div><div class="eng-meter" aria-hidden="true"><i style="width:${clampPercent(value)}%"></i></div></div>`).join('')}</div>${driver.feedback ? `<p class="eng-feedback">${escape(driver.feedback)}</p>` : ''}<div class="eng-car"><strong>${escape(car.name || '')}</strong><span>${escape(car.layout || '')}</span>${car.trait ? `<p>${escape(car.trait)}</p>` : ''}</div></section>`;
  }

  function neighbors(state) {
    const rows = state.standings;
    const index = rows.findIndex(row => row.player);
    if (index < 0) return [];
    return [-1, 1].map(offset => {
      const ahead = offset === -1;
      const me = rows[index];
      const rival = rows[index + offset];
      if (!rival) return { ahead };
      const gap = isNumber(me.gap) && isNumber(rival.gap) ? Math.abs(rival.gap - me.gap) : null;
      const cleanLaps = state.lap > 0 && !me.pitted && !rival.pitted && isNumber(me.lastLap) && isNumber(rival.lastLap);
      const delta = cleanLaps ? rival.lastLap - me.lastLap : null;
      let comparison = '首圈结束后开始计时';
      if (state.lap > 0) comparison = me.pitted || rival.pitted ? '上圈含进站，圈速差略去' : '上圈缺少可比圈速';
      if (isNumber(delta)) comparison = Math.abs(delta) < 0.005 ? '上圈双方同速' : `上圈我方${delta > 0 ? '快' : '慢'} ${number(Math.abs(delta), 2)} s`;
      return { ahead, rival, gap, comparison };
    });
  }

  function rivalPanel(state) {
    const cards = neighbors(state).map(({ ahead, rival, gap, comparison }) => {
      const relation = ahead ? '前车' : '后车';
      if (!rival) return `<div class="eng-opponent"><div class="eng-opponent-id"><b>${relation}</b></div><p>${ahead ? '我方领跑' : '我方位列车阵末位'}</p></div>`;
      return `<div class="eng-opponent"><div class="eng-opponent-id"><b>${relation} · P${rival.position}</b><span>#${escape(rival.number)} ${escape(rival.name)}</span></div><div class="eng-gap"><span>间隔</span><strong>${isNumber(gap) ? number(gap, 2) + '<small> s</small>' : '—'}</strong><span class="eng-tyre-badge">${escape(compounds[rival.tyre] || rival.tyre)}</span></div><div class="eng-pace-diff">${escape(comparison)}</div></div>`;
    }).join('');
    return `<section class="eng-card eng-battle"><div class="eng-title"><h3>直接对手</h3></div><div class="eng-fight">${cards}</div></section>`;
  }

  function render(element, state) {
    if (!element) return;
    if (!state?.tyres || !state.driver || !state.weather || !Array.isArray(state.standings)) { element.replaceChildren(); return; }
    element.innerHTML = `<div class="eng-wrap"><div class="eng-grid">${weatherPanel(state)}${tyrePanel(state)}${driverPanel(state)}${rivalPanel(state)}</div></div>`;
  }

  function brief(state) {
    if (!state?.tyres || !state.driver || !state.weather || !Array.isArray(state.standings)) return '';
    const {weather, driver} = state;
    const lines = [
      `当前路况：${weather.label}；气温 ${temp(weather.airTemp)}，赛道 ${temp(weather.trackTemp)}，各区段湿度 ${(weather.sectors || []).map(pct).join(' / ')}。`,
      `四轮胎面余量与胎温：${corners.map(([id,label]) => `${label} ${pct(state.tyres[id]?.remaining)} / ${temp(state.tyres[id]?.temp)}`).join('，')}；${compounds[state.tyre] || state.tyre}，本套已跑 ${number(state.stint)} 圈。`,
      `车手 ${driver.name}（${driver.style}），专注 ${pct(driver.focus)}，疲劳 ${pct(driver.fatigue)}。${driver.feedback || ''}`
    ];
    if (!state.finished && weather.forecast) lines.push(`当前预报：未来 1–3 圈降雨概率 ${pct(weather.rainChance)}。${weather.forecast}`);
    if (state.lastSectors) lines.push(`上一圈三个区段 ${state.lastSectors.map(item => number(item, 3)).join(' / ')} s。`);
    if (state.car) lines.push(`赛车：${[state.car.name, state.car.layout, state.car.trait].filter(Boolean).join('，')}。`);
    neighbors(state).forEach(({ahead, rival, gap, comparison}) => {
      if (!rival) return;
      lines.push(`${ahead ? '前车' : '后车'} P${rival.position} #${rival.number} ${rival.name}，${compounds[rival.tyre] || rival.tyre}，${isNumber(gap) ? `间隔 ${number(gap, 2)} s` : '未通过计时线'}，${comparison}。`);
    });
    return lines.join('\n');
  }

  scope.Engineering = Object.freeze({ render, brief });
})(typeof window !== 'undefined' ? window : globalThis);
