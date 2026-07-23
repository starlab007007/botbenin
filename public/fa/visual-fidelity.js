(() => {
  'use strict';

  let timer = null;
  let lastThrowingRoot = null;

  function secureBit() {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] & 1;
  }

  function randomizeConcealedFaces(root) {
    const assets = window.FA_ASSETS || {};
    const open = assets.cowrie_open_real;
    const closed = assets.cowrie_closed_real;
    if (!open || !closed) return;

    root.querySelectorAll('.cowrie').forEach((image, index) => {
      image.src = secureBit() ? open : closed;
      const direction = index % 2 === 0 ? 1 : -1;
      const angle = (secureBit() ? 22 : -22) * direction;
      image.style.transform = `rotate(${angle}deg) scaleX(${secureBit() ? 1 : 0.42})`;
    });
  }

  function stopMixing() {
    if (timer) clearInterval(timer);
    timer = null;
    lastThrowingRoot = null;
  }

  function synchronize() {
    const root = document.querySelector('.chain-card.throwing');
    if (!root) {
      stopMixing();
      return;
    }

    if (root === lastThrowingRoot && timer) return;
    stopMixing();
    lastThrowingRoot = root;
    randomizeConcealedFaces(root);
    timer = setInterval(() => {
      const current = document.querySelector('.chain-card.throwing');
      if (!current) return stopMixing();
      randomizeConcealedFaces(current);
    }, 190);
  }

  const observer = new MutationObserver(synchronize);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', stopMixing);
  synchronize();
})();
