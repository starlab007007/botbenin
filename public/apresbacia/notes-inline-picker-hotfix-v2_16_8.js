(() => {
  'use strict';

  const VERSION = '2.16.8';
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

  let selectedSubject = '';
  let searchInput = null;
  let listElement = null;
  let selectedLabel = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function currentSeries() {
    return document.getElementById('seriesSelect')?.value
      || localStorage.getItem(SERIES_KEY)
      || 'Toutes';
  }

  function subjectsForSeries(series = currentSeries()) {
    const groups = SERIES_GROUPS[series] || SERIES_GROUPS.Toutes;
    const values = groups.flatMap((group) => SUBJECT_GROUPS[group] || []);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  function allSubjects() {
    return subjectsForSeries('Toutes');
  }

  function readNotes() {
    try {
      const value = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function injectStyles() {
    if (document.getElementById('notesInline2168Styles')) return;

    const style = document.createElement('style');
    style.id = 'notesInline2168Styles';
    style.textContent = `
      #notesModal #subjectSelect {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        min-height: 1px !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        clip: rect(0 0 0 0) !important;
        appearance: none !important;
        -webkit-appearance: none !important;
      }

      #notesModal .notes-inline-picker {
        grid-column: 1 / -1;
        min-width: 0;
        display: grid;
        gap: 10px;
        padding: 12px;
        border: 1px solid #d5e2de;
        border-radius: 18px;
        background: #f8fbfa;
      }

      #notesModal .notes-inline-selected {
        min-height: 52px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        padding: 10px 13px;
        border: 2px solid #2f66eb;
        border-radius: 15px;
        color: #15241f;
        background: #fff;
      }

      #notesModal .notes-inline-selected-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        color: #fff;
        background: #2f66eb;
      }

      #notesModal .notes-inline-selected strong,
      #notesModal .notes-inline-selected small {
        display: block;
      }

      #notesModal .notes-inline-selected small {
        margin-top: 2px;
        color: #6b7772;
      }

      #notesModal .notes-inline-search {
        width: 100%;
        min-height: 48px;
        padding: 0 13px;
        border: 1px solid #c8d7d2;
        border-radius: 13px;
        outline: none;
        color: #15241f;
        background: #fff;
        font-size: 16px;
      }

      #notesModal .notes-inline-search:focus {
        border-color: #2f66eb;
        box-shadow: 0 0 0 3px rgba(47, 102, 235, .11);
      }

      #notesModal .notes-inline-list {
        max-height: 245px;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 2px;
      }

      #notesModal .notes-inline-choice {
        min-width: 0;
        min-height: 48px;
        padding: 9px 10px;
        border: 1px solid #dce6e2;
        border-radius: 13px;
        color: #172620;
        background: #fff;
        text-align: left;
        font-weight: 750;
        overflow-wrap: anywhere;
      }

      #notesModal .notes-inline-choice.selected {
        color: #fff;
        border-color: #2f66eb;
        background: #2f66eb;
      }

      #notesModal .notes-inline-choice.other {
        color: #075247;
        border-color: #b7dcd1;
        background: #eaf7f3;
      }

      #notesModal .notes-inline-empty {
        grid-column: 1 / -1;
        padding: 15px;
        color: #6a7671;
        text-align: center;
      }

      #notesModal #clearNotesButton {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        min-height: 50px !important;
        margin-top: 12px !important;
      }

      #notesModal #clearNotesButton:disabled {
        opacity: .48 !important;
      }

      @media (max-width: 560px) {
        #notesModal .form-row {
          grid-template-columns: minmax(0, 1fr) 92px !important;
        }

        #notesModal #addNoteButton {
          grid-column: 1 / -1;
          width: 100%;
        }

        #notesModal .notes-inline-list {
          grid-template-columns: 1fr;
          max-height: 230px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function populateNativeSelect() {
    const select = document.getElementById('subjectSelect');
    if (!select) return;

    const previous = select.value || selectedSubject;
    const values = allSubjects();

    select.innerHTML = [
      '<option value="">Choisir une matière</option>',
      ...values.map((subject) => (
        `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`
      )),
      '<option value="Autre">Autre</option>',
    ].join('');

    if (previous && [...select.options].some((option) => option.value === previous)) {
      select.value = previous;
    }
  }

  function updateSelectedDisplay() {
    if (!selectedLabel) return;

    selectedLabel.innerHTML = selectedSubject
      ? `<strong>${escapeHtml(selectedSubject)}</strong><small>Matière sélectionnée</small>`
      : '<strong>Aucune matière sélectionnée</strong><small>Touchez directement une matière dans la liste ci-dessous.</small>';
  }

  function renderChoices(query = '') {
    if (!listElement) return;

    const needle = normalize(query);
    const primary = subjectsForSeries();
    const additional = allSubjects().filter((subject) => !primary.includes(subject));
    const ordered = [...primary, ...additional];
    const filtered = ordered.filter((subject) => (
      !needle || normalize(subject).includes(needle)
    ));

    listElement.innerHTML = filtered.map((subject) => `
      <button
        type="button"
        class="notes-inline-choice${subject === selectedSubject ? ' selected' : ''}"
        data-inline-subject="${escapeHtml(subject)}"
      >${escapeHtml(subject)}</button>
    `).join('')
      + ((!needle || normalize('Autre matière').includes(needle)) ? `
        <button
          type="button"
          class="notes-inline-choice other${selectedSubject === 'Autre' ? ' selected' : ''}"
          data-inline-subject="Autre"
        >Autre matière…</button>
      ` : '')
      + (!filtered.length && needle && !normalize('Autre matière').includes(needle)
        ? '<div class="notes-inline-empty">Aucune matière correspondante.</div>'
        : '');
  }

  function selectSubject(subject) {
    const select = document.getElementById('subjectSelect');
    const custom = document.getElementById('customSubject');
    if (!select) return;

    selectedSubject = subject;
    populateNativeSelect();
    select.value = subject;
    select.dispatchEvent(new Event('change', { bubbles: true }));

    custom?.classList.toggle('hidden', subject !== 'Autre');
    if (subject === 'Autre') setTimeout(() => custom?.focus(), 30);

    updateSelectedDisplay();
    renderChoices(searchInput?.value || '');
  }

  function removeOldPickers() {
    document.getElementById('subjectPicker2167')?.remove();
    document.getElementById('subjectPickerPanel2167')?.remove();
    document.getElementById('subjectListInfo')?.remove();
  }

  function createInlinePicker() {
    const select = document.getElementById('subjectSelect');
    const row = select?.closest('.form-row');
    if (!select || !row) return;

    removeOldPickers();
    populateNativeSelect();

    let container = document.getElementById('notesInlinePicker2168');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notesInlinePicker2168';
      container.className = 'notes-inline-picker';
      container.innerHTML = `
        <div class="notes-inline-selected">
          <span class="notes-inline-selected-icon">✓</span>
          <span id="notesInlineSelectedLabel2168"></span>
        </div>
        <input
          id="notesInlineSearch2168"
          class="notes-inline-search"
          type="search"
          placeholder="Rechercher une matière…"
          autocomplete="off"
        />
        <div id="notesInlineList2168" class="notes-inline-list"></div>
      `;

      row.insertAdjacentElement('afterend', container);
    }

    searchInput = document.getElementById('notesInlineSearch2168');
    listElement = document.getElementById('notesInlineList2168');
    selectedLabel = document.getElementById('notesInlineSelectedLabel2168');

    searchInput.oninput = () => renderChoices(searchInput.value);
    listElement.onclick = (event) => {
      const button = event.target.closest('[data-inline-subject]');
      if (!button) return;
      selectSubject(button.dataset.inlineSubject);
    };

    updateSelectedDisplay();
    renderChoices('');
  }

  function refreshDeletionState() {
    const notes = readNotes();
    const clearButton = document.getElementById('clearNotesButton');
    if (clearButton) clearButton.disabled = notes.length === 0;
  }

  function installHooks() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-tool="notes"]')) {
        setTimeout(() => {
          createInlinePicker();
          refreshDeletionState();
        }, 40);
      }

      if (
        event.target.closest('[data-delete-note]')
        || event.target.closest('#clearNotesButton')
      ) {
        setTimeout(refreshDeletionState, 100);
      }
    });

    document.getElementById('seriesSelect')?.addEventListener('change', () => {
      selectedSubject = '';
      const select = document.getElementById('subjectSelect');
      if (select) select.value = '';
      updateSelectedDisplay();
      renderChoices(searchInput?.value || '');
    });

    const modal = document.getElementById('notesModal');
    if (modal && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (!modal.classList.contains('hidden')) {
          createInlinePicker();
          refreshDeletionState();
        }
      });

      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  function start() {
    injectStyles();
    removeOldPickers();
    createInlinePicker();
    refreshDeletionState();
    installHooks();

    setTimeout(createInlinePicker, 300);
    setTimeout(createInlinePicker, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.__APRESBAC_NOTES_INLINE_V2_16_8__ = {
    createInlinePicker,
    selectSubject,
    renderChoices,
  };
})();
