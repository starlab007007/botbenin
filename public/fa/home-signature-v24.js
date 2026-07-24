(() => {
  'use strict';

  const STYLE_ID = 'fa-home-signature-v24-style';

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .home-signature-v24 {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        margin-top: auto;
        padding: 6px 0 2px;
        text-align: center;
        font-size: 11px;
        line-height: 1.15;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: rgba(244, 224, 190, 0.62);
      }
    `;
    document.head.appendChild(style);
  };

  const moveSignature = () => {
    const screen = document.querySelector('.screen');
    const heroTitle = screen?.querySelector('.hero-title');
    if (!screen || !heroTitle) return;

    const normalized = heroTitle.textContent.replace(/\s+/g, ' ').trim();
    if (normalized !== 'Une intention. Un lancer. Un message.') return;

    heroTitle.remove();

    if (!screen.querySelector('.home-signature-v24')) {
      const signature = document.createElement('div');
      signature.className = 'home-signature-v24';
      signature.setAttribute('aria-label', 'Une intention. Un lancer. Un message.');
      signature.innerHTML = '<span>Une intention.</span><span>Un lancer.</span><span>Un message.</span>';
      screen.appendChild(signature);
    }
  };

  ensureStyle();

  const app = document.getElementById('app');
  if (!app) return;

  const observer = new MutationObserver(moveSignature);
  observer.observe(app, { childList: true, subtree: true });
  moveSignature();
})();
