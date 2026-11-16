/* Choosing a team to inspect never changes an ongoing race. */
(function (scope) {
  'use strict';

  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };

  function originalFigure(id) {
    return document.getElementById('hyperMedia')?.content.querySelector('figure[data-team="' + CSS.escape(id) + '"]');
  }

  function enlarge(entry, photo, caption) {
    const viewer = node('dialog', 'garage-lightbox');
    viewer.setAttribute('aria-label', entry.model + ' 实车照片');
    const head = node('div', 'gl-head');
    const close = node('button', '', '返回');
    close.type = 'button';
    close.autofocus = true;
    close.addEventListener('click', () => viewer.close());
    head.append(node('strong', '', entry.model), close);
    viewer.append(head, photo.cloneNode());
    if (caption) {
      const credit = node('figure', 'gl-credit');
      credit.append(caption.cloneNode(true));
      viewer.append(credit);
    }
    viewer.addEventListener('close', () => viewer.remove(), {once:true});
    document.body.append(viewer);
    viewer.showModal();
  }

  function photoFigure(id) {
    const source = originalFigure(id);
    const entry = scope.HyperGrid.entries.find(team => team.id === id);
    if (!source || !entry) return node('figure', 'garage-photo-missing');
    const result = source.cloneNode(true);
    result.classList.add('garage-photo');
    const photo = result.querySelector('img');
    if (photo) {
      const button = node('button', 'garage-zoom');
      button.type = 'button';
      button.setAttribute('aria-label', '放大 ' + entry.model + ' 实车照片');
      button.addEventListener('click', () => enlarge(entry, photo, result.querySelector('figcaption')));
      photo.replaceWith(button);
      button.append(photo);
    }
    return result;
  }

  function figure(id) {
    const entry = scope.HyperGrid.entries.find(team => team.id === id);
    return scope.PitwallLiveries?.figure(entry?.mark) || photoFigure(id);
  }

  function rosterButton(entry, progress, preview) {
    const button = node('button', 'garage-entry');
    button.type = 'button';
    button.dataset.team = entry.id;
    button.setAttribute('aria-controls', 'garageDetail');
    const photo = scope.PitwallLiveries?.image(entry.mark, 'side') ||
      originalFigure(entry.id)?.querySelector('img')?.cloneNode();
    if (photo) {
      photo.setAttribute('aria-hidden', 'true');
      button.append(photo);
    }
    const info = node('span', 'garage-entry-text');
    info.append(node('small', '', '#' + entry.number + ' · ' + entry.name), node('b', '', entry.model));
    if (progress) info.append(node('small', 'garage-progress', progress === 32 ? '已完赛' : '已跑 ' + progress + ' 圈'));
    button.append(info);
    button.addEventListener('click', () => preview(entry));
    return button;
  }

  function detail(entry, laps, dialog) {
    const panel = document.getElementById('garageDetail');
    const heading = node('div', 'garage-detail-head');
    const identity = node('div');
    identity.append(node('p', 'garage-team', '#' + entry.number + '　' + entry.name), node('h3', '', entry.model));
    const driverCard = document.getElementById('driverPages').content.querySelector('[data-brand="' + CSS.escape(entry.mark) + '"]');
    const portrait = driverCard?.querySelector('img').cloneNode();
    const crewIdentity = node('div', 'garage-identity');
    if (portrait) {
      portrait.alt = '';
      crewIdentity.append(portrait);
    }
    const pairing = driverCard?.querySelector('.driver-pair').textContent;
    identity.append(node('p', 'garage-driver-name', pairing ? entry.driver + ' · ' + pairing : entry.driver));
    crewIdentity.append(identity);
    const action = node('button', 'garage-confirm', laps === 32 ? '查看赛后复盘' : laps ? '继续第 ' + (laps + 1) + ' 圈' : '指挥这支车队');
    action.type = 'button';
    action.addEventListener('click', () => {
      dialog.close();
      dialog.dispatchEvent(new CustomEvent('pickteam', {detail:{id:entry.id}}));
    });
    heading.append(crewIdentity, action);

    const specs = node('section', 'garage-spec');
    const specHead = node('div', 'garage-subhead');
    const source = node('a', '', '车型来源 ↗');
    source.href = entry.specSource || entry.source;
    source.target = '_blank';
    source.rel = 'noopener';
    const references = node('span', 'garage-references');
    const sideView = node('a', '', '官方侧绘 ↗');
    const guidePage = entry.id === 'warspite' ? 2 : 1;
    sideView.href = entry.sideView || 'https://assets.lemans.org/explorer/pdf/courses/2026/24-heures-du-mans/spotter-le-mans-2026.pdf#page=' + guidePage;
    sideView.target = '_blank';
    sideView.rel = 'noopener';
    references.append(sideView, source);
    specHead.append(node('h4', '', '实车规格'), references);
    const facts = node('dl');
    for (const [label, value] of [['技术规则', entry.category], ['发动机', entry.engine], ['驱动布局', entry.layout]]) {
      facts.append(node('dt', '', label), node('dd', '', value));
    }
    specs.append(specHead, facts);

    const game = node('section', 'garage-crew');
    game.append(node('h4', '', '邀请赛车组 · 游戏设定'));
    const crew = node('dl');
    for (const [label, value] of [['驾驶风格', entry.style], ['优势', entry.strength], ['弱点', entry.weakness]]) {
      crew.append(node('dt', '', label), node('dd', '', value));
    }
    game.append(crew);
    const stories = node('details', 'garage-stories');
    stories.append(node('summary', '', '车队故事 · 雾港原创'));
    for (const [title, copy] of [['车队来历', entry.story], ['围场手记', entry.paddock]]) {
      stories.append(node('h4', '', title), node('p', '', copy));
    }
    panel.replaceChildren(heading, figure(entry.id), game, stories, specs);
    if (scope.PitwallLiveries?.forBrand(entry.mark)) {
      const reference = node('details', 'garage-reference-photo');
      reference.append(node('summary', '', '实车参考照片'), photoFigure(entry.id));
      panel.append(reference);
    }
    panel.scrollTop = 0;
  }

  function open(currentTeamId, sessions = {}) {
    const dialog = document.getElementById('teamGarage');
    const roster = document.getElementById('garageRoster');
    const entries = scope.HyperGrid.entries;
    const selected = entries.find(team => team.id === currentTeamId) || entries.find(team => team.id === 'warspite') || entries[0];
    const savedLaps = id => sessions[id]?.orders?.length || 0;
    function preview(entry) {
      for (const b of roster.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.team === entry.id));
      detail(entry, savedLaps(entry.id), dialog);
    }
    roster.setAttribute('aria-label', '浏览参赛车组');
    roster.replaceChildren(...entries.map(entry => rosterButton(entry, savedLaps(entry.id), preview)));
    preview(selected);
    if (!dialog.open) dialog.showModal();
    const active = roster.querySelector('[aria-pressed="true"]');
    active.focus({preventScroll:true});
    active.scrollIntoView({block:'nearest', inline:'nearest'});
  }

  scope.PitwallGarage = Object.freeze({open, figure});
})(typeof window !== 'undefined' ? window : globalThis);
