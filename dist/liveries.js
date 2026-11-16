/* Shared views of the approved two-angle original livery boards. */
(function (scope) {
  'use strict';

  const entries = {
    peugeot: {number:'27', title:'破浪', model:'Peugeot 9X8', team:'Warspite Racing', split:610},
    ferrari: {number:'16', title:'子午线', model:'Ferrari 499P', team:'Meridian GT', split:640},
    porsche: {number:'6', title:'信号六号', model:'Porsche 963', team:'Porsche Penske Motorsport', split:575},
    alpine: {number:'31', title:'等高线', model:'Alpine A424', team:'Atlas Sport', split:600},
    cadillac: {number:'52', title:'紫金帆', model:'Cadillac V-Series.R', team:'Vela Racing', split:595},
    bmw: {number:'64', title:'隼翼', model:'BMW M Hybrid V8', team:'Kestrel Racing', split:595},
    toyota: {number:'83', title:'北线', model:'Toyota TR010 HYBRID', team:'Northline', split:600},
    aston: {number:'007', title:'银玫瑰', model:'Aston Martin Valkyrie', team:'Aston Martin THOR Team', split:625},
    genesis: {number:'19', title:'双熔线', model:'Genesis GMR-001', team:'Genesis Magma Racing', split:600}
  };
  for (const entry of Object.values(entries)) Object.freeze(entry);
  Object.freeze(entries);

  function forBrand(brand) {
    return Object.hasOwn(entries, brand) ? entries[brand] : null;
  }

  function image(brand, view = 'hero') {
    const entry = forBrand(brand);
    const media = document.getElementById('liveryMedia');
    if (!entry || !media) return null;
    const source = media.content.querySelector('img[data-brand="' + brand + '"]');
    if (!source) return null;
    const mode = ['hero', 'side', 'board'].includes(view) ? view : 'hero';
    const wrapper = document.createElement('span');
    wrapper.className = 'livery-view livery-' + mode;
    wrapper.dataset.brand = brand;
    wrapper.style.setProperty('--livery-hero-height', entry.split);
    wrapper.style.setProperty('--livery-side-height', 1024 - entry.split);
    const photo = source.cloneNode();
    photo.alt = '#' + entry.number + ' ' + entry.model + ' · ' + entry.title + '原创涂装';
    photo.decoding = 'async';
    wrapper.append(photo);
    return wrapper;
  }

  function enlarge(brand, trigger) {
    const entry = forBrand(brand);
    const board = image(brand, 'board');
    if (!entry || !board) return;
    const viewer = document.createElement('dialog');
    viewer.className = 'livery-lightbox';
    viewer.setAttribute('aria-label', entry.model + '原创涂装双视图');
    const head = document.createElement('div');
    head.className = 'livery-lightbox-head';
    const title = document.createElement('strong');
    title.textContent = '#' + entry.number + ' ' + entry.model + ' · ' + entry.title;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '返回';
    close.autofocus = true;
    close.addEventListener('click', () => viewer.close());
    head.append(title, close);
    viewer.append(head, board);
    viewer.addEventListener('close', () => {
      viewer.remove();
      if (trigger.isConnected) trigger.focus({preventScroll:true});
    }, {once:true});
    document.body.append(viewer);
    viewer.showModal();
  }

  function figure(brand, view = 'hero') {
    const entry = forBrand(brand);
    const picture = image(brand, view);
    if (!entry || !picture) return null;
    const result = document.createElement('figure');
    result.className = 'livery-figure';
    result.dataset.brand = brand;
    const zoom = document.createElement('button');
    zoom.type = 'button';
    zoom.className = 'livery-zoom';
    zoom.setAttribute('aria-label', '查看 #' + entry.number + ' ' + entry.model + '原创涂装双视图');
    zoom.setAttribute('aria-haspopup', 'dialog');
    zoom.append(picture);
    zoom.addEventListener('click', () => enlarge(brand, zoom));
    const caption = document.createElement('figcaption');
    caption.textContent = '原创涂装 · #' + entry.number + ' ' + entry.title;
    result.append(zoom, caption);
    return result;
  }

  scope.PitwallLiveries = Object.freeze({forBrand, image, figure});
})(typeof window !== 'undefined' ? window : globalThis);
