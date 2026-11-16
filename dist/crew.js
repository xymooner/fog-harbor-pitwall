/* Visual identity follows the approved liveries; race data remains in HyperGrid. */
(function (scope) {
  'use strict';
  const palettes = {
    peugeot: {ink:'#263a54', accent:'#afc9df'},
    ferrari: {ink:'#722536', accent:'#e6c38a'},
    porsche: {ink:'#a1382b', accent:'#f0ac83'},
    alpine: {ink:'#244b8b', accent:'#abc5f4'},
    cadillac: {ink:'#51315f', accent:'#e1c67a'},
    bmw: {ink:'#31353d', accent:'#dcee55'},
    toyota: {ink:'#234b3e', accent:'#dce2c8'},
    corvette: {ink:'#353735', accent:'#f5d14c'},
    aston: {ink:'#35443d', accent:'#d8b6be'},
    genesis: {ink:'#3e4347', accent:'#f4a264'}
  };
  for (const palette of Object.values(palettes)) Object.freeze(palette);

  function forBrand(brand) {
    return Object.hasOwn(palettes, brand) ? palettes[brand] : null;
  }

  function decorate(element, brand) {
    if (!element) return;
    const palette = forBrand(brand);
    if (!palette) {
      delete element.dataset.crew;
      element.style.removeProperty('--crew-ink');
      element.style.removeProperty('--crew-accent');
      return;
    }
    element.dataset.crew = brand;
    element.style.setProperty('--crew-ink', palette.ink);
    element.style.setProperty('--crew-accent', palette.accent);
  }

  function render(entry) {
    decorate(document.body, entry?.mark);
    const host = document.getElementById('radioDriver');
    const title = host?.querySelector('strong');
    const source = entry && document.getElementById('driverPages')?.content
      .querySelector('article[data-brand="' + entry.mark + '"] > img');
    host?.classList.toggle('crew-radio', Boolean(source && title));
    if (!source || !title) return;

    const heading = document.createElement('div');
    heading.className = 'crew-radio-heading';
    const portrait = document.createElement('span');
    portrait.className = 'crew-portrait';
    portrait.setAttribute('aria-hidden', 'true');
    const image = source.cloneNode();
    image.alt = '';
    image.decoding = 'async';
    const number = document.createElement('b');
    number.textContent = entry.number;
    number.className = 'crew-number';
    portrait.append(image, number);
    const identity = document.createElement('div');
    identity.className = 'crew-radio-name';
    const team = document.createElement('span');
    team.textContent = entry.name;
    identity.append(title, team);
    heading.append(portrait, identity);
    host.prepend(heading);
  }

  scope.PitwallCrew = Object.freeze({forBrand, decorate, render});
})(typeof window !== 'undefined' ? window : globalThis);
