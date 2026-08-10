(() => {
  const root = document.querySelector('.pa-page');
  const themeButton = document.querySelector('.pa-theme');
  const systemLabel = document.getElementById('systemLabel');
  const mirrors = document.querySelectorAll('.systemLabelMirror');
  const platformButtons = document.querySelectorAll('[data-platform]');
  const year = document.getElementById('year');

  const WINDOWS_DOWNLOAD = '/privatia/downloads/PrivatAI-Windows-x64-Setup.exe';
  const WINDOWS_MSI_DOWNLOAD = '/privatia/downloads/PrivatAI-Windows-x64.msi';
  const MAC_DOWNLOAD = '/privatia/downloads/PrivatAI-Mac-Intel.dmg';

  if (year) year.textContent = String(new Date().getFullYear());

  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const applyTheme = (theme) => {
    const dark = theme === 'dark';
    if (dark) root?.setAttribute('data-theme', 'dark');
    else root?.removeAttribute('data-theme');
    themeButton?.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeButton?.setAttribute('aria-label', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
  };

  applyTheme(localStorage.getItem('privatai-theme') || getSystemTheme());
  themeButton?.addEventListener('click', () => {
    const next = root?.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('privatai-theme', next);
  });

  const detectPlatform = () => {
    const p = navigator.userAgentData?.platform || navigator.platform || '';
    const ua = `${navigator.userAgent || ''} ${p}`.toLowerCase();
    if (/windows|win32|win64/.test(ua)) return 'windows';
    if (/macintosh|macintel|mac os|mac/.test(ua)) return 'mac';
    return 'other';
  };

  const detected = detectPlatform();
  const labels = {
    windows: 'Windows détecté automatiquement',
    mac: 'Mac détecté automatiquement',
    other: 'Choisissez votre système',
  };
  if (systemLabel) systemLabel.textContent = labels[detected];
  mirrors.forEach((el) => { el.textContent = labels[detected]; });
  root?.setAttribute('data-detected-platform', detected);

  const configureDownload = (button, url, fileName) => {
    button.removeAttribute('target');
    button.removeAttribute('rel');
    button.href = url;
    button.setAttribute('download', fileName);
    button.addEventListener('click', () => {
      const small = button.querySelector('small');
      const original = small?.textContent || 'Télécharger';
      button.classList.add('downloading');
      button.setAttribute('aria-busy', 'true');
      if (small) small.textContent = 'Téléchargement…';
      setTimeout(() => {
        if (small) small.textContent = original;
        button.classList.remove('downloading');
        button.removeAttribute('aria-busy');
      }, 2200);
    });
  };

  platformButtons.forEach((button) => {
    const platform = button.getAttribute('data-platform');
    button.classList.toggle('recommended', platform === detected);
    if (platform === 'windows') configureDownload(button, WINDOWS_DOWNLOAD, 'PrivatAI-Windows-x64-Setup.exe');
    if (platform === 'mac') {
      const strong = button.querySelector('strong');
      if (strong) strong.textContent = 'pour Mac (Intel)';
      configureDownload(button, MAC_DOWNLOAD, 'PrivatAI-Mac-Intel.dmg');
    }
  });

  document.querySelectorAll('.pa-other').forEach((link) => {
    link.innerHTML = 'Windows MSI direct <span>→</span>';
    configureDownload(link, WINDOWS_MSI_DOWNLOAD, 'PrivatAI-Windows-x64.msi');
  });

  // ---------------------------------------------------------------------------
  // DEMO LIVE : visible immédiatement dans le hero, autonome et sans dépendance.
  // ---------------------------------------------------------------------------
  const device = document.querySelector('.pa-device');
  if (device) {
    const style = document.createElement('style');
    style.id = 'pa-live-demo-style';
    style.textContent = `
      .pa-live{position:relative;width:100%;border:1px solid #e4e7ec;border-radius:26px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.14);overflow:hidden;color:#172033;min-height:560px}
      .pa-page[data-theme="dark"] .pa-live{background:#101522;border-color:#2a3345;color:#f6f8fc;box-shadow:0 28px 80px rgba(0,0,0,.35)}
      .pa-live-bar{height:46px;padding:0 15px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #e8ebf0;background:#fbfcfe}.pa-page[data-theme="dark"] .pa-live-bar{background:#151b29;border-color:#2a3345}
      .pa-live-dot{width:9px;height:9px;border-radius:50%}.pa-live-dot.r{background:#ff5f57}.pa-live-dot.y{background:#febc2e}.pa-live-dot.g{background:#28c840}
      .pa-live-name{margin-left:8px;font-size:11px;font-weight:850}.pa-live-badge{margin-left:auto;display:flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#eefcf4;color:#137a46;font-size:9px;font-weight:850}.pa-live-badge i{width:6px;height:6px;border-radius:50%;background:#16a060;box-shadow:0 0 0 4px rgba(22,160,96,.12)}
      .pa-page[data-theme="dark"] .pa-live-badge{background:#123123;color:#75e0a7}
      .pa-live-layout{display:grid;grid-template-columns:132px 1fr;min-height:514px}.pa-live-side{padding:17px 12px;border-right:1px solid #eaedf2;background:#fafbfc}.pa-page[data-theme="dark"] .pa-live-side{background:#121825;border-color:#293244}
      .pa-live-logo{font-size:12px;font-weight:900;margin-bottom:18px}.pa-live-nav{display:grid;gap:7px}.pa-live-nav span{padding:8px 9px;border-radius:9px;color:#697386;font-size:9px;font-weight:750}.pa-live-nav span.active{background:#efeafe;color:#5f48da}.pa-page[data-theme="dark"] .pa-live-nav span{color:#9ba7bb}.pa-page[data-theme="dark"] .pa-live-nav span.active{background:#282047;color:#a999ff}
      .pa-live-main{padding:18px;display:flex;flex-direction:column;min-width:0}.pa-live-stage-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px}.pa-live-step{width:31px;height:31px;display:grid;place-items:center;flex:none;border-radius:10px;background:#eee9ff;color:#6048de;font-size:10px;font-weight:900}.pa-live-stage-head h3{margin:0;font-size:15px;letter-spacing:-.02em}.pa-live-stage-head p{margin:3px 0 0;color:#7a8497;font-size:9.5px;line-height:1.5}
      .pa-live-canvas{position:relative;flex:1;display:flex;align-items:center;justify-content:center;padding:14px;border:1px solid #e8ebf0;border-radius:17px;background:linear-gradient(145deg,#fafbff,#f6f8fb);overflow:hidden}.pa-page[data-theme="dark"] .pa-live-canvas{background:linear-gradient(145deg,#151b28,#111723);border-color:#2a3345}
      .pa-live-card{width:min(430px,100%);padding:17px;border:1px solid #e4e8ef;border-radius:16px;background:#fff;box-shadow:0 16px 45px rgba(15,23,42,.09);animation:paLiveIn .38s cubic-bezier(.2,.8,.2,1)}.pa-page[data-theme="dark"] .pa-live-card{background:#171e2d;border-color:#30394c}
      @keyframes paLiveIn{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
      .pa-live-card-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:13px}.pa-live-card-top strong{font-size:10px}.pa-live-local{padding:5px 7px;border-radius:999px;background:#effaf4;color:#168153;font-size:8px;font-weight:850}.pa-page[data-theme="dark"] .pa-live-local{background:#173226;color:#7cddb0}
      .pa-live-field{padding:11px;border:1px solid #e5e9ef;border-radius:11px;background:#f9fafc;margin-top:8px}.pa-page[data-theme="dark"] .pa-live-field{background:#111826;border-color:#2b3548}.pa-live-field b{display:block;font-size:10px}.pa-live-field small{display:block;margin-top:4px;color:#7a8497;font-size:8.5px;line-height:1.4}
      .pa-live-primary{display:inline-flex;margin-top:11px;padding:8px 11px;border-radius:9px;background:#6550e8;color:#fff;font-size:8.5px;font-weight:850}
      .pa-live-agent{display:flex;gap:10px;align-items:center}.pa-live-avatar{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(135deg,#6550e8,#8d62ef);color:#fff;font-size:11px;font-weight:900}.pa-live-agent b{font-size:10px}.pa-live-agent span{display:block;margin-top:3px;color:#7a8497;font-size:8.5px}
      .pa-live-file{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center}.pa-live-file-icon{width:42px;height:46px;display:grid;place-items:center;border-radius:9px;background:#e5484d;color:#fff;font-size:8px;font-weight:900}.pa-live-file b{font-size:9.5px}.pa-live-file small{display:block;color:#7a8497;font-size:8px;margin-top:3px}.pa-live-secret{padding:5px 7px;border-radius:7px;background:#ffe7e7;color:#bc2a2e;font-size:7px;font-weight:900;letter-spacing:.04em}
      .pa-live-progress{height:5px;margin-top:12px;border-radius:999px;background:#e9edf2;overflow:hidden}.pa-live-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#6550e8,#8b5cf6);animation:paLoad 2.5s ease forwards}@keyframes paLoad{to{width:100%}}
      .pa-live-chat{display:grid;gap:9px}.pa-live-bubble{padding:10px 11px;border-radius:12px;font-size:8.8px;line-height:1.5;max-width:92%}.pa-live-bubble.user{margin-left:auto;background:#6550e8;color:#fff;border-bottom-right-radius:4px}.pa-live-bubble.ai{background:#f6f7fa;border:1px solid #e5e9ef;border-bottom-left-radius:4px}.pa-page[data-theme="dark"] .pa-live-bubble.ai{background:#111826;border-color:#2b3548}.pa-live-bubble.ai b{color:#6550e8}.pa-live-cites{display:flex;gap:5px;margin-top:7px;flex-wrap:wrap}.pa-live-cites span{padding:4px 6px;border:1px solid #dfe4eb;border-radius:6px;background:#fff;color:#6d7788;font-size:7px}.pa-page[data-theme="dark"] .pa-live-cites span{background:#171e2d;border-color:#30394c;color:#aeb8c8}
      .pa-live-export{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid #e3e7ee;border-radius:12px;background:#f9fafc}.pa-page[data-theme="dark"] .pa-live-export{background:#111826;border-color:#2b3548}.pa-live-export-icon{width:40px;height:44px;display:grid;place-items:center;border-radius:9px;background:#e9efff;color:#3657b3;font-size:8px;font-weight:900}.pa-live-export b{font-size:9.5px}.pa-live-export small{display:block;margin-top:3px;color:#7a8497;font-size:8px}.pa-live-download{margin-left:auto;padding:7px 9px;border-radius:8px;background:#6550e8;color:#fff;font-size:8px;font-weight:850}
      .pa-live-footer{margin-top:13px;display:flex;align-items:center;gap:9px}.pa-live-points{display:flex;gap:5px;flex:1}.pa-live-points button{width:7px;height:7px;padding:0;border:0;border-radius:999px;background:#d7dce5;cursor:pointer;transition:.2s}.pa-live-points button.active{width:20px;background:#6550e8}.pa-live-control{border:1px solid #e0e5ec;border-radius:8px;background:#fff;color:#667085;padding:6px 8px;font:inherit;font-size:8px;font-weight:800;cursor:pointer}.pa-page[data-theme="dark"] .pa-live-control{background:#171e2d;border-color:#30394c;color:#b3bdcc}
      .pa-live-caption{position:absolute;left:12px;bottom:10px;display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.88);backdrop-filter:blur(8px);box-shadow:0 5px 16px rgba(15,23,42,.07);font-size:7.5px;font-weight:800;color:#268457}.pa-live-caption i{width:6px;height:6px;border-radius:50%;background:#1da568;animation:paPulse 1.5s infinite}@keyframes paPulse{50%{opacity:.35;transform:scale(.7)}}.pa-page[data-theme="dark"] .pa-live-caption{background:rgba(20,27,40,.9);color:#7ce0ae}
      @media(max-width:900px){.pa-live{min-height:510px}.pa-live-layout{grid-template-columns:110px 1fr;min-height:464px}.pa-live-side{padding:14px 9px}.pa-live-main{padding:14px}}
      @media(max-width:720px){.pa-live{min-height:440px;border-radius:20px}.pa-live-layout{grid-template-columns:1fr;min-height:394px}.pa-live-side{display:none}.pa-live-main{padding:12px}.pa-live-stage-head p{font-size:8.5px}.pa-live-canvas{padding:9px}.pa-live-card{padding:13px}.pa-live-caption{display:none}}
      @media(prefers-reduced-motion:reduce){.pa-live-card,.pa-live-progress i,.pa-live-caption i{animation:none}.pa-live-progress i{width:100%}}
    `;
    document.head.appendChild(style);

    const scenes = [
      {
        nav:'Accueil', n:'01', title:'Ouvrez PrivatAI', sub:'Votre espace IA démarre directement sur votre ordinateur.',
        html:`<div class="pa-live-card"><div class="pa-live-card-top"><strong>PrivatAI est prêt</strong><span class="pa-live-local">● Moteur local</span></div><div class="pa-live-field"><b>IA locale active</b><small>Modèle conversationnel et moteur de recherche documentaire disponibles hors ligne.</small></div><div class="pa-live-field"><b>Vos données restent ici</b><small>Aucun document sensible n’est envoyé vers une API d’IA distante.</small></div><span class="pa-live-primary">Commencer →</span></div>`
      },
      {
        nav:'Projets', n:'02', title:'Créez un projet privé', sub:'Isolez documents, agent, conversations et livrables.',
        html:`<div class="pa-live-card"><div class="pa-live-card-top"><strong>Nouveau projet</strong><span class="pa-live-local">Local</span></div><div class="pa-live-field"><b>Opération Atlas — CONFIDENTIEL</b><small>Analyse stratégique d’un dossier interne à diffusion strictement limitée.</small></div><div class="pa-live-field"><b>Contexte isolé</b><small>Documents, échanges et livrables restent attachés à ce projet.</small></div><span class="pa-live-primary">Créer le projet</span></div>`
      },
      {
        nav:'Agents', n:'03', title:'Créez votre agent spécialisé', sub:'Définissez son rôle, ses consignes et sa prudence.',
        html:`<div class="pa-live-card"><div class="pa-live-card-top"><strong>Agent privé</strong><span class="pa-live-local">Sur cet appareil</span></div><div class="pa-live-agent"><div class="pa-live-avatar">AS</div><div><b>Analyste stratégique privé</b><span>Analyse les risques • cite les passages • signale les incertitudes</span></div></div><div class="pa-live-field"><b>Instruction</b><small>Répondre uniquement à partir des documents du projet et toujours citer les références.</small></div><span class="pa-live-primary">Activer l’agent</span></div>`
      },
      {
        nav:'Documents', n:'04', title:'Chargez un document top confidentiel', sub:'PrivatAI l’indexe localement pour pouvoir l’interroger.',
        html:`<div class="pa-live-card"><div class="pa-live-card-top"><strong>Documents du projet</strong><span class="pa-live-local">Indexation locale</span></div><div class="pa-live-file"><div class="pa-live-file-icon">PDF</div><div><b>Projet_Atlas_TOP_SECRET.pdf</b><small>86 pages • 18,4 Mo • stocké localement</small></div><span class="pa-live-secret">TOP SECRET</span></div><div class="pa-live-progress"><i></i></div><div class="pa-live-field"><b>Le document ne quitte pas l’ordinateur</b><small>Découpage, indexation sémantique et recherche réalisés localement.</small></div></div>`
      },
      {
        nav:'Discussion', n:'05', title:'Posez une question sur le document', sub:'Interrogez le dossier comme avec un analyste métier.',
        html:`<div class="pa-live-card"><div class="pa-live-card-top"><strong>Chat du projet</strong><span class="pa-live-local">Hors ligne</span></div><div class="pa-live-chat"><div class="pa-live-bubble user">Identifie les 5 risques critiques, explique leur impact et cite les pages qui justifient chaque conclusion.</div><div class="pa-live-bubble ai">Recherche locale dans <b>Projet_Atlas_TOP_SECRET.pdf</b>…</div></div><div class="pa-live-progress"><i></i></div></div>`
      },
      {
        nav:'Discussion', n:'06', title:'Recevez une réponse sourcée', sub:'Le modèle local répond à partir des passages trouvés dans votre dossier.',
        html:`<div class="pa-live-card"><div class="pa-live-card-top"><strong>Réponse PrivatAI</strong><span class="pa-live-local">100% local</span></div><div class="pa-live-chat"><div class="pa-live-bubble ai" style="max-width:100%"><b>1. Dépendance fournisseur — risque élevé.</b><br>Trois composants critiques reposent sur un fournisseur unique, sans alternative contractuelle immédiate.<div class="pa-live-cites"><span>p. 18</span><span>p. 34–35</span><span>p. 62</span></div></div><div class="pa-live-bubble ai" style="max-width:100%"><b>2. Calendrier — risque élevé.</b><br>Deux jalons structurants disposent de moins de dix jours de marge.<div class="pa-live-cites"><span>p. 41</span><span>p. 47</span></div></div></div></div>`
      },
      {
        nav:'Documents', n:'07', title:'Générez votre rapport professionnel', sub:'Transformez l’analyse en livrable prêt à télécharger.',
        html:`<div class="pa-live-card"><div class="pa-live-card-top"><strong>Studio Documents</strong><span class="pa-live-local">Généré localement</span></div><div class="pa-live-export"><div class="pa-live-export-icon">DOCX</div><div><b>Rapport_confidentiel_Atlas.docx</b><small>Synthèse • risques • références • recommandations</small></div><span class="pa-live-download">Télécharger</span></div><div class="pa-live-field"><b>Formats disponibles</b><small>Word .docx • PDF • HTML • Markdown — enregistrés sur votre ordinateur.</small></div></div>`
      }
    ];

    device.innerHTML = `
      <div class="pa-live" aria-label="Démonstration animée de PrivatAI" aria-live="polite">
        <div class="pa-live-bar"><i class="pa-live-dot r"></i><i class="pa-live-dot y"></i><i class="pa-live-dot g"></i><span class="pa-live-name">PrivatAI</span><span class="pa-live-badge"><i></i> Démo live • traitement local</span></div>
        <div class="pa-live-layout">
          <aside class="pa-live-side"><div class="pa-live-logo">◈ PrivatAI</div><div class="pa-live-nav"><span data-live-nav="Accueil">Accueil</span><span data-live-nav="Projets">Projets</span><span data-live-nav="Agents">Agents</span><span data-live-nav="Documents">Documents</span><span data-live-nav="Discussion">Discussion</span></div></aside>
          <section class="pa-live-main">
            <div class="pa-live-stage-head"><span class="pa-live-step">01</span><div><h3>Ouvrez PrivatAI</h3><p>Votre espace IA démarre directement sur votre ordinateur.</p></div></div>
            <div class="pa-live-canvas"><div data-live-scene></div><div class="pa-live-caption"><i></i> Aucun document envoyé dans le cloud</div></div>
            <div class="pa-live-footer"><div class="pa-live-points" aria-label="Étapes de la démonstration"></div><button class="pa-live-control" type="button">Pause</button></div>
          </section>
        </div>
      </div>`;

    const sceneHost = device.querySelector('[data-live-scene]');
    const stepEl = device.querySelector('.pa-live-step');
    const titleEl = device.querySelector('.pa-live-stage-head h3');
    const subEl = device.querySelector('.pa-live-stage-head p');
    const navEls = [...device.querySelectorAll('[data-live-nav]')];
    const points = device.querySelector('.pa-live-points');
    const control = device.querySelector('.pa-live-control');
    let current = 0;
    let paused = false;
    let timer = null;

    scenes.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Voir l’étape ${i + 1}`);
      b.addEventListener('click', () => { current = i; render(true); });
      points.appendChild(b);
    });
    const pointEls = [...points.children];

    const render = (manual = false) => {
      const s = scenes[current];
      stepEl.textContent = s.n;
      titleEl.textContent = s.title;
      subEl.textContent = s.sub;
      sceneHost.innerHTML = s.html;
      navEls.forEach((el) => el.classList.toggle('active', el.dataset.liveNav === s.nav));
      pointEls.forEach((el, i) => el.classList.toggle('active', i === current));
      if (manual && !paused) schedule();
    };

    const schedule = () => {
      clearTimeout(timer);
      if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      timer = setTimeout(() => {
        current = (current + 1) % scenes.length;
        render();
        schedule();
      }, 3600);
    };

    control.addEventListener('click', () => {
      paused = !paused;
      control.textContent = paused ? 'Reprendre' : 'Pause';
      if (paused) clearTimeout(timer); else schedule();
    });
    device.addEventListener('mouseenter', () => { if (!paused) clearTimeout(timer); });
    device.addEventListener('mouseleave', () => { if (!paused) schedule(); });

    render();
    schedule();
  }

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;

  document.querySelectorAll('.pa-reveal').forEach((el) => {
    if (observer) observer.observe(el); else el.classList.add('visible');
  });

  const navLinks = [...document.querySelectorAll('.pa-links a')];
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const updateActiveNav = () => {
    const y = window.scrollY + 130;
    let currentId = '';
    sections.forEach((section) => { if (section.offsetTop <= y) currentId = `#${section.id}`; });
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === currentId));
  };
  updateActiveNav();
  window.addEventListener('scroll', updateActiveNav, { passive: true });
})();