(() => {
  'use strict';

  const MESSAGES_KEY = 'botbj_apresbacia_clone_messages_v2';
  const COLLAPSED_KEY = 'botbj_apresbacia_tools_collapsed_v2_16';

  function injectStyles() {
    if (document.getElementById('apresbacHotfix2163Styles')) return;

    const style = document.createElement('style');
    style.id = 'apresbacHotfix2163Styles';
    style.textContent = `
      /* La spécificité corrige le display:grid!important du thème V2.16. */
      #toolsGrid.hidden {
        display: none !important;
      }

      .section-head {
        flex-wrap: wrap !important;
      }

      .reset-chat-btn {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 8px 13px;
        border: 1px solid #cbd9fb;
        border-radius: 999px;
        color: #1f4fd0;
        background: #f3f6ff;
        font-weight: 900;
        white-space: nowrap;
        box-shadow: 0 7px 16px rgba(47, 102, 235, .10);
      }

      .reset-chat-btn:active {
        transform: scale(.97);
      }

      .reset-chat-btn .reset-chat-icon {
        font-size: 16px;
        line-height: 1;
      }

      @media (max-width: 520px) {
        .section-head .spacer {
          display: none;
        }

        .section-head {
          display: grid !important;
          grid-template-columns: auto minmax(0, 1fr) auto auto;
          gap: 7px !important;
        }

        .reset-chat-btn,
        .collapse-btn {
          min-height: 38px !important;
          padding: 7px 10px !important;
          font-size: 12px !important;
        }

        .reset-chat-btn .reset-chat-label {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function updateCollapseUi(collapsed) {
    const grid = document.getElementById('toolsGrid');
    const button = document.getElementById('collapseButton');
    const label = document.getElementById('collapseText');
    const arrow = button?.querySelector('span:last-child');

    grid?.classList.toggle('hidden', collapsed);

    if (label) {
      label.textContent = collapsed ? 'Développer' : 'Réduire';
    }

    if (arrow) {
      arrow.textContent = collapsed ? '⌄' : '⌃';
    }

    if (button) {
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute(
        'aria-label',
        collapsed ? 'Développer les outils AprèsBac' : 'Réduire les outils AprèsBac',
      );
    }

    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }

  function installCollapseControl() {
    const button = document.getElementById('collapseButton');
    const grid = document.getElementById('toolsGrid');

    if (!button || !grid || button.dataset.hotfix2163 === '1') return;

    button.dataset.hotfix2163 = '1';

    const remembered = localStorage.getItem(COLLAPSED_KEY) === '1';
    updateCollapseUi(remembered);

    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const collapsed = !grid.classList.contains('hidden');
        updateCollapseUi(collapsed);
      },
      true,
    );
  }

  function hasConversation() {
    try {
      const messages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
      return Array.isArray(messages) && messages.length > 0;
    } catch (_) {
      return Boolean(localStorage.getItem(MESSAGES_KEY));
    }
  }

  function resetChat() {
    if (
      hasConversation() &&
      !window.confirm(
        'Effacer tout l’historique de discussion et commencer une nouvelle conversation ?',
      )
    ) {
      return;
    }

    localStorage.removeItem(MESSAGES_KEY);

    const messages = document.getElementById('messages');
    if (messages) messages.innerHTML = '';

    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = 'Nouvelle conversation prête.';
      toast.classList.add('show');
    }

    window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('chat', 'nouveau');
      url.searchParams.set('v', '2.16.3');
      window.location.replace(url.toString());
    }, 320);
  }

  function installResetChatButton() {
    if (document.getElementById('resetChatButton')) return;

    const collapseButton = document.getElementById('collapseButton');
    const sectionHead = collapseButton?.closest('.section-head');
    if (!collapseButton || !sectionHead) return;

    const button = document.createElement('button');
    button.id = 'resetChatButton';
    button.className = 'reset-chat-btn';
    button.type = 'button';
    button.setAttribute('aria-label', 'Effacer l’historique et commencer un nouveau chat');
    button.title = 'Effacer uniquement les discussions. Les notes et la série sont conservées.';
    button.innerHTML = `
      <span class="reset-chat-icon" aria-hidden="true">↺</span>
      <span class="reset-chat-label">Nouveau chat</span>
    `;

    button.addEventListener('click', resetChat);
    sectionHead.insertBefore(button, collapseButton);
  }

  function start() {
    injectStyles();
    installCollapseControl();
    installResetChatButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.__APRESBAC_HOTFIX_V2_16_3__ = {
    resetChat,
    updateCollapseUi,
  };
})();
