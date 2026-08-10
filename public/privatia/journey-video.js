(() => {
  const waitForJourney = (attempt = 0) => {
    const root = document.getElementById('usecase');
    if (!root) {
      if (attempt < 40) setTimeout(() => waitForJourney(attempt + 1), 100);
      return;
    }
    if (root.dataset.videoReady === 'true') return;
    root.dataset.videoReady = 'true';

    const shell = root.querySelector('.pa-journey-shell');
    const tabs = [...root.querySelectorAll('.pa-journey-tab')];
    const visualHost = root.querySelector('[data-journey-visual]');
    if (!shell || !tabs.length || !visualHost) return;

    const style = document.createElement('style');
    style.id = 'pa-journey-video-style';
    style.textContent = `
      .pa-journey-shell{position:relative;isolation:isolate}
      .pa-tour-console{margin:0 0 13px;padding:10px 12px;display:grid;grid-template-columns:auto minmax(160px,1fr) auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--surface) 96%,var(--violet) 4%);color:var(--ink)}
      .pa-tour-live{display:inline-flex;align-items:center;gap:8px;font-size:9px;font-weight:900;letter-spacing:.055em;text-transform:uppercase;white-space:nowrap}.pa-tour-live i{width:7px;height:7px;border-radius:50%;background:#16a36a;box-shadow:0 0 0 4px rgba(22,163,106,.12)}
      .pa-tour-progress-wrap{display:flex;align-items:center;gap:9px;min-width:0}.pa-tour-progress{height:6px;flex:1;overflow:hidden;border-radius:999px;background:color-mix(in srgb,var(--line) 86%,transparent)}.pa-tour-progress i{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--violet),#8b5cf6);transition:width .45s ease}.pa-tour-count{color:var(--muted);font-size:9px;font-weight:850;white-space:nowrap}
      .pa-tour-actions{display:flex;gap:7px}.pa-tour-btn{min-height:31px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font:inherit;font-size:9px;font-weight:850;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease}.pa-tour-btn:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--violet) 42%,var(--line));background:var(--violet-soft)}.pa-tour-btn.primary{border-color:transparent;background:var(--violet);color:#fff}
      .pa-tour-caption{position:absolute;z-index:24;right:19px;bottom:17px;max-width:min(390px,calc(100% - 38px));padding:9px 12px;display:flex;align-items:center;gap:8px;border:1px solid color-mix(in srgb,var(--violet) 25%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--surface) 93%,transparent);backdrop-filter:blur(14px);box-shadow:0 12px 35px rgba(15,23,42,.11);color:var(--ink);font-size:9.5px;font-weight:780;line-height:1.4;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .25s ease,transform .25s ease}.pa-tour-caption.show{opacity:1;transform:none}.pa-tour-caption i{width:7px;height:7px;flex:none;border-radius:50%;background:#16a36a;box-shadow:0 0 0 4px rgba(22,163,106,.12)}
      .pa-tour-cursor{position:absolute;z-index:40;left:0;top:0;width:27px;height:34px;pointer-events:none;opacity:0;transform:translate3d(18px,18px,0);transition:transform .72s cubic-bezier(.22,.75,.2,1),opacity .18s ease;filter:drop-shadow(0 5px 8px rgba(15,23,42,.28));will-change:transform}.pa-tour-cursor.show{opacity:1}.pa-tour-cursor svg{display:block;width:100%;height:100%;overflow:visible}.pa-tour-cursor path{fill:#fff;stroke:#192033;stroke-width:1.5;stroke-linejoin:round}.pa-tour-cursor b{position:absolute;left:20px;top:24px;width:10px;height:10px;border-radius:50%;background:var(--violet);opacity:0;transform:scale(.4)}.pa-tour-cursor.click b{animation:paTourCursorPulse .46s ease-out}.pa-page[data-theme="dark"] .pa-tour-cursor path{fill:#f8fafc;stroke:#0b1020}@keyframes paTourCursorPulse{0%{opacity:.9;transform:scale(.4);box-shadow:0 0 0 0 rgba(103,84,238,.45)}100%{opacity:0;transform:scale(1);box-shadow:0 0 0 18px rgba(103,84,238,0)}}
      .pa-tour-ripple{position:absolute;z-index:35;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid var(--violet);border-radius:50%;pointer-events:none;animation:paTourRipple .55s ease-out forwards}@keyframes paTourRipple{from{opacity:.8;transform:scale(.4)}to{opacity:0;transform:scale(4.3)}}
      .pa-tour-focus{position:relative;z-index:3;outline:2px solid color-mix(in srgb,var(--violet) 65%,transparent)!important;outline-offset:4px;box-shadow:0 0 0 7px color-mix(in srgb,var(--violet) 9%,transparent)!important;transition:outline-color .2s ease,box-shadow .2s ease}
      .pa-journey-shell.is-playing:before{content:'';position:absolute;z-index:0;inset:0;border-radius:28px;pointer-events:none;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--violet) 15%,transparent)}
      .pa-journey-shell.is-playing .pa-tour-live i{animation:paTourBlink 1.25s ease-in-out infinite}@keyframes paTourBlink{50%{opacity:.35;transform:scale(.8)}}
      .pa-journey-tab.pa-tour-clicked{animation:paTourTabClick .42s ease}@keyframes paTourTabClick{50%{transform:scale(.96);background:color-mix(in srgb,var(--violet) 16%,var(--surface))}}
      @media(max-width:760px){.pa-tour-console{grid-template-columns:1fr auto}.pa-tour-progress-wrap{grid-column:1/-1;grid-row:2}.pa-tour-actions{justify-self:end}.pa-tour-caption{right:12px;bottom:12px}.pa-tour-cursor{width:23px;height:29px}.pa-tour-cursor b{left:17px;top:20px}}
      @media(max-width:520px){.pa-tour-console{padding:9px}.pa-tour-live{font-size:8px}.pa-tour-btn{padding:0 8px}.pa-tour-caption{font-size:8.5px}.pa-tour-count{font-size:8px}}
      @media(prefers-reduced-motion:reduce){.pa-tour-cursor,.pa-tour-caption,.pa-tour-progress i,.pa-tour-focus{transition:none!important}.pa-tour-cursor{display:none}.pa-journey-shell.is-playing .pa-tour-live i{animation:none}}
    `;
    document.head.appendChild(style);

    const consoleBar = document.createElement('div');
    consoleBar.className = 'pa-tour-console';
    consoleBar.innerHTML = `
      <div class="pa-tour-live"><i></i><span>Démo guidée automatique</span></div>
      <div class="pa-tour-progress-wrap"><div class="pa-tour-progress"><i></i></div><span class="pa-tour-count">Étape 1 / ${tabs.length}</span></div>
      <div class="pa-tour-actions"><button class="pa-tour-btn pa-tour-pause" type="button">Pause</button><button class="pa-tour-btn primary pa-tour-replay" type="button">Rejouer</button></div>`;
    shell.insertBefore(consoleBar, shell.firstChild);

    const cursor = document.createElement('div');
    cursor.className = 'pa-tour-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = `<svg viewBox="0 0 28 36"><path d="M3 2.7 24.2 22l-9.2 1.1 5 9.1-5.3 2.8-4.8-9.1-6.2 6.3L3 2.7Z"/></svg><b></b>`;
    shell.appendChild(cursor);

    const caption = document.createElement('div');
    caption.className = 'pa-tour-caption';
    caption.innerHTML = '<i></i><span></span>';
    shell.appendChild(caption);

    const progress = consoleBar.querySelector('.pa-tour-progress i');
    const count = consoleBar.querySelector('.pa-tour-count');
    const pauseBtn = consoleBar.querySelector('.pa-tour-pause');
    const replayBtn = consoleBar.querySelector('.pa-tour-replay');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const messages = [
      'Ouverture de PrivatAI : le moteur IA local est prêt sur votre ordinateur.',
      'Création d’un projet confidentiel : le dossier reste séparé des autres contextes.',
      'Création d’un agent privé : ses consignes structurent l’analyse locale.',
      'Chargement du document TOP SECRET : indexation et recherche restent sur la machine.',
      'Question sur le document : la recherche RAG et l’inférence fonctionnent hors ligne.',
      'Réponse sourcée : PrivatAI retrouve les passages utiles et cite le dossier.',
      'Rapport professionnel : le livrable est généré et enregistré sur votre ordinateur.'
    ];

    const selectors = [
      '.pa-j-option.selected',
      '.pa-j-option.selected',
      '.pa-j-agent',
      '.pa-j-file',
      '.pa-j-bubble.pa-j-user',
      '.pa-j-bubble.pa-j-ai',
      '.pa-j-download'
    ];

    let sequenceToken = 0;
    let currentStep = 0;
    let running = false;
    let userPaused = false;
    let inView = false;
    let focusEl = null;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const setCaption = (index) => {
      caption.querySelector('span').textContent = messages[index] || '';
      caption.classList.add('show');
      progress.style.width = `${((index + 1) / tabs.length) * 100}%`;
      count.textContent = `Étape ${index + 1} / ${tabs.length}`;
    };

    const clearFocus = () => {
      if (focusEl) focusEl.classList.remove('pa-tour-focus');
      focusEl = null;
    };

    const shellPoint = (element) => {
      const er = element.getBoundingClientRect();
      const sr = shell.getBoundingClientRect();
      return {
        x: er.left - sr.left + Math.min(er.width * .55, er.width - 8),
        y: er.top - sr.top + Math.min(er.height * .52, er.height - 6)
      };
    };

    const moveCursor = async (element, token, delay = 760) => {
      if (!element || token !== sequenceToken) return false;
      const point = shellPoint(element);
      cursor.classList.add('show');
      cursor.style.transform = `translate3d(${point.x}px,${point.y}px,0)`;
      await sleep(delay);
      return token === sequenceToken;
    };

    const clickAt = (element) => {
      if (!element) return;
      const point = shellPoint(element);
      cursor.classList.remove('click');
      void cursor.offsetWidth;
      cursor.classList.add('click');
      const ripple = document.createElement('i');
      ripple.className = 'pa-tour-ripple';
      ripple.style.left = `${point.x}px`;
      ripple.style.top = `${point.y}px`;
      shell.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
      element.classList.add('pa-tour-clicked');
      setTimeout(() => element.classList.remove('pa-tour-clicked'), 480);
    };

    const emphasize = (element) => {
      clearFocus();
      if (!element) return;
      focusEl = element;
      focusEl.classList.add('pa-tour-focus');
      setTimeout(() => {
        if (focusEl === element) clearFocus();
      }, 1350);
    };

    const stop = () => {
      sequenceToken += 1;
      running = false;
      shell.classList.remove('is-playing');
      clearFocus();
    };

    const run = async () => {
      if (running || userPaused || !inView || reducedMotion.matches) return;
      running = true;
      shell.classList.add('is-playing');
      pauseBtn.textContent = 'Pause';
      const token = ++sequenceToken;

      while (token === sequenceToken && !userPaused && inView) {
        const index = currentStep % tabs.length;
        const tab = tabs[index];
        setCaption(index);
        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        await sleep(180);
        if (!(await moveCursor(tab, token))) break;
        clickAt(tab);
        tab.click();
        await sleep(430);
        if (token !== sequenceToken) break;

        const target = visualHost.querySelector(selectors[index]) || visualHost;
        if (await moveCursor(target, token, 680)) {
          clickAt(target);
          emphasize(target);
        }

        await sleep(index === 3 || index === 4 ? 2350 : 1950);
        if (token !== sequenceToken) break;
        currentStep = (index + 1) % tabs.length;
        if (currentStep === 0) await sleep(900);
      }

      if (token === sequenceToken) {
        running = false;
        shell.classList.remove('is-playing');
      }
    };

    pauseBtn.addEventListener('click', () => {
      if (!userPaused) {
        userPaused = true;
        pauseBtn.textContent = 'Reprendre';
        stop();
        caption.classList.add('show');
      } else {
        userPaused = false;
        pauseBtn.textContent = 'Pause';
        run();
      }
    });

    replayBtn.addEventListener('click', () => {
      userPaused = false;
      stop();
      currentStep = 0;
      progress.style.width = '0%';
      pauseBtn.textContent = 'Pause';
      setTimeout(run, 80);
    });

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', (event) => {
        if (!event.isTrusted) return;
        userPaused = true;
        stop();
        currentStep = index;
        setCaption(index);
        pauseBtn.textContent = 'Reprendre';
        const target = visualHost.querySelector(selectors[index]);
        if (target) emphasize(target);
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        inView = entry.isIntersecting && entry.intersectionRatio >= .35;
        if (inView && !userPaused) {
          setTimeout(run, 380);
        } else if (!inView && running) {
          stop();
        }
      });
    }, { threshold: [0, .35, .6] });
    observer.observe(root);

    reducedMotion.addEventListener?.('change', () => {
      if (reducedMotion.matches) {
        stop();
        cursor.classList.remove('show');
        pauseBtn.textContent = 'Lecture';
      } else if (inView && !userPaused) {
        run();
      }
    });

    if (reducedMotion.matches) {
      pauseBtn.textContent = 'Lecture';
      caption.querySelector('span').textContent = 'Animation automatique désactivée selon les préférences de mouvement de votre appareil.';
      caption.classList.add('show');
    }
  };

  waitForJourney();
})();