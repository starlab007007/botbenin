(() => {
  const root = document.querySelector('.pa-page');
  const themeButton = document.querySelector('.pa-theme');
  const systemLabel = document.getElementById('systemLabel');
  const mirrors = document.querySelectorAll('.systemLabelMirror');
  const platformButtons = document.querySelectorAll('[data-platform]');
  const year = document.getElementById('year');

  // Téléchargements strictement same-origin : le navigateur reste sur bot.bj.
  // Les binaires sont synchronisés côté serveur puis servis par bot.bj.
  const WINDOWS_DOWNLOAD = '/privatia/downloads/PrivatAI-Windows-x64-Setup.exe';
  const WINDOWS_MSI_DOWNLOAD = '/privatia/downloads/PrivatAI-Windows-x64.msi';
  const MAC_DOWNLOAD = '/privatia/downloads/PrivatAI-Mac-Intel.dmg';

  if (year) year.textContent = String(new Date().getFullYear());

  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  const savedTheme = localStorage.getItem('privatai-theme');
  const initialTheme = savedTheme || getSystemTheme();

  const applyTheme = (theme) => {
    const dark = theme === 'dark';
    if (dark) root?.setAttribute('data-theme', 'dark');
    else root?.removeAttribute('data-theme');
    themeButton?.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeButton?.setAttribute('aria-label', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
  };

  applyTheme(initialTheme);

  themeButton?.addEventListener('click', () => {
    const isDark = root?.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('privatai-theme', next);
  });

  const detectPlatform = () => {
    const uaData = navigator.userAgentData;
    const uaPlatform = uaData?.platform || navigator.platform || '';
    const ua = `${navigator.userAgent || ''} ${uaPlatform}`.toLowerCase();
    if (ua.includes('windows') || ua.includes('win32') || ua.includes('win64') || ua.includes('win')) return 'windows';
    if (ua.includes('macintosh') || ua.includes('macintel') || ua.includes('mac os') || ua.includes('mac')) return 'mac';
    return 'other';
  };

  const detected = detectPlatform();
  const labels = {
    windows: 'Windows détecté automatiquement',
    mac: 'Mac détecté automatiquement',
    other: 'Choisissez votre système',
  };

  if (systemLabel) systemLabel.textContent = labels[detected];
  mirrors.forEach((el) => {
    el.textContent = labels[detected];
  });

  const installMacGuide = () => {
    if (document.getElementById('pa-mac-guide')) {
      return document.getElementById('pa-mac-guide');
    }

    const style = document.createElement('style');
    style.id = 'pa-mac-guide-style';
    style.textContent = `
      .pa-mac-help-row{margin:12px 0 0;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;color:var(--muted);font-size:11px;line-height:1.45}
      .pa-mac-help-row[hidden]{display:none!important}
      .pa-mac-help-row button{appearance:none;border:0;background:transparent;color:var(--violet);font:inherit;font-weight:800;cursor:pointer;padding:3px 4px;border-radius:7px}
      .pa-mac-help-row button:hover,.pa-mac-help-row button:focus-visible{background:var(--violet-soft);outline:none}
      .pa-mac-guide{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(15,23,42,.48);backdrop-filter:blur(8px)}
      .pa-mac-guide.open{display:flex}
      .pa-mac-guide-card{width:min(620px,100%);max-height:min(760px,calc(100vh - 44px));overflow:auto;border:1px solid var(--line);border-radius:24px;background:var(--surface);color:var(--ink);box-shadow:0 32px 90px rgba(15,23,42,.28);transform:translateY(8px) scale(.985);opacity:0;transition:transform .18s ease,opacity .18s ease}
      .pa-mac-guide.open .pa-mac-guide-card{transform:none;opacity:1}
      .pa-mac-guide-head{position:sticky;top:0;z-index:2;padding:22px 24px 18px;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(16px)}
      .pa-mac-guide-logo{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:var(--violet-soft);color:var(--violet)}
      .pa-mac-guide-logo svg{width:26px;height:26px;fill:currentColor}
      .pa-mac-guide-title{margin:0;font-size:20px;letter-spacing:-.035em}
      .pa-mac-guide-sub{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
      .pa-mac-guide-close{width:36px;height:36px;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--muted);font-size:21px;line-height:1;cursor:pointer}
      .pa-mac-guide-body{padding:24px}
      .pa-mac-download-state{margin:0 0 18px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;border:1px solid color-mix(in srgb,var(--green) 35%,var(--line));border-radius:14px;background:var(--green-soft);color:var(--ink)}
      .pa-mac-download-state strong{display:block;font-size:12px}.pa-mac-download-state span{display:block;margin-top:2px;color:var(--muted);font-size:11px;line-height:1.45}
      .pa-mac-download-state i{width:9px;height:9px;margin-top:4px;flex:none;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px color-mix(in srgb,var(--green) 15%,transparent)}
      .pa-mac-steps{display:grid;gap:10px;counter-reset:macsteps}
      .pa-mac-step{counter-increment:macsteps;padding:15px 16px;display:grid;grid-template-columns:34px 1fr;gap:12px;border:1px solid var(--line);border-radius:15px;background:var(--surface-soft)}
      .pa-mac-step:before{content:counter(macsteps);width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:var(--violet-soft);color:var(--violet);font-size:12px;font-weight:900}
      .pa-mac-step h4{margin:1px 0 4px;font-size:13px}.pa-mac-step p{margin:0;color:var(--muted);font-size:11px;line-height:1.55}
      .pa-mac-path{display:inline-flex;margin-top:6px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font-size:10px;font-weight:750}
      .pa-mac-note{margin-top:16px;padding:14px 15px;border:1px solid color-mix(in srgb,#f59e0b 35%,var(--line));border-radius:14px;background:color-mix(in srgb,#f59e0b 7%,var(--surface));color:var(--muted);font-size:11px;line-height:1.55}
      .pa-mac-note strong{color:var(--ink)}
      .pa-mac-security{margin-top:12px;padding:13px 15px;display:flex;gap:10px;border:1px solid color-mix(in srgb,var(--green) 32%,var(--line));border-radius:14px;background:color-mix(in srgb,var(--green) 6%,var(--surface));color:var(--muted);font-size:11px;line-height:1.55}
      .pa-mac-security svg{width:18px;height:18px;flex:none;color:var(--green);fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .pa-mac-guide-actions{padding:0 24px 24px;display:flex;justify-content:flex-end;gap:10px}
      .pa-mac-guide-actions button{min-height:42px;padding:0 17px;border-radius:11px;font-size:12px;font-weight:800;cursor:pointer}
      .pa-mac-copy{border:1px solid var(--line);background:var(--surface);color:var(--ink)}
      .pa-mac-done{border:0;background:linear-gradient(135deg,#6754ee,#5540d4);color:#fff}
      .pa-page[data-theme="dark"] .pa-mac-guide{background:rgba(0,0,0,.64)}
      @media(max-width:640px){.pa-mac-guide{padding:10px;align-items:flex-end}.pa-mac-guide-card{max-height:88vh;border-radius:22px 22px 16px 16px}.pa-mac-guide-head{padding:18px}.pa-mac-guide-body{padding:18px}.pa-mac-guide-actions{padding:0 18px 18px}.pa-mac-guide-title{font-size:18px}}
    `;
    document.head.appendChild(style);

    const guide = document.createElement('div');
    guide.className = 'pa-mac-guide';
    guide.id = 'pa-mac-guide';
    guide.setAttribute('role', 'dialog');
    guide.setAttribute('aria-modal', 'true');
    guide.setAttribute('aria-labelledby', 'pa-mac-guide-title');
    guide.innerHTML = `
      <div class="pa-mac-guide-card" role="document">
        <div class="pa-mac-guide-head">
          <div class="pa-mac-guide-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.72 2.45-3.05 2.47-1.31.03-1.73-.78-3.23-.78-1.5 0-1.97.76-3.2.81-1.28.05-2.25-1.32-3.09-2.55-1.71-2.48-3.02-7.01-1.26-10.07.87-1.52 2.47-2.48 4.19-2.5 1.3-.03 2.52.88 3.23.88.68 0 2.11-1.09 3.56-.93.61.03 2.32.24 3.42 1.85-.09.06-2.04 1.2-2.02 3.61.03 2.87 2.51 3.83 2.54 3.84-.02.07-.4 1.38-1.31 2.77M13.7 5.71c.7-.83 1.81-1.46 2.79-1.5.13 1.15-.3 2.31-.97 3.15-.66.84-1.74 1.49-2.81 1.41-.15-1.13.39-2.32.99-3.06Z"/></svg>
          </div>
          <div>
            <h3 class="pa-mac-guide-title" id="pa-mac-guide-title">Installer PrivatAI sur Mac</h3>
            <p class="pa-mac-guide-sub">Guide officiel pour la version Mac distribuée directement depuis BOT.BJ.</p>
          </div>
          <button class="pa-mac-guide-close" type="button" aria-label="Fermer le guide">×</button>
        </div>
        <div class="pa-mac-guide-body">
          <div class="pa-mac-download-state">
            <i aria-hidden="true"></i>
            <div><strong>Téléchargement direct depuis bot.bj</strong><span>Le fichier PrivatAI-Mac-Intel.dmg est téléchargé sans ouvrir GitHub.</span></div>
          </div>
          <div class="pa-mac-steps">
            <article class="pa-mac-step"><div><h4>Ouvrez le fichier DMG</h4><p>Dans Téléchargements, ouvrez <strong>PrivatAI-Mac-Intel.dmg</strong>.</p></div></article>
            <article class="pa-mac-step"><div><h4>Installez PrivatAI</h4><p>Glissez <strong>PrivatAI.app</strong> dans le dossier <strong>Applications</strong>, puis ouvrez PrivatAI depuis Applications.</p></div></article>
            <article class="pa-mac-step"><div><h4>Si macOS bloque la première ouverture</h4><p>Fermez le message, puis ouvrez les réglages de sécurité du Mac.</p><span class="pa-mac-path">Réglages Système → Confidentialité et sécurité</span></div></article>
            <article class="pa-mac-step"><div><h4>Autorisez uniquement PrivatAI</h4><p>Dans la section Sécurité, cliquez sur <strong>Ouvrir quand même</strong> pour PrivatAI. macOS peut demander votre mot de passe ou Touch ID.</p></div></article>
            <article class="pa-mac-step"><div><h4>Confirmez l’ouverture</h4><p>Relancez PrivatAI puis confirmez <strong>Ouvrir</strong>. Cette autorisation concerne PrivatAI uniquement.</p></div></article>
          </div>
          <div class="pa-mac-note"><strong>Pourquoi macOS affiche-t-il ce contrôle ?</strong><br>La version actuelle est distribuée hors Mac App Store avec une signature ad-hoc et n’est pas encore notarialisée par Apple. Ce message signifie qu’Apple ne peut pas confirmer l’identité du développeur pour cette version ; il ne signifie pas qu’Apple a détecté un logiciel malveillant.</div>
          <div class="pa-mac-security">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-4"/></svg>
            <div><strong>La sécurité du Mac reste activée.</strong><br>PrivatAI ne vous demande pas de désactiver Gatekeeper, de modifier les protections globales de macOS ni d’exécuter une commande Terminal.</div>
          </div>
        </div>
        <div class="pa-mac-guide-actions">
          <button class="pa-mac-copy" type="button">Copier les étapes</button>
          <button class="pa-mac-done" type="button">J’ai compris</button>
        </div>
      </div>
    `;
    document.body.appendChild(guide);

    const closeGuide = () => {
      guide.classList.remove('open');
      document.body.style.removeProperty('overflow');
      window.setTimeout(() => guide.setAttribute('aria-hidden', 'true'), 180);
    };

    guide.querySelector('.pa-mac-guide-close')?.addEventListener('click', closeGuide);
    guide.querySelector('.pa-mac-done')?.addEventListener('click', closeGuide);
    guide.addEventListener('click', (event) => {
      if (event.target === guide) closeGuide();
    });

    guide.querySelector('.pa-mac-copy')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const instructions = [
        'Installation PrivatAI sur Mac',
        '1. Ouvrez PrivatAI-Mac-Intel.dmg depuis Téléchargements.',
        '2. Glissez PrivatAI.app dans Applications.',
        '3. Ouvrez PrivatAI depuis Applications.',
        '4. Si macOS bloque l’ouverture : Réglages Système → Confidentialité et sécurité.',
        '5. Cliquez sur Ouvrir quand même pour PrivatAI, authentifiez-vous puis confirmez Ouvrir.',
        'Aucune désactivation de Gatekeeper ni commande Terminal n’est nécessaire.',
      ].join('\n');
      try {
        await navigator.clipboard.writeText(instructions);
        button.textContent = 'Étapes copiées ✓';
        window.setTimeout(() => { button.textContent = 'Copier les étapes'; }, 1800);
      } catch {
        button.textContent = 'Copie indisponible';
        window.setTimeout(() => { button.textContent = 'Copier les étapes'; }, 1800);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && guide.classList.contains('open')) closeGuide();
    });

    return guide;
  };

  const macGuide = installMacGuide();

  const openMacGuide = (downloadStarted = false) => {
    macGuide.removeAttribute('aria-hidden');
    const state = macGuide.querySelector('.pa-mac-download-state span');
    if (state) {
      state.textContent = downloadStarted
        ? 'Le téléchargement du fichier PrivatAI-Mac-Intel.dmg a été lancé directement depuis bot.bj.'
        : 'Le fichier PrivatAI-Mac-Intel.dmg sera téléchargé directement depuis bot.bj.';
    }
    macGuide.classList.add('open');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => macGuide.querySelector('.pa-mac-guide-close')?.focus(), 60);
  };

  document.querySelectorAll('.pa-download-zone').forEach((zone) => {
    if (zone.querySelector('.pa-mac-help-row')) return;
    const help = document.createElement('div');
    help.className = 'pa-mac-help-row';
    help.hidden = detected !== 'mac';
    help.innerHTML = '<span>Première installation sur Mac ?</span><button type="button">Voir le guide d’installation</button>';
    help.querySelector('button')?.addEventListener('click', () => openMacGuide(false));
    zone.appendChild(help);
  });

  // La version publique macOS actuelle est un DMG Intel.
  document.querySelectorAll('.pa-download.pa-mac strong').forEach((label) => {
    label.textContent = 'pour Mac (Intel)';
  });

  const configureDirectDownload = (button, url, fileName, options = {}) => {
    button.removeAttribute('target');
    button.removeAttribute('rel');
    button.setAttribute('href', url);
    button.setAttribute('download', fileName);
    button.dataset.downloadName = fileName;

    button.addEventListener('click', () => {
      const small = button.querySelector('small');
      const original = small?.textContent || '';
      button.setAttribute('aria-busy', 'true');
      button.classList.add('downloading');
      if (small) small.textContent = 'Téléchargement…';

      if (options.showMacGuide) {
        window.setTimeout(() => openMacGuide(true), 650);
      }

      window.setTimeout(() => {
        if (small) small.textContent = original || 'Télécharger';
        button.removeAttribute('aria-busy');
        button.classList.remove('downloading');
      }, 2200);
    });
  };

  platformButtons.forEach((button) => {
    const platform = button.getAttribute('data-platform');
    const recommended = platform === detected;
    button.classList.toggle('recommended', recommended);
    button.setAttribute('aria-label', `${button.textContent.trim()}${recommended ? ' — recommandé pour cet appareil' : ''}`);
    if (platform === 'windows') configureDirectDownload(button, WINDOWS_DOWNLOAD, 'PrivatAI-Windows-x64-Setup.exe');
    if (platform === 'mac') configureDirectDownload(button, MAC_DOWNLOAD, 'PrivatAI-Mac-Intel.dmg', { showMacGuide: true });
  });

  document.querySelectorAll('.pa-other').forEach((link) => {
    link.innerHTML = 'Windows MSI direct <span>→</span>';
    link.setAttribute('aria-label', 'Télécharger directement PrivatAI pour Windows au format MSI');
    configureDirectDownload(link, WINDOWS_MSI_DOWNLOAD, 'PrivatAI-Windows-x64.msi');
  });

  // Aucun lien de téléchargement ne doit conduire vers une page GitHub.
  document.querySelectorAll('a[href*="github.com"]').forEach((link) => {
    if (link.matches('[data-platform], .pa-other')) return;
    if (link.closest('.pa-footer')) {
      link.setAttribute('href', 'https://bot.bj');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.textContent = 'BOT.BJ ↗';
    }
  });

  root?.setAttribute('data-detected-platform', detected);

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 },
      )
    : null;

  document.querySelectorAll('.pa-reveal').forEach((el) => {
    if (observer) observer.observe(el);
    else el.classList.add('visible');
  });

  const navLinks = [...document.querySelectorAll('.pa-links a')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const updateActiveNav = () => {
    const y = window.scrollY + 130;
    let currentId = '';
    sections.forEach((section) => {
      if (section.offsetTop <= y) currentId = `#${section.id}`;
    });
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === currentId);
    });
  };

  updateActiveNav();
  window.addEventListener('scroll', updateActiveNav, { passive: true });
})();
