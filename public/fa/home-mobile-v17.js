(() => {
  'use strict';
  const apply = () => {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const screen = hero.closest('.screen');
    if (screen) screen.classList.add('home-screen');
    const cards = screen?.querySelectorAll('.compact-card h3');
    if (cards?.[0] && /Télé-consultation/i.test(cards[0].textContent || '')) cards[0].textContent = 'Consulter';
  };
  const observer = new MutationObserver(apply);
  observer.observe(document.getElementById('app'), { childList: true, subtree: true });
  apply();
})();
