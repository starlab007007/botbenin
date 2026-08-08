(() => {
  const root = document.querySelector('.pa-page');
  const themeButton = document.querySelector('.pa-theme');
  const systemLabel = document.getElementById('systemLabel');
  const mirrors = document.querySelectorAll('.systemLabelMirror');
  const platformButtons = document.querySelectorAll('[data-platform]');
  const year = document.getElementById('year');

  const WINDOWS_DOWNLOAD = 'https://github.com/zimesongbian007/privatai/releases';
  const MAC_DOWNLOAD = 'https://github.com/zimesongbian007/privatai/releases';

  if (year) year.textContent = String(new Date().getFullYear());

  const getSystemTheme = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

  const savedTheme = localStorage.getItem('privatai-theme');
  const initialTheme = savedTheme || getSystemTheme();
  if (initialTheme === 'dark') {
    root?.setAttribute('data-theme', 'dark');
    themeButton?.setAttribute('aria-pressed', 'true');
  }

  themeButton?.addEventListener('click', () => {
    const isDark = root?.getAttribute('data-theme') === 'dark';
    if (isDark) {
      root?.removeAttribute('data-theme');
      localStorage.setItem('privatai-theme', 'light');
      themeButton.setAttribute('aria-pressed', 'false');
    } else {
      root?.setAttribute('data-theme', 'dark');
      localStorage.setItem('privatai-theme', 'dark');
      themeButton.setAttribute('aria-pressed', 'true');
    }
  });

  const ua = `${navigator.userAgent || ''} ${navigator.platform || ''}`.toLowerCase();
  let detected = 'other';
  if (ua.includes('win')) detected = 'windows';
  else if (ua.includes('mac')) detected = 'mac';

  const labels = {
    windows: 'Windows détecté automatiquement',
    mac: 'Mac détecté automatiquement',
    other: 'Choisissez votre système',
  };

  if (systemLabel) systemLabel.textContent = labels[detected];
  mirrors.forEach((el) => {
    el.textContent = labels[detected];
  });

  platformButtons.forEach((button) => {
    const platform = button.getAttribute('data-platform');
    button.classList.toggle('recommended', platform === detected);
    if (platform === 'windows') button.setAttribute('href', WINDOWS_DOWNLOAD);
    if (platform === 'mac') button.setAttribute('href', MAC_DOWNLOAD);
  });

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