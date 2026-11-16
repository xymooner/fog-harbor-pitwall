/* The tower displays completed timing-line readings for every entry. */
(function (scope) {
  'use strict';

  const closeInterval = 1;
  const unavailable = '—';
  const tyreNames = {slick: '干胎', wet: '雨胎'};

  function time(seconds) {
    if (!Number.isFinite(seconds)) return unavailable;
    const ms = Math.round(seconds * 1000);
    return Math.floor(ms / 60000) + ':' +
      String(Math.floor(ms / 1000) % 60).padStart(2, '0') + '.' +
      String(ms % 1000).padStart(3, '0');
  }

  function seconds(value) {
    return Number.isFinite(value) ? '+' + value.toFixed(2) : unavailable;
  }

  function text(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function trend(car, ahead, frames) {
    if (!ahead || !Number.isFinite(car.interval)) return {label: unavailable, detail: ''};
    if (car.pitted || ahead.pitted) return {label: '进站圈', detail: ''};

    let span = 0;
    let baseline = car.interval;
    for (let i = frames.length - 2; i >= 0 && span < 3; i--) {
      const frame = frames[i];
      if (frame.lap !== frames[i + 1].lap - 1) break;
      const index = frame.standings.findIndex(entry => entry.id === car.id);
      if (index < 1 || frame.standings[index - 1].id !== ahead.id) break;
      const reading = frame.standings[index];
      if (reading.pitted || frame.standings[index - 1].pitted || !Number.isFinite(reading.interval)) break;
      baseline = reading.interval;
      span++;
    }
    if (!span) return {label: '待比较', detail: ''};
    const delta = Math.round((car.interval - baseline) * 100) / 100;
    const label = delta === 0 ? '持平' : delta < 0 ? '追近' : '拉开';
    return {label, detail: Math.abs(delta).toFixed(2) + ' 秒 / ' + span + ' 圈'};
  }

  function entry(car) {
    const {brand, displayModel, profile, mark} = scope.PitwallCars.forStanding(car);
    const emblem = mark ? `<span class="tw-emblem" data-tw-art="${text(mark)}"></span>` :
      profile === 'gt-warspite' ? '<span class="tw-monogram" aria-hidden="true">W</span>' : '';
    return `<span class="tw-entry">
      <span class="tw-order"><b>P${text(car.position)}</b><span class="tw-number">#${text(car.number)}</span>
        ${car.player ? '<span class="tw-own">本队</span>' : ''}</span>
      <span class="tw-profile"${profile ? ' data-tw-art="'+text(profile)+'"' : ''}></span>
      <span class="tw-identity"><span class="tw-make">${emblem}${text(brand)}</span>
        <span class="tw-model">${text(displayModel)}</span><span class="tw-name">${text(car.name)}</span></span>
    </span>`;
  }

  function row(car, index, race, frames) {
    const ahead = race.standings[index - 1];
    const change = trend(car, ahead, frames);
    const close = ahead && Number.isFinite(car.interval) && car.interval <= closeInterval &&
      !car.pitted && !ahead.pitted;
    const gap = race.lap && !ahead ? '领跑' : seconds(car.gap);
    const interval = ahead ? seconds(car.interval) : unavailable;
    return `<tr class="${car.player ? 'tw-player' : ''}">
      <th scope="row">${entry(car)}</th>
      <td><span class="tw-label" aria-hidden="true">距头车</span>${gap}</td>
      <td><span class="tw-label" aria-hidden="true">距前车</span>${interval}${close ? '<small class="tw-close">紧跟</small>' : ''}</td>
      <td class="tw-trend"><span class="tw-label" aria-hidden="true">间隔变化</span>${change.label}<small>${change.detail}</small></td>
      <td><span class="tw-label" aria-hidden="true">上一圈</span>${time(car.lastLap)}<small>${text(tyreNames[car.tyre] || car.tyre)}${car.pitted ? ' · 进站' : ''}</small></td>
    </tr>`;
  }

  function render(race, frames = [race]) {
    const tower = document.getElementById('timingTower');
    if (!tower) return;
    if (!tower.querySelector('tbody')) {
      tower.innerHTML = `<header class="tw-head"><h2>全场计时塔</h2><span class="tw-status"></span></header>
        <div class="tw-scroll" role="region" aria-label="全场逐车计时表" tabindex="0">
        <table class="tw-table"><caption class="tw-sr">全场排名、车号、品牌与车型、距头车与前车的秒差、追击趋势、上一圈用时和轮胎</caption>
          <thead><tr><th scope="col">位次 / 赛车</th><th scope="col">GAP<small>距头车 · 秒</small></th>
            <th scope="col">INT<small>距前车 · 秒</small></th><th scope="col">与前车<small>间隔变化</small></th>
            <th scope="col">上一圈<small>用时 / 轮胎</small></th></tr></thead><tbody></tbody>
        </table></div>
        <p class="tw-guide">冲线时更新。紧跟表示距前车 ≤ 1.00 秒。趋势取最近连续 1–3 圈，双方有进站或前车变更时重新累计。</p>
        <p class="tw-credit"></p>`;
    }
    tower.querySelector('.tw-status').textContent = race.finished ? '完赛 · L' + race.lap :
      race.lap ? 'L' + race.lap + ' · 冲线计时' : '发车格 · 等待首圈';
    const body = tower.querySelector('tbody');
    body.innerHTML = race.standings.map((car, index) => row(car, index, race, frames)).join('');
    const media = document.getElementById('timingMedia').content;
    for (const slot of body.querySelectorAll('[data-tw-art]')) {
      const key = slot.dataset.twArt;
      const livery = key.startsWith('hyper-') && scope.PitwallLiveries?.image(key.slice(6), 'side');
      if (livery) {
        slot.append(livery);
        continue;
      }
      const image = media.querySelector(`img[data-key="${slot.dataset.twArt}"]`);
      if (image) slot.append(image.cloneNode());
    }
    const hasLiveries = Boolean(body.querySelector('.livery-view'));
    tower.querySelector('.tw-credit').innerHTML = (hasLiveries ? 'Hypercar 使用原创涂装。其余' : '') +
      '实车侧绘来自 FIA WEC <a href="https://www.fiawec.com/en/car/2025" target="_blank" rel="noopener">2025</a>、' +
      '<a href="https://www.fiawec.com/en/car/2026" target="_blank" rel="noopener">2026</a> 车阵。';
  }

  scope.PitwallTiming = Object.freeze({render});
})(typeof window !== 'undefined' ? window : globalThis);
