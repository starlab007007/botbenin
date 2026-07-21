(() => {
  'use strict';

  const VERSION = '2.16.6';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';

  const GROUPS = {
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
    EA: ['communes', 'agricoles', 'scientifiques'],
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

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function injectStyles() {
    if (document.getElementById('notesSubjects2166Styles')) return;

    const style = document.createElement('style');
    style.id = 'notesSubjects2166Styles';
    style.textContent = `
      #subjectSelect {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        min-height: 52px !important;
        color: #13231f !important;
        background-color: #ffffff !important;
        border: 2px solid #1666cc !important;
        -webkit-text-fill-color: #13231f !important;
        appearance: auto !important;
        -webkit-appearance: menulist !important;
      }

      #subjectSelect option,
      #subjectSelect optgroup {
        color: #13231f !important;
        background: #ffffff !important;
        -webkit-text-fill-color: #13231f !important;
      }

      #subjectSelect option[disabled] {
        color: #75817c !important;
      }

      .subject-list-info {
        margin: 7px 0 0;
        color: #60706a;
        font-size: 11px;
        line-height: 1.35;
      }

      @media (max-width: 560px) {
        #notesModal .form-row {
          grid-template-columns: minmax(0, 1fr) 92px !important;
        }

        #notesModal .form-row #addNoteButton {
          grid-column: 1 / -1;
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function currentSeries() {
    const select = document.getElementById('seriesSelect');
    return select?.value || localStorage.getItem(SERIES_KEY) || 'Toutes';
  }

  function subjectsForSeries(series) {
    const groupNames = SERIES_GROUPS[series] || SERIES_GROUPS.Toutes;
    const values = groupNames.flatMap((groupName) => GROUPS[groupName] || []);
    return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'fr'));
  }

  function populateSubjects(options = {}) {
    const select = document.getElementById('subjectSelect');
    if (!select) return;

    const previous = options.keepSelection === false ? '' : select.value;
    const series = currentSeries();
    const subjects = subjectsForSeries(series);

    const groups = [
      {
        label: series === 'Toutes'
          ? 'Matières disponibles'
          : `Matières adaptées à la série ${series}`,
        values: subjects,
      },
    ];

    select.innerHTML = [
      '<option value="" disabled>Choisir une matière</option>',
      ...groups.map((group) => `
        <optgroup label="${escapeHtml(group.label)}">
          ${group.values.map((subject) => `
            <option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>
          `).trim()).join('')}
        </optgroup>
      `.trim()),
      '<option value="Autre">Autre matière…</option>',
    ].join('');

    if (previous && [...select.options].some((option) => option.value === previous)) {
      select.value = previous;
    } else {
      select.value = '';
    }

    select.disabled = false;
    select.removeAttribute('aria-hidden');
    select.dataset.notesSubjectsVersion = VERSION;

    let info = document.getElementById('subjectListInfo');
    if (!info) {
      info = document.createElement('p');
      info.id = 'subjectListInfo';
      info.className = 'subject-list-info';
      select.closest('.form-grid')?.appendChild(info);
    }

    if (info) {
      info.textContent = `${subjects.length} matières proposées${series === 'Toutes' ? '' : ` pour la série ${series}`}. Choisissez « Autre matière » lorsque la matière recherchée n’apparaît pas.`;
    }

    const custom = document.getElementById('customSubject');
    custom?.classList.toggle('hidden', select.value !== 'Autre');
  }

  function ensureVisibleWhenModalOpens() {
    const modal = document.getElementById('notesModal');
    if (!modal) return;

    if ('MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (!modal.classList.contains('hidden')) {
          populateSubjects();
        }
      });

      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  function installEvents() {
    document.addEventListener(
      'click',
      (event) => {
        if (event.target.closest('[data-tool="notes"]')) {
          window.setTimeout(() => populateSubjects(), 0);
          window.setTimeout(() => populateSubjects(), 180);
        }
      },
      true,
    );

    document.getElementById('seriesSelect')?.addEventListener('change', () => {
      window.setTimeout(() => populateSubjects({ keepSelection: false }), 0);
    });

    document.getElementById('subjectSelect')?.addEventListener('change', (event) => {
      const custom = document.getElementById('customSubject');
      custom?.classList.toggle('hidden', event.target.value !== 'Autre');

      if (event.target.value === 'Autre') {
        window.setTimeout(() => custom?.focus(), 0);
      }
    });
  }

  function start() {
    injectStyles();
    populateSubjects();
    ensureVisibleWhenModalOpens();
    installEvents();

    window.setTimeout(populateSubjects, 250);
    window.setTimeout(populateSubjects, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.__APRESBAC_NOTES_SUBJECTS_V2_16_6__ = {
    populateSubjects,
    subjectsForSeries,
  };
})();
