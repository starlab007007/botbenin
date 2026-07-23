(() => {
  'use strict';

  const PHASE_RATIOS = new Map([
    ['La chaîne s’éveille', 0.08],
    ['Les cauris se mêlent', 0.23],
    ['Les huit cauris se mêlent', 0.23],
    ['Le mouvement s’intensifie', 0.43],
    ['Les faces restent cachées', 0.66],
    ['La chaîne se stabilise', 0.84],
    ['Le signe se révèle', 0.94],
  ]);

  let run = null;
  let observer = null;

  const secureFloat = () => {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 0xffffffff;
  };

  const between = (min, max) => min + secureFloat() * (max - min);
  const integer = (min, max) => Math.floor(between(min, max + 1));
  const choose = (values) => values[integer(0, values.length - 1)];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function phaseText(root) {
    return root.querySelector('.phase')?.textContent?.trim() || '';
  }

  function captureFinalSources(root) {
    return [...root.querySelectorAll('.cowrie')].map((image) => image.currentSrc || image.src);
  }

  function createParticleSpecs(count) {
    return Array.from({ length: count }, (_, index) => ({
      left: between(7, 93),
      top: between(16, 92),
      size: between(1, 3.1),
      opacity: between(0.14, 0.48),
      driftX: between(-42, 42),
      rise: between(80, 230),
      duration: between(2100, 4300),
      offset: between(0, 3800),
      phase: index % 2 ? 1 : -1,
    }));
  }

  function createRun(root) {
    const rect = root.getBoundingClientRect();
    const slots = [...root.querySelectorAll('.cowrie-slot')];
    const stageCenterX = rect.width / 2;
    const stageCenterY = rect.height / 2;
    const compact = reducedMotion();

    const paths = slots.map((slot, index) => {
      const slotRect = slot.getBoundingClientRect();
      const anchorX = slotRect.left - rect.left + slotRect.width / 2;
      const anchorY = slotRect.top - rect.top + slotRect.height / 2;
      const towardCenterX = stageCenterX - anchorX;
      const towardCenterY = stageCenterY - anchorY;
      const side = anchorX < stageCenterX ? 1 : -1;
      const maxHorizontal = Math.max(90, rect.width * 0.46);
      const maxVertical = Math.max(140, rect.height * 0.43);
      const rotationDirection = secureFloat() > 0.5 ? 1 : -1;
      const crossBoost = between(38, 118) * side;

      const points = compact
        ? [
            [towardCenterX * 0.38, towardCenterY * 0.16 - between(20, 54)],
            [towardCenterX * 0.58 + crossBoost * 0.35, towardCenterY * 0.2 + between(-45, 45)],
            [between(-38, 38), between(-52, 52)],
          ]
        : [
            [between(-maxHorizontal * 0.55, maxHorizontal * 0.55), between(-maxVertical * 0.62, maxVertical * 0.2)],
            [towardCenterX + crossBoost, between(-maxVertical * 0.72, maxVertical * 0.58)],
            [towardCenterX * between(0.45, 1.15) - crossBoost * 0.55, towardCenterY * between(-0.55, 0.8) + between(-80, 80)],
            [between(-maxHorizontal * 0.92, maxHorizontal * 0.92), between(-maxVertical * 0.88, maxVertical * 0.86)],
          ];

      return {
        index,
        points,
        rotationDirection,
        rotations: [
          between(145, 300) * rotationDirection,
          between(330, 620) * -rotationDirection,
          between(420, 760) * rotationDirection,
          between(220, 540) * -rotationDirection,
        ],
        scales: [between(0.86, 1.08), between(0.82, 1.15), between(0.88, 1.12), between(0.9, 1.1)],
        flips: [between(0.35, 1), between(0.35, 1), between(0.42, 1), between(0.5, 1)],
        settle78: [between(-55, 55), between(-55, 55)],
        settle88: [between(-22, 22), between(-22, 22)],
        overshoot: [between(-7, 7), between(-7, 7)],
        delay: compact ? between(0, 45) : between(0, 115),
        easing: choose([
          'cubic-bezier(.22,.72,.28,1)',
          'cubic-bezier(.18,.82,.34,1)',
          'cubic-bezier(.26,.66,.22,1)',
        ]),
      };
    });

    const now = performance.now();
    return {
      startedAt: now,
      duration: compact ? 2300 : 8000,
      compact,
      finalSources: captureFinalSources(root),
      paths,
      particleSpecs: createParticleSpecs(compact ? 10 : integer(20, 28)),
      animations: [],
      particleAnimations: [],
      faceTimer: null,
      root: null,
      lastPhase: phaseText(root),
      cancelled: false,
    };
  }

  function updateDurationFromPhase(root) {
    if (!run) return;
    const label = phaseText(root);
    if (!label || label === run.lastPhase) return;
    run.lastPhase = label;
    const ratio = PHASE_RATIOS.get(label);
    if (!ratio || run.compact) return;
    const elapsed = performance.now() - run.startedAt;
    const estimate = Math.max(6500, Math.min(9500, elapsed / ratio));
    run.duration = run.duration * 0.35 + estimate * 0.65;
  }

  function pathKeyframes(path) {
    const p = path.points;
    const point = (i) => p[Math.min(i, p.length - 1)];
    const frame = (offset, xy, rotation, scale, flip, blur, shadow) => ({
      offset,
      transform: `translate3d(${xy[0].toFixed(1)}px,${xy[1].toFixed(1)}px,0) rotate(${rotation.toFixed(1)}deg) scale(${scale.toFixed(3)}) scaleX(${flip.toFixed(3)})`,
      filter: `blur(${blur}px) drop-shadow(0 ${shadow}px ${Math.round(shadow * 1.2)}px rgba(0,0,0,.42))`,
    });

    return [
      frame(0, [0, 0], 0, 1, 1, 0, 8),
      frame(0.12, point(0), path.rotations[0], path.scales[0], path.flips[0], run.compact ? 0 : 0.18, 11),
      frame(0.28, point(1), path.rotations[1], path.scales[1], path.flips[1], run.compact ? 0 : 0.42, 15),
      frame(0.46, point(2), path.rotations[2], path.scales[2], path.flips[2], run.compact ? 0 : 0.48, 17),
      frame(0.64, point(3), path.rotations[3], path.scales[3], path.flips[3], run.compact ? 0 : 0.24, 13),
      frame(0.78, path.settle78, between(-34, 34), between(0.97, 1.04), 1, 0, 10),
      frame(0.88, path.settle88, between(-14, 14), between(0.99, 1.025), 1, 0, 9),
      frame(0.95, path.overshoot, between(-6, 6), 1.008, 1, 0, 8),
      frame(1, [0, 0], 0, 1, 1, 0, 8),
    ];
  }

  function makeHalo(root, elapsed) {
    const halo = document.createElement('div');
    halo.className = 'fa-mystic-halo';
    root.appendChild(halo);
    const animation = halo.animate([
      { offset: 0, opacity: 0, transform: 'translate(-50%,-50%) scale(.72)' },
      { offset: 0.18, opacity: 0.28, transform: 'translate(-50%,-50%) scale(.9)' },
      { offset: 0.46, opacity: 0.72, transform: 'translate(-50%,-50%) scale(1.14)' },
      { offset: 0.7, opacity: 0.42, transform: 'translate(-50%,-50%) scale(1.02)' },
      { offset: 0.84, opacity: 0.2, transform: 'translate(-50%,-50%) scale(.94)' },
      { offset: 1, opacity: 0, transform: 'translate(-50%,-50%) scale(.82)' },
    ], { duration: run.duration, fill: 'both', easing: 'ease-in-out' });
    animation.currentTime = Math.min(elapsed, run.duration);
    run.animations.push(animation);
  }

  function makeParticles(root, elapsed) {
    const layer = document.createElement('div');
    layer.className = 'fa-mystic-particles';
    root.appendChild(layer);

    run.particleSpecs.forEach((spec) => {
      const particle = document.createElement('i');
      particle.style.left = `${spec.left}%`;
      particle.style.top = `${spec.top}%`;
      particle.style.width = `${spec.size}px`;
      particle.style.height = `${spec.size}px`;
      particle.style.opacity = `${spec.opacity}`;
      layer.appendChild(particle);
      const animation = particle.animate([
        { transform: 'translate3d(0,0,0) scale(.72)', opacity: 0 },
        { offset: 0.18, opacity: spec.opacity },
        { offset: 0.62, transform: `translate3d(${spec.driftX * spec.phase}px,${-spec.rise * 0.62}px,0) scale(1.08)`, opacity: spec.opacity * 0.86 },
        { transform: `translate3d(${spec.driftX}px,${-spec.rise}px,0) scale(.42)`, opacity: 0 },
      ], { duration: spec.duration, iterations: Infinity, easing: 'cubic-bezier(.22,.64,.31,1)' });
      animation.currentTime = elapsed + spec.offset;
      run.particleAnimations.push(animation);
    });
  }

  function revealOrConceal(root, elapsed) {
    const images = [...root.querySelectorAll('.cowrie')];
    const assets = window.FA_ASSETS || {};
    const revealAt = run.duration * 0.92;
    if (elapsed >= revealAt) {
      images.forEach((image, index) => {
        if (run.finalSources[index]) image.src = run.finalSources[index];
      });
      return;
    }
    images.forEach((image) => {
      image.src = secureFloat() > 0.5 ? assets.cowrie_open_real : assets.cowrie_closed_real;
    });
  }

  function startFaceTimer() {
    if (!run || run.faceTimer) return;
    run.faceTimer = setInterval(() => {
      if (!run || run.cancelled || !run.root?.isConnected) return;
      const elapsed = performance.now() - run.startedAt;
      revealOrConceal(run.root, elapsed);
    }, integer(235, 315));
  }

  function attach(root) {
    if (!run || run.cancelled) return;
    updateDurationFromPhase(root);
    run.animations.forEach((animation) => { try { animation.cancel(); } catch {} });
    run.particleAnimations.forEach((animation) => { try { animation.cancel(); } catch {} });
    run.animations = [];
    run.particleAnimations = [];
    run.root = root;

    const elapsed = Math.max(0, performance.now() - run.startedAt);
    root.classList.add('fa-advanced-throw');
    root.style.setProperty('--fa-throw-duration', `${run.duration}ms`);

    const slots = [...root.querySelectorAll('.cowrie-slot')];
    slots.forEach((slot, index) => {
      const path = run.paths[index];
      if (!path) return;
      const animation = slot.animate(pathKeyframes(path), {
        duration: run.duration,
        delay: path.delay,
        fill: 'both',
        easing: path.easing,
      });
      animation.currentTime = Math.min(run.duration, elapsed + path.delay);
      run.animations.push(animation);
    });

    makeHalo(root, elapsed);
    makeParticles(root, elapsed);
    revealOrConceal(root, elapsed);
    root.classList.add('fa-motion-ready');
    startFaceTimer();
  }

  function stopRun() {
    if (!run) return;
    run.cancelled = true;
    if (run.faceTimer) clearInterval(run.faceTimer);
    run.animations.forEach((animation) => { try { animation.cancel(); } catch {} });
    run.particleAnimations.forEach((animation) => { try { animation.cancel(); } catch {} });
    run = null;
  }

  function synchronize() {
    const root = document.querySelector('.chain-card.throwing');
    if (!root) {
      stopRun();
      return;
    }
    if (!run) run = createRun(root);
    if (run.root !== root) attach(root);
    else updateDurationFromPhase(root);
  }

  observer = new MutationObserver(synchronize);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  window.addEventListener('pagehide', stopRun);
  window.addEventListener('beforeunload', stopRun);
  window.addEventListener('popstate', stopRun);
  synchronize();
})();
