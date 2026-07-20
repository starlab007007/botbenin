(() => {
  'use strict';

  const FUNCTION_URL = 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-apresbac-chat';
  const MESSAGES_KEY = 'botbj_apresbacia_clone_messages_v2';
  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';
  const TOOLS_KEY = 'botbj_apresbacia_tools_collapsed_v3';
  const personalizedTools = new Set(['profile', 'recommendations', 'eligibility', 'ranking']);

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.startsWith(FUNCTION_URL)) return nativeFetch(input, init);

    const headers = new Headers(init.headers || {});
    headers.delete('x-request-id');
    headers.delete('x-region');
    headers.delete('authorization');
    headers.delete('apikey');
    headers.set('Content-Type', 'text/plain;charset=UTF-8');

    return nativeFetch(input, {
      ...init,
      headers,
      cache: 'no-store',
      credentials: 'omit',
    });
  };

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function notesCount() {
    const notes = readJson(NOTES_KEY, []);
    return Array.isArray(notes) ? notes.length : 0;
  }

  function selectedSeries() {
    const select = document.getElementById('seriesSelect');
    return select && select.value !== 'Toutes' ? select.value : null;
  }

  function openModal(modal) {
    modal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function buildResetModal() {
    if (document.getElementById('resetModal')) return;
    const modal = document.createElement('div');
    modal.id = 'resetModal';
    modal.className = 'modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="sheet reset-sheet">
        <div class="sheet-head">
          <h2>Réinitialiser AprèsBac IA</h2>
          <button class="close" type="button" data-v3-close="resetModal" aria-label="Fermer">×</button>
        </div>
        <div class="reset-hero">
          <strong>Tout reprendre en toute simplicité</strong>
          <span>Choisissez uniquement ce que vous souhaitez effacer sur cet appareil.</span>
        </div>
        <button type="button" class="reset-option" data-v3-reset="chat">
          <span class="reset-icon">💬</span>
          <span><strong>Nouvelle conversation</strong><span>Effacer les recherches et l’historique du chat.</span></span>
        </button>
        <button type="button" class="reset-option" data-v3-reset="notes">
          <span class="reset-icon">📊</span>
          <span><strong>Réinitialiser mes notes</strong><span>Supprimer les notes saisies ou importées par OCR.</span></span>
        </button>
        <button type="button" class="reset-option danger" data-v3-reset="all">
          <span class="reset-icon">↺</span>
          <span><strong>Tout reprendre à zéro</strong><span>Effacer chat, notes, série et préférences locales.</span></span>
        </button>
      </div>`;
    document.body.appendChild(modal);
  }

  function reset(scope) {
    if (scope === 'chat' || scope === 'all') localStorage.removeItem(MESSAGES_KEY);
    if (scope === 'notes' || scope === 'all') localStorage.removeItem(NOTES_KEY);
    if (scope === 'all') {
      localStorage.removeItem(SERIES_KEY);
      localStorage.removeItem(TOOLS_KEY);
    }
    closeModal(document.getElementById('resetModal'));
    showToast(scope === 'chat' ? 'Nouvelle conversation prête.' : scope === 'notes' ? 'Notes réinitialisées.' : 'AprèsBac IA a été remis à zéro.');
    setTimeout(() => location.reload(), 280);
  }

  function updateToolIntelligence() {
    const count = notesCount();
    const series = selectedSeries();

    document.querySelectorAll('.tool[data-tool]').forEach((button) => {
      const action = button.dataset.tool;
      let meta = button.querySelector('.tool-meta');
      if (!meta) {
        meta = document.createElement('span');
        meta.className = 'tool-meta';
        button.appendChild(meta);
      }

      button.classList.remove('ready', 'needs-data');
      if (action === 'notes') meta.textContent = count ? `${count} note${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''}` : 'Saisie intelligente';
      else if (action === 'scan') meta.textContent = 'Photo + OCR';
      else if (personalizedTools.has(action)) {
        if (!count) {
          button.classList.add('needs-data');
          meta.textContent = 'Notes requises';
        } else {
          button.classList.add('ready');
          meta.textContent = `${count} note${count > 1 ? 's' : ''} prête${count > 1 ? 's' : ''}`;
        }
      } else if (action === 'universities') meta.textContent = series ? `Série ${series}` : 'Toutes séries';
      else if (action === 'explore') meta.textContent = series ? `Filtré : ${series}` : 'Catalogue public';
    });
  }

  function restoreCollapsedState() {
    if (localStorage.getItem(TOOLS_KEY) !== '1') return;
    document.getElementById('toolsGrid')?.classList.add('hidden');
    const text = document.getElementById('collapseText');
    if (text) text.textContent = 'Afficher';
    const arrow = document.querySelector('#collapseButton span:last-child');
    if (arrow) arrow.textContent = '⌄';
  }

  document.addEventListener('click', (event) => {
    const clear = event.target.closest('#clearButton');
    if (clear) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openModal(document.getElementById('resetModal'));
      return;
    }

    const resetButton = event.target.closest('[data-v3-reset]');
    if (resetButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      reset(resetButton.dataset.v3Reset);
      return;
    }

    const close = event.target.closest('[data-v3-close]');
    if (close) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeModal(document.getElementById(close.dataset.v3Close));
      return;
    }

    const tool = event.target.closest('.tool[data-tool]');
    if (tool && personalizedTools.has(tool.dataset.tool) && notesCount() === 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast('Ajoutez ou scannez vos notes pour une analyse réellement personnalisée.');
      document.querySelector('.tool[data-tool="notes"]')?.click();
      return;
    }

    const collapse = event.target.closest('#collapseButton');
    if (collapse) {
      setTimeout(() => {
        const collapsed = document.getElementById('toolsGrid')?.classList.contains('hidden');
        localStorage.setItem(TOOLS_KEY, collapsed ? '1' : '0');
      }, 0);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    buildResetModal();
    restoreCollapsedState();
    updateToolIntelligence();

    const observer = new MutationObserver(updateToolIntelligence);
    const count = document.getElementById('notesCount');
    if (count) observer.observe(count, { childList: true, characterData: true, subtree: true });
    document.getElementById('seriesSelect')?.addEventListener('change', updateToolIntelligence);

    document.querySelector('.title-wrap')?.setAttribute('title', 'AprèsBac IA · Assistant public intelligent');
    document.querySelectorAll('.suggestion').forEach((button, index) => {
      button.style.setProperty('--suggestion-index', String(index));
    });
  });
})();
