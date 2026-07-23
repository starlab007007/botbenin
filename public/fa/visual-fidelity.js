(() => {
  'use strict';

  let active = null;
  const secureFloat = () => { const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0] / 0xffffffff; };
  const between = (min, max) => min + secureFloat() * (max - min);
  const integer = (min, max) => Math.floor(between(min, max + 1));
  const choose = (values) => values[integer(0, values.length - 1)];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function cleanNode(node) { if (node?.isConnected) node.remove(); }
  function cancel() {
    if (!active) return;
    active.cancelled = true;
    active.timers.forEach(clearTimeout);
    active.animations.forEach((animation) => { try { animation.cancel(); } catch {} });
    active.slots.forEach((slot) => { slot.style.removeProperty('transform'); slot.style.removeProperty('filter'); slot.style.removeProperty('z-index'); });
    active.temporary.forEach(cleanNode);
    active.root?.classList.remove('fa-flutter-throw', 'fa-motion-ready');
    active = null;
  }

  function indexedItems(root) {
    return [...root.querySelectorAll('.cowrie-slot[data-face-index]')]
      .map((slot) => ({ slot, image: slot.querySelector('.cowrie[data-face-index]'), index: Number(slot.dataset.faceIndex) }))
      .filter((item) => item.image && Number.isInteger(item.index) && item.index >= 0 && item.index < 8);
  }
  function sourceFor(face) { const assets = window.FA_ASSETS || {}; return face === 'OPEN' ? assets.cowrie_open_real : assets.cowrie_closed_real; }
  function positionToDelta(anchor, targetX, targetY) { return [targetX - anchor.x, targetY - anchor.y]; }

  function createPath(rootRect, slotRect, visualOrder, compact) {
    const anchor = { x: slotRect.left - rootRect.left + slotRect.width / 2, y: slotRect.top - rootRect.top + slotRect.height / 2 };
    const marginX = Math.max(42, slotRect.width * 0.55), marginTop = Math.max(92, slotRect.height * 0.75), marginBottom = Math.max(58, slotRect.height * 0.5);
    const minX = marginX, maxX = rootRect.width - marginX, minY = marginTop, maxY = rootRect.height - marginBottom;
    const leftSide = anchor.x < rootRect.width / 2;
    const randomTarget = () => [between(minX, maxX), between(minY, maxY)];
    const oppositeTarget = () => [leftSide ? between(rootRect.width * 0.57, maxX) : between(minX, rootRect.width * 0.43), between(minY, maxY)];
    const centerTarget = () => [between(rootRect.width * 0.38, rootRect.width * 0.62), between(rootRect.height * 0.25, rootRect.height * 0.75)];
    const targets = compact ? [centerTarget(), oppositeTarget(), randomTarget(), centerTarget()] : [randomTarget(), oppositeTarget(), centerTarget(), randomTarget()];
    if (visualOrder % 3 === 0) targets[0] = [between(minX, maxX), between(minY, rootRect.height * 0.3)];
    if (visualOrder % 3 === 1) targets[3] = [between(minX, maxX), between(rootRect.height * 0.68, maxY)];
    const points = targets.map(([x, y]) => positionToDelta(anchor, x, y));
    const direction = secureFloat() > 0.5 ? 1 : -1;
    return {
      points,
      rotations: [between(180, 320) * direction, between(340, 620) * -direction, between(480, 720) * direction, between(260, 560) * -direction],
      scales: [between(0.86, 1.08), between(0.82, 1.15), between(0.88, 1.12), between(0.9, 1.1)],
      flips: [between(0.35, 1), between(0.35, 1), between(0.4, 1), between(0.5, 1)],
      settle78: [between(-55, 55), between(-55, 55)], settle88: [between(-22, 22), between(-22, 22)], overshoot: [between(-7, 7), between(-7, 7)],
      delay: compact ? between(0, 35) : between(0, 115),
      easing: choose(['cubic-bezier(.22,.72,.28,1)', 'cubic-bezier(.18,.82,.34,1)', 'cubic-bezier(.26,.66,.22,1)']),
    };
  }

  function keyframes(path, compact) {
    const frame = (offset, xy, rotation, scale, flip, blur, shadow) => ({
      offset,
      transform: `translate3d(${xy[0].toFixed(1)}px,${xy[1].toFixed(1)}px,0) rotate(${rotation.toFixed(1)}deg) scale(${scale.toFixed(3)}) scaleX(${flip.toFixed(3)})`,
      filter: `blur(${blur}px) drop-shadow(0 ${shadow}px ${Math.round(shadow * 1.18)}px rgba(0,0,0,.42))`,
    });
    return [
      frame(0, [0, 0], 0, 1, 1, 0, 8),
      frame(0.12, path.points[0], path.rotations[0], path.scales[0], path.flips[0], compact ? 0 : 0.18, 11),
      frame(0.28, path.points[1], path.rotations[1], path.scales[1], path.flips[1], compact ? 0 : 0.42, 15),
      frame(0.46, path.points[2], path.rotations[2], path.scales[2], path.flips[2], compact ? 0 : 0.48, 17),
      frame(0.64, path.points[3], path.rotations[3], path.scales[3], path.flips[3], compact ? 0 : 0.24, 13),
      frame(0.78, path.settle78, between(-34, 34), between(0.97, 1.04), 1, 0, 10),
      frame(0.88, path.settle88, between(-14, 14), between(0.99, 1.025), 1, 0, 9),
      frame(0.95, path.overshoot, between(-6, 6), 1.008, 1, 0, 8),
      frame(1, [0, 0], 0, 1, 1, 0, 8),
    ];
  }

  function addAtmosphere(root, duration, compact) {
    const halo = document.createElement('div'); halo.className = 'fa-mystic-halo'; root.appendChild(halo); active.temporary.push(halo);
    active.animations.push(halo.animate([
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.72)' },
      { offset: 0.38, opacity: compact ? 0.18 : 0.58, transform: 'translate(-50%,-50%) scale(1.12)' },
      { offset: 0.82, opacity: 0.2, transform: 'translate(-50%,-50%) scale(.96)' },
      { opacity: 0, transform: 'translate(-50%,-50%) scale(.84)' },
    ], { duration, easing: 'ease-in-out', fill: 'both' }));
    const layer = document.createElement('div'); layer.className = 'fa-mystic-particles'; root.appendChild(layer); active.temporary.push(layer);
    const count = compact ? 8 : integer(16, 24);
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement('i'); particle.style.left = `${between(7, 93)}%`; particle.style.top = `${between(18, 92)}%`;
      const size = between(1, 3); particle.style.width = `${size}px`; particle.style.height = `${size}px`; layer.appendChild(particle);
      active.animations.push(particle.animate([
        { opacity: 0, transform: 'translate3d(0,0,0) scale(.7)' },
        { offset: 0.22, opacity: between(0.12, 0.4) },
        { offset: 0.72, opacity: between(0.08, 0.3), transform: `translate3d(${between(-38, 38)}px,${between(-90, -210)}px,0) scale(1.05)` },
        { opacity: 0, transform: `translate3d(${between(-46, 46)}px,${between(-160, -260)}px,0) scale(.4)` },
      ], { duration: between(2300, 4300), iterations: Infinity, easing: 'ease-out' }));
    }
  }

  function scheduleFaceMix(item, finalFaces, revealAt) {
    const loop = () => {
      if (!active || active.cancelled) return;
      const elapsed = performance.now() - active.startedAt;
      if (elapsed >= revealAt) { item.image.src = sourceFor(finalFaces[item.index]); return; }
      item.image.src = sourceFor(secureFloat() > 0.5 ? 'OPEN' : 'CLOSED');
      const timer = setTimeout(loop, integer(220, 360)); active.timers.push(timer);
    };
    const timer = setTimeout(loop, integer(0, 150)); active.timers.push(timer);
  }

  async function play({ duration, finalFaces }) {
    cancel();
    const root = document.querySelector('.chain-card.throwing');
    if (!root) throw new Error('Carte de lancer introuvable.');
    if (!Array.isArray(finalFaces) || finalFaces.length !== 8 || !finalFaces.every((face) => face === 'OPEN' || face === 'CLOSED')) throw new Error('Configuration finale des huit cauris invalide.');
    const items = indexedItems(root);
    if (items.length !== 8) throw new Error(`Huit cauris attendus, ${items.length} trouvés.`);
    const compact = reducedMotion(), effectiveDuration = compact ? Math.min(2300, duration) : duration, rootRect = root.getBoundingClientRect();
    active = { root, slots: items.map((item) => item.slot), animations: [], timers: [], temporary: [], cancelled: false, startedAt: performance.now() };
    root.classList.add('fa-flutter-throw');
    items.forEach((item, visualOrder) => {
      const path = createPath(rootRect, item.slot.getBoundingClientRect(), visualOrder, compact);
      const animation = item.slot.animate(keyframes(path, compact), { duration: Math.max(400, effectiveDuration - path.delay), delay: path.delay, easing: path.easing, fill: 'both' });
      active.animations.push(animation); scheduleFaceMix(item, finalFaces, effectiveDuration * 0.92);
    });
    addAtmosphere(root, effectiveDuration, compact); root.classList.add('fa-motion-ready');
    const revealTimer = setTimeout(() => { if (!active || active.cancelled) return; items.forEach((item) => { item.image.src = sourceFor(finalFaces[item.index]); }); }, Math.round(effectiveDuration * 0.92));
    active.timers.push(revealTimer);
    await sleep(effectiveDuration);
    if (!active || active.cancelled) return;
    items.forEach((item) => { item.image.src = sourceFor(finalFaces[item.index]); });
    active.animations.forEach((animation) => { try { animation.finish(); } catch {} });
    active.timers.forEach(clearTimeout); active.timers = []; active.temporary.forEach(cleanNode); active.temporary = [];
    active.root.classList.remove('fa-flutter-throw', 'fa-motion-ready'); active = null;
  }

  window.FA_FLUTTER_THROW = { play, cancel };
  window.addEventListener('pagehide', cancel);
  window.addEventListener('beforeunload', cancel);
})();