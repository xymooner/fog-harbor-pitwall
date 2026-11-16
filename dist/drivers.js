(() => {
  'use strict';

  const gallery = document.getElementById('driverGallery');
  const roster = document.getElementById('driverRoster');
  const sheet = document.getElementById('driverSheet');
  const profile = document.getElementById('driverProfile');
  const art = document.getElementById('driverArtwork');
  const entries = document.getElementById('driverPages').content.children;

  function showDriver(entry) {
    const content = entry.cloneNode(true);
    window.PitwallCrew?.decorate(content, entry.dataset.brand);
    const name = content.querySelector('h3').textContent;
    document.getElementById('driverSheetTitle').textContent = name;
    content.querySelector('h3').textContent = entry.dataset.name;
    const identity = window.PitwallLiveries?.forBrand(entry.dataset.brand);
    if (identity) {
      content.querySelector('.driver-car').textContent = identity.model + ' · #' + identity.number;
      content.querySelector('.driver-team').textContent = identity.team + ' · Hypercar';
    }

    const portrait = content.querySelector('img');
    const zoom = document.createElement('button');
    zoom.type = 'button';
    zoom.className = 'driver-zoom';
    zoom.setAttribute('aria-label', '放大' + name + '的原画');
    zoom.setAttribute('aria-haspopup', 'dialog');
    portrait.replaceWith(zoom);
    zoom.append(portrait);
    zoom.addEventListener('click', () => {
      document.getElementById('driverArtTitle').textContent = name + ' · 原画';
      document.getElementById('driverArtCanvas').replaceChildren(portrait.cloneNode());
      art.showModal();
    });

    const livery = window.PitwallLiveries?.figure(entry.dataset.brand, 'hero');
    if (livery) {
      livery.classList.add('driver-livery');
      content.append(livery);
    }

    profile.replaceChildren(content);
    sheet.showModal();
    sheet.scrollTop = 0;
  }

  function makeCard(entry) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'driver-card';
    window.PitwallCrew?.decorate(card, entry.dataset.brand);
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-controls', 'driverSheet');
    const portrait = entry.querySelector('img').cloneNode();
    portrait.alt = '';
    const pairing = document.createElement('span');
    pairing.className = 'driver-card-pair';
    pairing.textContent = entry.querySelector('.driver-pair').textContent;
    const heading = document.createElement('span');
    heading.className = 'driver-card-heading';
    const name = document.createElement('strong');
    name.className = 'driver-card-name';
    name.textContent = entry.querySelector('h3').textContent;
    const car = document.createElement('span');
    car.className = 'driver-card-car';
    const identity = window.PitwallLiveries?.forBrand(entry.dataset.brand);
    const referenceCar = entry.querySelector('.driver-car').textContent;
    const number = identity?.number || referenceCar.match(/#(\d+)/)?.[1];
    if (number) {
      const badge = document.createElement('b');
      badge.className = 'driver-card-number';
      badge.textContent = '#' + number;
      heading.append(badge);
    }
    heading.append(name);
    car.textContent = identity
      ? identity.model
      : referenceCar.replace(/\s*·\s*#\d+$/, '');
    card.append(portrait);
    const livery = window.PitwallLiveries?.image(entry.dataset.brand, 'side');
    if (livery) {
      livery.setAttribute('aria-hidden', 'true');
      card.append(livery);
    }
    card.append(heading, pairing, car);
    if (identity) {
      const team = document.createElement('span');
      team.className = 'driver-card-team';
      team.textContent = identity.team;
      card.append(team);
    }
    card.addEventListener('click', () => showDriver(entry));
    return card;
  }

  document.getElementById('openDrivers').addEventListener('click', () => {
    if (!roster.childElementCount) roster.replaceChildren(...Array.from(entries, makeCard));
    gallery.showModal();
    gallery.scrollTop = 0;
  });
})();
