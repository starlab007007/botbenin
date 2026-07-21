(() => {
  'use strict';

  const MESSAGES_KEY = 'botbj_apresbacia_clone_messages_v2';
  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';
  const COLLAPSED_KEY = 'botbj_apresbacia_tools_collapsed_v2_16';

  const personalizedTools = new Set([
    'profile',
    'recommendations',
    'eligibility',
    'ranking',
  ]);

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function notesCount() {
    const notes = readJson(NOTES_KEY, []);
    return Array.isArray(notes) ? notes.length : 0;
  }

  function currentSeries() {
    const select = document.getElementById('seriesSelect');
    return select && select.value !== 'Toutes' ? select.value : null;
  }

  function buildResetModal() {
    if (document.getElementById('abResetModal')) return;
    const modal = document.createElement('div');
    modal.id = 'abResetModal';
    modal.className = 'modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="sheet">
        <div class="sheet-head">
          <h2>Réinitialiser AprèsBac IA</h2>
          <button class="close" type="button" data-ab-close="abResetModal" aria-label="Fermer">×</button>
        </div>
        <div class="ab-reset-intro">
          <strong>Reprendre librement votre orientation</strong>
          <span>Choisissez uniquement les informations à effacer sur cet appareil.</span>
        </div>
        <div class="ab-reset-grid">
          <button type="button" class="ab-reset-option" data-ab-reset="chat">
            <span class="ab-reset-icon">💬</span>
            <span><strong>Nouvelle conversation</strong><small>Effacer toutes les discussions et démarrer un nouveau chat.</small></span>
          </button>
          <button type="button" class="ab-reset-option" data-ab-reset="notes">
            <span class="ab-reset-icon">📊</span>
            <span><strong>Réinitialiser mes notes</strong><small>Supprimer les notes saisies manuellement ou importées par OCR.</small></span>
          </button>
          <button type="button" class="ab-reset-option danger" data-ab-reset="all">
            <span class="ab-reset-icon">↺</span>
            <span><strong>Tout reprendre à zéro</strong><small>Effacer discussions, notes, série et préférences locales.</small></span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function reset(scope) {
    if (scope === 'chat' || scope === 'all') localStorage.removeItem(MESSAGES_KEY);
    if (scope === 'notes' || scope === 'all') localStorage.removeItem(NOTES_KEY);
    if (scope === 'all') {
      localStorage.removeItem(SERIES_KEY);
      localStorage.removeItem(COLLAPSED_KEY);
    }
    closeModal(document.getElementById('abResetModal'));
    const labels = {
      chat: 'Nouvelle conversation prête.',
      notes: 'Toutes les notes ont été supprimées.',
      all: 'AprèsBac IA a été entièrement réinitialisé.',
    };
    showToast(labels[scope] || 'Réinitialisation terminée.');
    setTimeout(() => location.reload(), 320);
  }

  function updateToolStates() {
    const count = notesCount();
    const series = currentSeries();
    document.querySelectorAll('.tool[data-tool]').forEach((tool) => {
      const action = tool.dataset.tool;
      let meta = tool.querySelector('.tool-meta');
      if (!meta) {
        meta = document.createElement('span');
        meta.className = 'tool-meta';
        tool.appendChild(meta);
      }
      tool.classList.remove('ab-ready', 'ab-needs-data');
      if (action === 'notes') {
        meta.textContent = count ? `${count} note${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''}` : 'Saisie intelligente';
        return;
      }
      if (action === 'scan') {
        meta.textContent = 'Photo + OCR';
        return;
      }
      if (personalizedTools.has(action)) {
        if (!count) {
          tool.classList.add('ab-needs-data');
          meta.textContent = 'Notes recommandées';
        } else {
          tool.classList.add('ab-ready');
          meta.textContent = `${count} note${count > 1 ? 's' : ''} prête${count > 1 ? 's' : ''}`;
        }
        return;
      }
      if (action === 'universities') {
        meta.textContent = series ? `Série ${series}` : 'Toutes les séries';
        return;
      }
      if (action === 'explore') meta.textContent = series ? `Catalogue filtré : ${series}` : 'Catalogue public';
    });
  }

  function restoreCollapsedState() {
    if (localStorage.getItem(COLLAPSED_KEY) !== '1') return;
    document.getElementById('toolsGrid')?.classList.add('hidden');
    const label = document.getElementById('collapseText');
    if (label) label.textContent = 'Afficher';
    const arrow = document.querySelector('#collapseButton span:last-child');
    if (arrow) arrow.textContent = '⌄';
  }

  function improveHeader() {
    document.getElementById('backButton')?.setAttribute('aria-hidden', 'true');
    const clear = document.getElementById('clearButton');
    if (clear) {
      clear.setAttribute('aria-label', 'Réinitialiser');
      clear.setAttribute('title', 'Nouvelle conversation, notes ou remise à zéro');
    }
    document.querySelector('.bottom-nav')?.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', (event) => {
    const clear = event.target.closest('#clearButton');
    if (clear) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openModal(document.getElementById('abResetModal'));
      return;
    }
    const resetButton = event.target.closest('[data-ab-reset]');
    if (resetButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      reset(resetButton.dataset.abReset);
      return;
    }
    const closeButton = event.target.closest('[data-ab-close]');
    if (closeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeModal(document.getElementById(closeButton.dataset.abClose));
      return;
    }
    const collapse = event.target.closest('#collapseButton');
    if (collapse) {
      setTimeout(() => {
        const collapsed = document.getElementById('toolsGrid')?.classList.contains('hidden');
        localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
      }, 0);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    buildResetModal();
    improveHeader();
    restoreCollapsedState();
    updateToolStates();
    const notes = document.getElementById('notesCount');
    if (notes && 'MutationObserver' in window) {
      const observer = new MutationObserver(updateToolStates);
      observer.observe(notes, { childList: true, characterData: true, subtree: true });
    }
    document.getElementById('seriesSelect')?.addEventListener('change', updateToolStates);
    document.querySelectorAll('.suggestion').forEach((button) => button.setAttribute('title', button.textContent.trim()));
  });

  window.__APRESBAC_V2_16__ = {
    resetChat: () => reset('chat'),
    resetNotes: () => reset('notes'),
    resetAll: () => reset('all'),
    updateToolStates,
  };
})();
