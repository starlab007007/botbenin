(() => {
  'use strict';

  const STYLE_ID = 'fa-home-signature-v24-style';
  const SIGNATURE_CLASS = 'home-signature-v24';
  const HOME_CLASS = 'fa-home-signature-active';

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HOME_CLASS} .hero-title {
        display: none !important;
      }

      .${HOME_CLASS} .hero-content {
        justify-content: flex-end !important;
      }

      .${SIGNATURE_CLASS} {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        margin: 10px auto 0;
        padding: 7px 0 1px;
        text-align: center;
        font-size: 11px;
        line-height: 1.18;
        font-weight: 600;
        letter-spacing: 0.045em;
        color: rgba(91, 62, 42, 0.58);
        user-select: none;
      }

      @media (max-width: 520px) {
        .${HOME_CLASS} .hero-content {
          bottom: 14px !important;
        }

        .${SIGNATURE_CLASS} {
          margin-top: 7px;
          padding-top: 4px;
          font-size: 9.5px;
          line-height: 1.12;
          gap: 1px;
        }
      }

      @media (max-width: 520px) and (max-height: 720px) {
        .${SIGNATURE_CLASS} {
          margin-top: 4px;
          padding-top: 2px;
          font-size: 8.5px;
        }
      }
    `;

    document.head.appendChild(style);
  };

  const updateHomeSignature = () => {
    const hero = document.querySelector('#app .screen .hero');
    if (!hero) return;

    const screen = hero.closest('.screen');
    if (!screen) return;

    screen.classList.add(HOME_CLASS);

    const heroTitle = hero.querySelector('.hero-title');
    if (heroTitle) heroTitle.remove();

    let signature = screen.querySelector(`.${SIGNATURE_CLASS}`);
    if (!signature) {
      signature = document.createElement('div');
      signature.className = SIGNATURE_CLASS;
      signature.setAttribute('aria-label', 'Une intention. Un lancer. Un message.');
      signature.innerHTML = '<span>Une intention.</span><span>Un lancer.</span><span>Un message.</span>';
      screen.appendChild(signature);
    }
  };

  ensureStyle();

  const app = document.getElementById('app');
  if (!app) return;

  const observer = new MutationObserver(updateHomeSignature);
  observer.observe(app, { childList: true, subtree: true });

  updateHomeSignature();
})();