(() => {
  const waitForLiveDemo = (attempt = 0) => {
    const device = document.querySelector('.pa-device');
    const live = device?.querySelector('.pa-live');
    if (!device || !live) {
      if (attempt < 60) setTimeout(() => waitForLiveDemo(attempt + 1), 100);
      return;
    }
    if (live.dataset.agentDemoReady === 'true') return;
    live.dataset.agentDemoReady = 'true';

    const points = [...live.querySelectorAll('.pa-live-points button')];
    const navItems = [...live.querySelectorAll('[data-live-nav]')];
    const stage = live.querySelector('.pa-live-canvas');
    const sceneHost = live.querySelector('[data-live-scene]');
    const oldControl = live.querySelector('.pa-live-control');
    const oldFooter = live.querySelector('.pa-live-footer');
    const badge = live.querySelector('.pa-live-badge');
    if (!points.length || !stage || !sceneHost) return;

    // Stoppe le carrousel historique : l'Agent Démo Live prend le contrôle du scénario.
    if (oldControl && /pause/i.test(oldControl.textContent || '')) oldControl.click();
    if (oldControl) oldControl.hidden = true;

    const style = document.createElement('style');
    style.id = 'pa-agent-demo-live-style';
    style.textContent = `
      .pa-live{position:relative}
      .pa-live.agent-demo-running{box-shadow:0 30px 90px rgba(83,62,210,.18),0 28px 80px rgba(15,23,42,.12)}
      .pa-agent-live-label{display:inline-flex;align-items:center;gap:7px;margin-left:auto;padding:6px 9px;border-radius:999px;background:linear-gradient(135deg,#6651e8,#7c5cec);color:#fff;font-size:8.5px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;box-shadow:0 7px 18px rgba(102,81,232,.22)}
      .pa-agent-live-label i{width:6px;height:6px;border-radius:50%;background:#7cf0b4;box-shadow:0 0 0 4px rgba(124,240,180,.18);animation:paAgentLiveBlink 1.15s ease-in-out infinite}
      @keyframes paAgentLiveBlink{50%{opacity:.35;transform:scale(.72)}}
      .pa-agent-demo-console{position:absolute;z-index:60;left:50%;bottom:14px;transform:translateX(-50%);width:min(92%,560px);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(215,220,231,.9);border-radius:13px;background:rgba(255,255,255,.93);backdrop-filter:blur(15px);box-shadow:0 13px 38px rgba(15,23,42,.16);color:#172033}
      .pa-page[data-theme="dark"] .pa-agent-demo-console{background:rgba(20,27,41,.94);border-color:#30394c;color:#f6f8fc}
      .pa-agent-demo-live-dot{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.pa-agent-demo-live-dot i{width:7px;height:7px;border-radius:50%;background:#18a66b;box-shadow:0 0 0 4px rgba(24,166,107,.13)}
      .pa-agent-demo-progress{height:6px;border-radius:999px;background:#e6eaf0;overflow:hidden}.pa-page[data-theme="dark"] .pa-agent-demo-progress{background:#2a3345}.pa-agent-demo-progress i{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6754ee,#9b68f0);transition:width .35s ease}
      .pa-agent-demo-actions{display:flex;align-items:center;gap:6px}.pa-agent-demo-actions button{height:29px;padding:0 9px;border:1px solid #dfe4eb;border-radius:8px;background:#fff;color:#475467;font:inherit;font-size:8px;font-weight:850;cursor:pointer}.pa-agent-demo-actions button:hover{border-color:#8b78ec;color:#5d49d8}.pa-page[data-theme="dark"] .pa-agent-demo-actions button{background:#171e2d;border-color:#30394c;color:#c4ccda}
      .pa-agent-demo-cursor{position:absolute;z-index:90;left:0;top:0;width:28px;height:35px;pointer-events:none;opacity:0;transform:translate3d(30px,70px,0);transition:transform .72s cubic-bezier(.2,.8,.2,1),opacity .2s ease;filter:drop-shadow(0 6px 8px rgba(15,23,42,.28));will-change:transform}.pa-agent-demo-cursor.show{opacity:1}.pa-agent-demo-cursor svg{display:block;width:100%;height:100%;overflow:visible}.pa-agent-demo-cursor path{fill:#fff;stroke:#172033;stroke-width:1.55;stroke-linejoin:round}.pa-page[data-theme="dark"] .pa-agent-demo-cursor path{fill:#f8fafc;stroke:#0a1020}
      .pa-agent-demo-cursor b{position:absolute;left:20px;top:25px;width:9px;height:9px;border-radius:50%;background:#6754ee;opacity:0;transform:scale(.4)}.pa-agent-demo-cursor.click b{animation:paAgentClick .45s ease-out}@keyframes paAgentClick{0%{opacity:.9;transform:scale(.35);box-shadow:0 0 0 0 rgba(103,84,238,.5)}100%{opacity:0;transform:scale(1);box-shadow:0 0 0 18px rgba(103,84,238,0)}}
      .pa-agent-demo-ripple{position:absolute;z-index:85;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #6754ee;border-radius:50%;pointer-events:none;animation:paAgentRipple .55s ease-out forwards}@keyframes paAgentRipple{from{opacity:.9;transform:scale(.35)}to{opacity:0;transform:scale(4.5)}}
      .pa-agent-demo-caption{position:absolute;z-index:70;left:50%;top:58px;transform:translateX(-50%) translateY(-6px);max-width:min(82%,560px);padding:8px 11px;border:1px solid rgba(103,84,238,.22);border-radius:10px;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);box-shadow:0 9px 26px rgba(15,23,42,.11);color:#263045;font-size:8.7px;font-weight:800;line-height:1.4;text-align:center;opacity:0;transition:opacity .2s ease,transform .2s ease;pointer-events:none}.pa-agent-demo-caption.show{opacity:1;transform:translateX(-50%) translateY(0)}.pa-agent-demo-caption strong{color:#5e49da}.pa-page[data-theme="dark"] .pa-agent-demo-caption{background:rgba(20,27,41,.95);border-color:#433a72;color:#d8deea}.pa-page[data-theme="dark"] .pa-agent-demo-caption strong{color:#b7a8ff}
      .pa-agent-demo-focus{outline:2px solid rgba(103,84,238,.72)!important;outline-offset:3px;box-shadow:0 0 0 7px rgba(103,84,238,.09)!important;transition:outline-color .18s ease,box-shadow .18s ease}
      .pa-live-footer{padding-bottom:42px}
      @media(max-width:720px){.pa-agent-demo-console{bottom:9px;width:94%;grid-template-columns:1fr auto}.pa-agent-demo-live-dot{display:none}.pa-agent-demo-progress{min-width:120px}.pa-agent-demo-cursor{width:23px;height:29px}.pa-agent-demo-cursor b{left:17px;top:20px}.pa-agent-demo-caption{top:52px;font-size:8px}.pa-live-footer{padding-bottom:42px}}
      @media(prefers-reduced-motion:reduce){.pa-agent-demo-cursor{display:none}.pa-agent-live-label i{animation:none}.pa-agent-demo-progress i,.pa-agent-demo-caption{transition:none}}
    `;
    document.head.appendChild(style);

    if (badge) {
      badge.innerHTML = '<i></i> Agent Démo Live • IA locale';
    }

    const label = document.createElement('span');
    label.className = 'pa-agent-live-label';
    label.innerHTML = '<i></i> Agent Démo Live';
    const name = live.querySelector('.pa-live-name');
    if (name && !live.querySelector('.pa-agent-live-label')) name.insertAdjacentElement('afterend', label);

    const consoleBar = document.createElement('div');
    consoleBar.className = 'pa-agent-demo-console';
    consoleBar.innerHTML = `
      <span class="pa-agent-demo-live-dot"><i></i> Démonstration en direct</span>
      <span class="pa-agent-demo-progress" aria-label="Progression de la démonstration"><i></i></span>
      <span class="pa-agent-demo-actions"><button type="button" data-agent-pause>Pause</button><button type="button" data-agent-replay>Rejouer</button></span>`;
    live.appendChild(consoleBar);

    const cursor = document.createElement('div');
    cursor.className = 'pa-agent-demo-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<svg viewBox="0 0 28 35"><path d="M3 2 24 20l-10 1.6 5.2 9.1-5.1 2.9-5-9.2L3 32V2Z"/></svg><b></b>';
    live.appendChild(cursor);

    const caption = document.createElement('div');
    caption.className = 'pa-agent-demo-caption';
    live.appendChild(caption);

    const progress = consoleBar.querySelector('.pa-agent-demo-progress i');
    const pauseBtn = consoleBar.querySelector('[data-agent-pause]');
    const replayBtn = consoleBar.querySelector('[data-agent-replay]');

    const scenes = [
      { nav:'Accueil', target:'.pa-live-primary', caption:'<strong>1/7 — Ouverture.</strong> PrivatAI démarre sur le poste et prépare le moteur IA local.' },
      { nav:'Projets', target:'.pa-live-primary', caption:'<strong>2/7 — Projet privé.</strong> Le dossier sensible est isolé dans son propre contexte.' },
      { nav:'Agents', target:'.pa-live-primary', caption:'<strong>3/7 — Agent spécialisé.</strong> L’agent travaille avec les consignes du projet, localement.' },
      { nav:'Documents', target:'.pa-live-file', caption:'<strong>4/7 — Document TOP SECRET.</strong> Le fichier est chargé et indexé sur l’ordinateur.' },
      { nav:'Discussion', target:'.pa-live-bubble.user', caption:'<strong>5/7 — Question.</strong> L’utilisateur interroge le document sans envoyer son contenu au cloud.' },
      { nav:'Discussion', target:'.pa-live-bubble.ai', caption:'<strong>6/7 — Réponse sourcée.</strong> PrivatAI répond à partir des passages du dossier et affiche les références.' },
      { nav:'Documents', target:'.pa-live-download', caption:'<strong>7/7 — Rapport.</strong> Le livrable professionnel est généré puis enregistré sur l’ordinateur.' }
    ];

    let current = 0;
    let paused = false;
    let stoppedByViewport = false;
    let sequenceToken = 0;
    let activeFocus = null;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const liveRect = () => live.getBoundingClientRect();
    const centerOf = (el) => {
      const r = el.getBoundingClientRect();
      const root = liveRect();
      return { x: r.left - root.left + Math.min(r.width * .55, r.width - 5), y: r.top - root.top + Math.min(r.height * .58, r.height - 5) };
    };
    const moveCursor = async (el, token) => {
      if (!el || token !== sequenceToken) return;
      const p = centerOf(el);
      cursor.classList.add('show');
      cursor.style.transform = `translate3d(${Math.max(4,p.x - 5)}px,${Math.max(4,p.y - 4)}px,0)`;
      await delay(760);
    };
    const clickEffect = (el) => {
      if (!el) return;
      cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click');
      const p = centerOf(el);
      const ripple = document.createElement('i');
      ripple.className = 'pa-agent-demo-ripple';
      ripple.style.left = `${p.x}px`; ripple.style.top = `${p.y}px`;
      live.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    };
    const setFocus = (el) => {
      activeFocus?.classList.remove('pa-agent-demo-focus');
      activeFocus = el || null;
      activeFocus?.classList.add('pa-agent-demo-focus');
    };
    const showCaption = (html) => {
      caption.innerHTML = html;
      caption.classList.add('show');
    };
    const hideCaption = () => caption.classList.remove('show');
    const updateProgress = () => { if (progress) progress.style.width = `${((current + 1) / scenes.length) * 100}%`; };

    const activateScene = async (index, token) => {
      const spec = scenes[index];
      const nav = navItems.find((el) => el.dataset.liveNav === spec.nav);
      if (nav) {
        await moveCursor(nav, token);
        if (token !== sequenceToken) return;
        setFocus(nav); clickEffect(nav);
        await delay(300);
      }
      points[index]?.click();
      await delay(520);
      if (token !== sequenceToken) return;
      const target = sceneHost.querySelector(spec.target) || sceneHost.firstElementChild;
      setFocus(target);
      if (target) {
        await moveCursor(target, token);
        if (token !== sequenceToken) return;
        clickEffect(target);
      }
      showCaption(spec.caption);
      updateProgress();
      await delay(index === 3 || index === 4 ? 2550 : 2150);
      hideCaption();
      setFocus(null);
    };

    const run = async (from = 0) => {
      const token = ++sequenceToken;
      current = from;
      paused = false;
      pauseBtn.textContent = 'Pause';
      live.classList.add('agent-demo-running');
      cursor.classList.add('show');
      while (token === sequenceToken) {
        if (paused || stoppedByViewport) { await delay(180); continue; }
        await activateScene(current, token);
        if (token !== sequenceToken) break;
        if (paused || stoppedByViewport) continue;
        current += 1;
        if (current >= scenes.length) {
          await delay(1250);
          if (token !== sequenceToken) break;
          current = 0;
        }
      }
    };

    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? 'Reprendre' : 'Pause';
      if (!paused) live.classList.add('agent-demo-running');
    });
    replayBtn.addEventListener('click', () => {
      sequenceToken += 1;
      hideCaption(); setFocus(null);
      current = 0; paused = false; stoppedByViewport = false;
      pauseBtn.textContent = 'Pause';
      points[0]?.click();
      setTimeout(() => run(0), 120);
    });

    points.forEach((point, index) => {
      point.addEventListener('click', (event) => {
        if (!event.isTrusted) return;
        current = index;
        paused = true;
        pauseBtn.textContent = 'Reprendre';
        updateProgress();
      });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          stoppedByViewport = !entry.isIntersecting;
          if (entry.isIntersecting && !paused && sequenceToken === 0) run(0);
        });
      }, { threshold: .32 });
      observer.observe(live);
    } else {
      run(0);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paused = true;
      pauseBtn.textContent = 'Lire la démo';
      pauseBtn.addEventListener('click', () => {
        points[current]?.click();
        current = (current + 1) % scenes.length;
        updateProgress();
      });
    }
  };

  waitForLiveDemo();
})();