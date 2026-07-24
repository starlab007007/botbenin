(() => {
  'use strict';
  const enhance = () => {
    try {
      const hero = document.querySelector('.hero');
      if (!hero || hero.dataset.richHome === '1') return;
      const screen = hero.closest('.screen');
      if (!screen) return;
      hero.dataset.richHome = '1';
      screen.classList.add('fa-home-rich');

      const welcome = document.createElement('section');
      welcome.className = 'fa-welcome';
      welcome.innerHTML = '<h2>Bienvenue</h2><p>Le Fâ éclaire. L’IA comprend.</p>';
      screen.insertBefore(welcome, hero);

      const trust = document.createElement('div');
      trust.className = 'fa-trust-strip';
      trust.innerHTML = `
        <div><span class="fa-trust-icon">♢</span><span><strong>Authentique</strong><small>Corpus officiel</small></span></div>
        <div><span class="fa-trust-icon">✦</span><span><strong>Intelligent</strong><small>Analyses IA</small></span></div>
        <div><span class="fa-trust-icon">▣</span><span><strong>Confidentiel</strong><small>Journal privé</small></span></div>`;
      hero.insertAdjacentElement('afterend', trust);

      const primary = hero.querySelector('.primary');
      if (primary) {
        primary.innerHTML = '<span class="fa-cta-symbol">✦</span><span class="fa-cta-copy"><strong>Lancer le Fâ</strong><small>8 cauris · 1 signe</small></span><span class="fa-cta-arrow">›</span>';
      }

      const cards = screen.querySelectorAll('.actions-grid .compact-card');
      if (cards[0]) {
        const title = cards[0].querySelector('h3');
        if (title) title.textContent = 'Télé-consultation';
        cards[0].insertAdjacentHTML('beforeend','<span class="fa-card-tag green">Guidé pas à pas</span>');
      }
      if (cards[1]) cards[1].insertAdjacentHTML('beforeend','<span class="fa-card-tag gold">Historique & suivi</span>');

      const hint = screen.querySelector('.hint-card');
      if (hint) hint.innerHTML = '<span>✦</span><span>Concentrez-vous. Laissez la chaîne parler.</span>';
    } catch (error) {
      console.warn('FA home enhancement skipped', error);
    }
  };

  const app = document.getElementById('app');
  if (!app) return;
  const observer = new MutationObserver(enhance);
  observer.observe(app, { childList: true, subtree: true });
  enhance();
})();
