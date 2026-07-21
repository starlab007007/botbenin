(() => {
  'use strict';

  const VERSION = '2.16.11';
  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';
  const VALIDATED_KEY = 'botbj_apresbacia_validated_notes_v2';

  let reloadingAfterValidation = false;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function norm(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fr')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatScore(value) {
    return Number(value).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  function notes() {
    const values = readJson(NOTES_KEY, []);
    if (!Array.isArray(values)) return [];

    const unique = new Map();

    for (const item of values) {
      const subject = String(item?.subject || '').trim();
      const score = Number(item?.score);

      if (!subject || !Number.isFinite(score) || score < 0 || score > 20) continue;

      unique.set(norm(subject), {
        subject,
        score: Math.round(score * 100) / 100,
        source: item?.source || 'manual',
      });
    }

    return Array.from(unique.values())
      .sort((left, right) => left.subject.localeCompare(right.subject, 'fr'));
  }

  function saveNotes(values) {
    const clean = Array.isArray(values) ? values.slice(0, 50) : [];
    localStorage.setItem(NOTES_KEY, JSON.stringify(clean));
    localStorage.removeItem(VALIDATED_KEY);

    window.dispatchEvent(new CustomEvent('apresbac:notes-changed', {
      detail: {
        version: VERSION,
        notes: clean,
        count: clean.length,
        series: $('#seriesSelect')?.value || localStorage.getItem(SERIES_KEY) || 'Toutes',
      },
    }));
  }

  function selectedSubject() {
    const select = $('#subjectSelect');
    const value = String(select?.value || '').trim();

    if (value === 'Autre') {
      return String($('#customSubject')?.value || '').trim();
    }

    return value;
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(
      () => toast.classList.remove('show'),
      2800,
    );
  }

  function renderNotesList() {
    const list = $('#notesList');
    const values = notes();

    if (list) {
      if (!values.length) {
        list.innerHTML = '<div class="empty">Aucune note enregistrée. Sélectionnez une matière, saisissez sa note puis touchez « Ajouter la note ».</div>';
      } else {
        list.innerHTML = values.map((item, index) => `
          <div class="note-item" data-saved-note="${index}">
            <div>
              <strong>${esc(item.subject)}</strong>
              <span>${formatScore(item.score)} / 20 · ${item.source === 'ocr' ? 'OCR' : 'saisie manuelle'}</span>
            </div>
            <button
              type="button"
              class="small-btn"
              data-edit-saved-note="${index}"
              aria-label="Modifier la note de ${esc(item.subject)}"
              title="Modifier"
            >✎</button>
            <button
              type="button"
              class="small-btn"
              data-delete-saved-note="${index}"
              aria-label="Supprimer la note de ${esc(item.subject)}"
              title="Supprimer"
            >×</button>
          </div>
        `).join('');
      }
    }

    const count = values.length;
    const countElement = $('#notesCount');
    const badge = $('#notesBadge');
    const clearButton = $('#clearNotesButton');

    if (countElement) countElement.textContent = `${count} note${count > 1 ? 's' : ''}`;

    if (badge) {
      badge.textContent = String(count);
      badge.classList.toggle('hidden', count === 0);
    }

    if (clearButton) clearButton.disabled = count === 0;
  }

  function hasValidProfile() {
    const profile = readJson(VALIDATED_KEY, null);
    return Boolean(profile && Array.isArray(profile.notes) && profile.notes.length);
  }

  function updateAnalysisTools() {
    const count = notes().length;
    const validated = hasValidProfile();

    ['profile', 'recommendations', 'eligibility', 'ranking'].forEach((action) => {
      const tool = document.querySelector(`[data-tool="${action}"]`);
      if (!tool) return;

      tool.disabled = false;
      tool.removeAttribute('aria-disabled');
      tool.classList.toggle('ab-ready', count > 0);
      tool.classList.toggle('notes-analysis-validated', validated);

      let meta = tool.querySelector('.tool-meta');
      if (!meta) {
        meta = document.createElement('span');
        meta.className = 'tool-meta';
        tool.appendChild(meta);
      }

      if (!count) meta.textContent = 'Ajoutez vos notes';
      else if (!validated) meta.textContent = `${count} note${count > 1 ? 's' : ''} · à valider`;
      else meta.textContent = `${count} note${count > 1 ? 's' : ''} · profil validé`;
    });

    window.__APRESBAC_V2_16__?.updateToolStates?.();
  }

  function refreshAll() {
    renderNotesList();
    updateAnalysisTools();
    window.__APRESBAC_NOTES_OCR_INTELLIGENCE_V2_16_10__?.badges?.();
    window.__APRESBAC_NOTES_OCR_INTELLIGENCE_V2_16_10__?.updateBinding?.();
    window.__APRESBAC_NOTES_VALIDATION_V2_16_9__?.renderCard?.();
  }

  function selectNextUnfilledSubject(currentSubject) {
    const saved = new Set(notes().map((item) => norm(item.subject)));
    const buttons = $$('#notesInlineList2168 [data-inline-subject]')
      .filter((button) => button.dataset.inlineSubject && button.dataset.inlineSubject !== 'Autre');

    if (!buttons.length) return;

    const currentIndex = buttons.findIndex(
      (button) => norm(button.dataset.inlineSubject) === norm(currentSubject),
    );

    const ordered = [
      ...buttons.slice(currentIndex + 1),
      ...buttons.slice(0, Math.max(0, currentIndex + 1)),
    ];

    const next = ordered.find(
      (button) => !saved.has(norm(button.dataset.inlineSubject)),
    );

    if (!next) return;

    const picker = window.__APRESBAC_NOTES_INLINE_V2_16_8__;
    if (picker?.selectSubject) picker.selectSubject(next.dataset.inlineSubject);
    else next.click();
  }

  function addOrUpdate() {
    const subject = selectedSubject();
    const input = $('#noteValue');
    const score = Number(input?.value);

    if (!subject) {
      showToast('Sélectionnez d’abord une matière.');
      return;
    }

    if (
      !input
      || String(input.value || '').trim() === ''
      || !Number.isFinite(score)
      || score < 0
      || score > 20
    ) {
      showToast('Saisissez une note valide comprise entre 0 et 20.');
      input?.focus();
      return;
    }

    const values = notes();
    const index = values.findIndex((item) => norm(item.subject) === norm(subject));
    const entry = {
      subject,
      score: Math.round(score * 100) / 100,
      source: 'manual',
    };

    if (index >= 0) values[index] = entry;
    else values.push(entry);

    values.sort((left, right) => left.subject.localeCompare(right.subject, 'fr'));
    saveNotes(values);

    input.value = '';
    $('#customSubject') && ($('#customSubject').value = '');

    refreshAll();
    showToast(index >= 0
      ? `Note de ${subject} mise à jour : ${formatScore(score)}/20.`
      : `Note de ${subject} enregistrée : ${formatScore(score)}/20.`);

    window.setTimeout(() => {
      selectNextUnfilledSubject(subject);
      refreshAll();
    }, 120);
  }

  function editNote(index) {
    const item = notes()[index];
    if (!item) return;

    const picker = window.__APRESBAC_NOTES_INLINE_V2_16_8__;

    if (picker?.selectSubject) {
      picker.selectSubject(item.subject);
    } else {
      const select = $('#subjectSelect');
      if (select && Array.from(select.options).some((option) => option.value === item.subject)) {
        select.value = item.subject;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const input = $('#noteValue');
    if (input) {
      input.value = String(item.score);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus({ preventScroll: true });
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showToast(`Modification de ${item.subject}.`);
  }

  function deleteNote(index) {
    const values = notes();
    const item = values[index];
    if (!item) return;

    if (!window.confirm(`Supprimer la note de ${item.subject} ?`)) return;

    values.splice(index, 1);
    saveNotes(values);
    refreshAll();
    showToast(`Note de ${item.subject} supprimée.`);
  }

  function clearAllNotes() {
    const values = notes();
    if (!values.length) return;

    if (!window.confirm('Supprimer toutes les notes enregistrées ?')) return;

    saveNotes([]);
    refreshAll();
    showToast('Toutes les notes ont été supprimées.');
  }

  function injectStyles() {
    if ($('#notesSaveAnalysis21611Styles')) return;

    const style = document.createElement('style');
    style.id = 'notesSaveAnalysis21611Styles';
    style.textContent = `
      #notesModal #addNoteButton:not(:disabled) {
        cursor: pointer;
        pointer-events: auto !important;
      }

      #notesModal .note-item {
        align-items: center;
      }

      .tool.notes-analysis-validated {
        border-color: #9bd8c8 !important;
        background: linear-gradient(155deg, #effbf7, #ffffff) !important;
      }

      .tool.notes-analysis-validated::before {
        content: '✓';
        position: absolute;
        top: 8px;
        right: 8px;
        width: 23px;
        height: 23px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        color: #fff;
        background: #0a8a72;
        font-size: 12px;
        font-weight: 900;
        box-shadow: 0 6px 14px rgba(10, 138, 114, .22);
      }
    `;

    document.head.appendChild(style);
  }

  function installEvents() {
    document.addEventListener(
      'click',
      (event) => {
        const addButton = event.target.closest('#addNoteButton');
        if (addButton) {
          event.preventDefault();
          event.stopImmediatePropagation();
          addOrUpdate();
          return;
        }

        const editButton = event.target.closest('[data-edit-saved-note]');
        if (editButton) {
          event.preventDefault();
          event.stopImmediatePropagation();
          editNote(Number(editButton.dataset.editSavedNote));
          return;
        }

        const deleteButton = event.target.closest('[data-delete-saved-note]');
        if (deleteButton) {
          event.preventDefault();
          event.stopImmediatePropagation();
          deleteNote(Number(deleteButton.dataset.deleteSavedNote));
          return;
        }

        const legacyDelete = event.target.closest('[data-delete-note]');
        if (legacyDelete) {
          event.preventDefault();
          event.stopImmediatePropagation();
          deleteNote(Number(legacyDelete.dataset.deleteNote));
          return;
        }

        const clearButton = event.target.closest('#clearNotesButton');
        if (clearButton) {
          event.preventDefault();
          event.stopImmediatePropagation();
          clearAllNotes();
        }
      },
      true,
    );

    $('#noteValue')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      addOrUpdate();
    }, true);

    window.addEventListener('apresbac:notes-validated', () => {
      if (reloadingAfterValidation) return;
      reloadingAfterValidation = true;

      refreshAll();
      showToast('Notes validées. Activation des analyses…');

      window.setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('v', VERSION);
        url.searchParams.set('notes', 'validees');
        window.location.replace(url.toString());
      }, 700);
    });

    window.addEventListener('storage', (event) => {
      if ([NOTES_KEY, VALIDATED_KEY].includes(event.key)) refreshAll();
    });
  }

  function installObservers() {
    const modal = $('#notesModal');
    if (modal && 'MutationObserver' in window) {
      new MutationObserver(() => {
        if (!modal.classList.contains('hidden')) {
          window.setTimeout(refreshAll, 40);
        }
      }).observe(modal, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  function start() {
    injectStyles();
    installEvents();
    installObservers();
    refreshAll();

    window.setTimeout(refreshAll, 300);
    window.setTimeout(refreshAll, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.__APRESBAC_NOTES_SAVE_ANALYSIS_V2_16_11__ = {
    addOrUpdate,
    deleteNote,
    clearAllNotes,
    refreshAll,
    notes,
  };
})();
