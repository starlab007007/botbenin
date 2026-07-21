(() => {
  'use strict';

  const VERSION = '2.16.7';
  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';

  const SUBJECT_GROUPS = {
    communes: [
      'Mathématiques',
      'Français',
      'Anglais',
      'Philosophie',
      'Histoire-Géographie',
      'EPS',
    ],
    litteraires: [
      'Littérature française',
      'Allemand',
      'Espagnol',
      'Portugais',
      'Latin',
      'Langues nationales',
    ],
    scientifiques: [
      'Physique-Chimie',
      'Sciences physiques',
      'SVT',
      'Biologie-Géologie',
      'Informatique',
    ],
    economiques: [
      'Économie',
      'Comptabilité',
      'Gestion',
      'Droit',
      'Techniques commerciales',
      'Mathématiques financières',
    ],
    techniques: [
      'Électrotechnique',
      'Électronique',
      'Construction mécanique',
      'Mécanique générale',
      'Dessin technique',
      'Technologie',
      'Génie civil',
      'Bâtiment',
      'Topographie',
      'Énergétique',
      'Maintenance industrielle',
    ],
    agricoles: [
      'Agronomie',
      'Production végétale',
      'Production animale',
      'Sciences agricoles',
    ],
  };

  const SERIES_GROUPS = {
    A1: ['communes', 'litteraires'],
    A2: ['communes', 'litteraires'],
    B: ['communes', 'economiques'],
    C: ['communes', 'scientifiques'],
    D: ['communes', 'scientifiques'],
    E: ['communes', 'scientifiques', 'techniques'],
    F1: ['communes', 'techniques'],
    F2: ['communes', 'techniques'],
    F3: ['communes', 'techniques'],
    F4: ['communes', 'techniques'],
    G1: ['communes', 'economiques'],
    G2: ['communes', 'economiques'],
    G3: ['communes', 'economiques'],
    EA: ['communes', 'scientifiques', 'agricoles'],
    DEAT: ['communes', 'techniques', 'agricoles'],
    DT: ['communes', 'techniques'],
    Toutes: [
      'communes',
      'litteraires',
      'scientifiques',
      'economiques',
      'techniques',
      'agricoles',
    ],
  };

  let picker = null;
  let pickerButton = null;
  let pickerPanel = null;
  let pickerSearch = null;
  let pickerList = null;
  let selectedSubject = '';

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function readNotes() {
    try {
      const value = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 40)));
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function injectStyles() {
    if (document.getElementById('notesPickerDelete2167Styles')) return;

    const style = document.createElement('style');
    style.id = 'notesPickerDelete2167Styles';
    style.textContent = `
      #notesModal #subjectSelect {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        min-height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        clip: rect(0 0 0 0) !important;
      }

      .subject-picker {
        position: relative;
        min-width: 0;
      }

      .subject-picker-button {
        width: 100%;
        min-height: 54px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        padding: 0 15px;
        border: 2px solid #1666cc;
        border-radius: 16px;
        color: #13231f;
        background: #fff;
        text-align: left;
        font-weight: 800;
        box-shadow: 0 5px 14px rgba(22, 102, 204, .08);
      }

      .subject-picker-button[data-empty="true"] {
        color: #69766f;
        font-weight: 650;
      }

      .subject-picker-button[aria-expanded="true"] {
        border-color: #2f66eb;
        box-shadow: 0 0 0 4px rgba(47, 102, 235, .12);
      }

      .subject-picker-arrow {
        color: #1f4fd0;
        font-size: 18px;
        transition: transform .18s ease;
      }

      .subject-picker-button[aria-expanded="true"] .subject-picker-arrow {
        transform: rotate(180deg);
      }

      .subject-picker-panel {
        position: fixed;
        left: 14px;
        right: 14px;
        bottom: max(12px, env(safe-area-inset-bottom));
        z-index: 220;
        display: none;
        max-height: min(72dvh, 620px);
        padding: 12px;
        border: 1px solid #d8e3df;
        border-radius: 24px;
        background: #fff;
        box-shadow: 0 24px 70px rgba(6, 36, 30, .28);
      }

      .subject-picker-panel.open {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 10px;
      }

      .subject-picker-search {
        width: 100%;
        min-height: 48px;
        padding: 0 14px;
        border: 1px solid #cbd8d4;
        border-radius: 14px;
        outline: none;
        color: #13231f;
        background: #f7faf9;
        font-size: 16px;
      }

      .subject-picker-search:focus {
        border-color: #2f66eb;
        box-shadow: 0 0 0 3px rgba(47, 102, 235, .10);
      }

      .subject-picker-list {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: grid;
        gap: 7px;
        padding: 1px;
      }

      .subject-choice {
        width: 100%;
        min-height: 48px;
        padding: 10px 13px;
        border: 1px solid #e0e8e5;
        border-radius: 14px;
        color: #14231f;
        background: #fff;
        text-align: left;
        font-weight: 750;
      }

      .subject-choice:active,
      .subject-choice.selected {
        color: #fff;
        border-color: #2f66eb;
        background: #2f66eb;
      }

      .subject-choice.other {
        color: #075247;
        border-color: #b8ddd2;
        background: #edf8f4;
      }

      .subject-picker-empty {
        padding: 18px;
        color: #69766f;
        text-align: center;
      }

      #clearNotesButton {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        margin-top: 12px !important;
        min-height: 50px !important;
      }

      #clearNotesButton:disabled {
        opacity: .45 !important;
        cursor: not-allowed;
      }

      @media (min-width: 720px) {
        .subject-picker-panel {
          left: 50%;
          right: auto;
          width: min(620px, calc(100vw - 28px));
          transform: translateX(-50%);
        }
      }

      @media (max-width: 560px) {
        #notesModal .form-row {
          grid-template-columns: minmax(0, 1fr) 92px !important;
        }

        #notesModal #addNoteButton {
          grid-column: 1 / -1;
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function currentSeries() {
    return document.getElementById('seriesSelect')?.value
      || localStorage.getItem(SERIES_KEY)
      || 'Toutes';
  }

  function subjectsForCurrentSeries() {
    const groups = SERIES_GROUPS[currentSeries()] || SERIES_GROUPS.Toutes;
    const values = groups.flatMap((group) => SUBJECT_GROUPS[group] || []);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  function ensureNativeOption(subject) {
    const select = document.getElementById('subjectSelect');
    if (!select) return;

    if (![...select.options].some((option) => option.value === subject)) {
      select.add(new Option(subject, subject));
    }
  }

  function setSubject(subject) {
    const select = document.getElementById('subjectSelect');
    if (!select) return;

    selectedSubject = subject;
    ensureNativeOption(subject);
    select.value = subject;
    select.dispatchEvent(new Event('change', { bubbles: true }));

    if (pickerButton) {
      pickerButton.dataset.empty = subject ? 'false' : 'true';
      pickerButton.querySelector('.subject-picker-label').textContent = subject || 'Choisir une matière';
    }

    closePicker();
  }

  function renderSubjectChoices(query = '') {
    if (!pickerList) return;

    const needle = normalize(query);
    const values = subjectsForCurrentSeries().filter((subject) => (
      !needle || normalize(subject).includes(needle)
    ));

    const rows = values.map((subject) => `
      <button
        type="button"
        class="subject-choice${subject === selectedSubject ? ' selected' : ''}"
        data-subject-choice="${escapeHtml(subject)}"
      >${escapeHtml(subject)}</button>
    `).join('');

    const otherMatches = !needle || normalize('Autre matière').includes(needle);

    pickerList.innerHTML = rows
      + (otherMatches ? `
        <button
          type="button"
          class="subject-choice other${selectedSubject === 'Autre' ? ' selected' : ''}"
          data-subject-choice="Autre"
        >Autre matière…</button>
      ` : '')
      + (!values.length && !otherMatches
        ? '<div class="subject-picker-empty">Aucune matière correspondante.</div>'
        : '');
  }

  function openPicker() {
    if (!pickerPanel || !pickerButton) return;

    pickerPanel.classList.add('open');
    pickerButton.setAttribute('aria-expanded', 'true');
    renderSubjectChoices('');

    if (pickerSearch) {
      pickerSearch.value = '';
      setTimeout(() => pickerSearch.focus(), 40);
    }
  }

  function closePicker() {
    pickerPanel?.classList.remove('open');
    pickerButton?.setAttribute('aria-expanded', 'false');
  }

  function createPicker() {
    const select = document.getElementById('subjectSelect');
    if (!select || document.getElementById('subjectPicker2167')) return;

    picker = document.createElement('div');
    picker.id = 'subjectPicker2167';
    picker.className = 'subject-picker';
    picker.innerHTML = `
      <button
        id="subjectPickerButton2167"
        type="button"
        class="subject-picker-button"
        data-empty="true"
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span class="subject-picker-label">Choisir une matière</span>
        <span class="subject-picker-arrow" aria-hidden="true">⌄</span>
      </button>
    `;

    select.insertAdjacentElement('afterend', picker);
    pickerButton = document.getElementById('subjectPickerButton2167');

    pickerPanel = document.createElement('div');
    pickerPanel.id = 'subjectPickerPanel2167';
    pickerPanel.className = 'subject-picker-panel';
    pickerPanel.setAttribute('role', 'dialog');
    pickerPanel.setAttribute('aria-label', 'Choisir une matière');
    pickerPanel.innerHTML = `
      <input
        id="subjectPickerSearch2167"
        class="subject-picker-search"
        type="search"
        placeholder="Rechercher une matière…"
        autocomplete="off"
      />
      <div id="subjectPickerList2167" class="subject-picker-list" role="listbox"></div>
    `;

    document.body.appendChild(pickerPanel);
    pickerSearch = document.getElementById('subjectPickerSearch2167');
    pickerList = document.getElementById('subjectPickerList2167');

    pickerButton.addEventListener('click', () => {
      if (pickerPanel.classList.contains('open')) closePicker();
      else openPicker();
    });

    pickerSearch.addEventListener('input', () => {
      renderSubjectChoices(pickerSearch.value);
    });

    pickerPanel.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-subject-choice]');
      if (choice) setSubject(choice.dataset.subjectChoice);
    });

    document.addEventListener('click', (event) => {
      if (
        pickerPanel?.classList.contains('open')
        && !pickerPanel.contains(event.target)
        && !pickerButton.contains(event.target)
      ) {
        closePicker();
      }
    });
  }

  function renderNotesFromStorage() {
    const notes = readNotes();
    const list = document.getElementById('notesList');
    const count = document.getElementById('notesCount');
    const badge = document.getElementById('notesBadge');
    const clear = document.getElementById('clearNotesButton');

    if (count) count.textContent = `${notes.length} note${notes.length > 1 ? 's' : ''}`;

    if (badge) {
      badge.textContent = String(notes.length);
      badge.classList.toggle('hidden', notes.length === 0);
    }

    if (clear) clear.disabled = notes.length === 0;

    if (!list) return;

    if (!notes.length) {
      list.innerHTML = '<div class="empty">Aucune note enregistrée. Ajoutez une matière et sa note sur 20.</div>';
      return;
    }

    list.innerHTML = notes.map((item, index) => `
      <div class="note-item">
        <div>
          <strong>${escapeHtml(item.subject)}</strong>
          <span>${Number(item.score).toFixed(2)} / 20 · ${item.source === 'ocr' ? 'OCR' : 'saisie manuelle'}</span>
        </div>
        <button type="button" class="small-btn" data-edit-note="${index}" title="Modifier">✎</button>
        <button type="button" class="small-btn" data-delete-note="${index}" title="Supprimer">×</button>
      </div>
    `).join('');
  }

  function reloadAndReopenNotes() {
    const url = new URL(window.location.href);
    url.searchParams.set('v', VERSION);
    url.searchParams.set('notes', 'open');
    window.location.replace(url.toString());
  }

  function installDeletionControls() {
    document.addEventListener(
      'click',
      (event) => {
        const deleteButton = event.target.closest('[data-delete-note]');
        if (deleteButton) {
          event.preventDefault();
          event.stopImmediatePropagation();

          const notes = readNotes();
          const index = Number(deleteButton.dataset.deleteNote);
          const item = notes[index];
          if (!item) return;

          if (!window.confirm(`Supprimer la note de ${item.subject} ?`)) return;

          notes.splice(index, 1);
          writeNotes(notes);
          renderNotesFromStorage();
          showToast('Note supprimée.');
          setTimeout(reloadAndReopenNotes, 260);
          return;
        }

        const clearButton = event.target.closest('#clearNotesButton');
        if (clearButton) {
          event.preventDefault();
          event.stopImmediatePropagation();

          const notes = readNotes();
          if (!notes.length) {
            showToast('Aucune note à supprimer.');
            return;
          }

          if (!window.confirm('Supprimer toutes les notes enregistrées ?')) return;

          writeNotes([]);
          renderNotesFromStorage();
          showToast('Toutes les notes ont été supprimées.');
          setTimeout(reloadAndReopenNotes, 260);
        }
      },
      true,
    );
  }

  function installRefreshHooks() {
    document.addEventListener(
      'click',
      (event) => {
        if (event.target.closest('[data-tool="notes"]')) {
          setTimeout(() => {
            createPicker();
            renderSubjectChoices('');
            renderNotesFromStorage();
          }, 30);
        }
      },
      true,
    );

    document.getElementById('seriesSelect')?.addEventListener('change', () => {
      selectedSubject = '';
      setSubject('');
      renderSubjectChoices('');
    });
  }

  function reopenNotesWhenRequested() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('notes') !== 'open') return;

    setTimeout(() => {
      document.querySelector('[data-tool="notes"]')?.click();
      url.searchParams.delete('notes');
      history.replaceState({}, '', url.toString());
    }, 420);
  }

  function start() {
    injectStyles();
    createPicker();
    renderSubjectChoices('');
    renderNotesFromStorage();
    installDeletionControls();
    installRefreshHooks();
    reopenNotesWhenRequested();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.__APRESBAC_NOTES_PICKER_DELETE_V2_16_7__ = {
    setSubject,
    renderNotesFromStorage,
    subjectsForCurrentSeries,
  };
})();
