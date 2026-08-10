(() => {
  const isPrivatAILanding = /^\/privatia\/?$/.test(window.location.pathname);
  const hasExplicitAnchor = Boolean(window.location.hash && window.location.hash !== '#top');

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  const showDefaultHero = () => {
    if (!isPrivatAILanding || hasExplicitAnchor) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  // Empêche le navigateur de restaurer une ancienne position de défilement
  // lorsque l'utilisateur ouvre simplement https://bot.bj/privatia.
  showDefaultHero();
  requestAnimationFrame(showDefaultHero);
  window.addEventListener('DOMContentLoaded', showDefaultHero, { once: true });
  window.addEventListener('load', showDefaultHero, { once: true });
  window.addEventListener('pageshow', showDefaultHero);

  const normalizeBrandHome = () => {
    const brand = document.querySelector('.pa-brand');
    if (!brand) return;

    brand.setAttribute('href', '/privatia');
    brand.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      history.replaceState(null, '', '/privatia');
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizeBrandHome, { once: true });
  } else {
    normalizeBrandHome();
  }
})();
