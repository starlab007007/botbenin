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

  const configureDirectDownload = (button, url, fileName) => {
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
    if (platform === 'mac') configureDirectDownload(button, MAC_DOWNLOAD, 'PrivatAI-Mac-Intel.dmg');
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
