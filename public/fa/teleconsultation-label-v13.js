(() => {
  'use strict';

  const STYLE_ID = 'fa-teleconsultation-label-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .compact-card h3.fa-teleconsultation-title {
        font-size: 20px;
        line-height: 1.08;
        letter-spacing: -0.35px;
        overflow-wrap: anywhere;
      }
      @media (max-width: 520px) {
        .compact-card h3.fa-teleconsultation-title {
          font-size: 18px;
          line-height: 1.08;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyLabel() {
    ensureStyle();
    document.querySelectorAll('.compact-card h3').forEach((title) => {
      if (title.textContent.trim() === 'Consulter') {
        title.textContent = 'Télé-consultation';
        title.classList.add('fa-teleconsultation-title');
      }
    });
  }

  const app = document.getElementById('app');
  if (app) {
    new MutationObserver(applyLabel).observe(app, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLabel, { once: true });
  } else {
    applyLabel();
  }
})();
