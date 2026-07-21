(() => {
  'use strict';

  const VERSION = '2.16.9';
  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';
  const VALIDATED_KEY = 'botbj_apresbacia_validated_notes_v2';
  const FUNCTION_FRAGMENT = '/functions/v1/waouh-apresbac-chat';

  const PERSONALIZED_TOOLS = new Set([
    'profile',
    'recommendations',
    'eligibility',
    'ranking',
  ]);

  const originalFetch = window.fetch.bind(window);
  let refreshTimer = null;

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function normalizeNotes(notes) {
    if (!Array.isArray(notes)) return [];

    const unique = new Map();

    for (const item of notes) {
      const subject = String(item?.subject || item?.subject_name || item?.name || '').trim();
      const score = Number(item?.score ?? item?.value);

      if (!subject || !Number.isFinite(score) || score < 0 || score > 20) continue;

      unique.set(subject.toLocaleLowerCase('fr'), {
        subject,
        score: Math.round(score * 100) / 100,
        source: item?.source || 'public_web',
      });
    }

    return Array.from(unique.values())
      .sort((left, right) => left.subject.localeCompare(right.subject, 'fr'));
  }

  function currentNotes() {
    return normalizeNotes(readJson(NOTES_KEY, []));
  }

  function currentSeries() {
    return document.getElementById('seriesSelect')?.value
      || localStorage.getItem(SERIES_KEY)
      || 'Toutes';
  }

  function signature(notes = currentNotes(), series = currentSeries()) {
    const serialized = JSON.stringify({
      series,
      notes: normalizeNotes(notes).map((item) => [
        item.subject.toLocaleLowerCase('fr'),
        item.score,
        item.source,
      ]),
    });

    let hash = 2166136261;

    for (let index = 0; index < serialized.length; index += 1) {
      hash ^= serialized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return `v${VERSION}-${(hash >>> 0).toString(16)}`;
  }

  function computeSummary(notes = currentNotes()) {
    const clean = normalizeNotes(notes);

    if (!clean.length) {
      return {
        count: 0,
        average: null,
        highest: null,
        lowest: null,
        strengths: [],
        vigilance: [],
      };
    }

    const total = clean.reduce((sum, item) => sum + item.score, 0);
    const sortedByScore = [...clean].sort((left, right) => right.score - left.score);

    return {
      count: clean.length,
      average: Math.round((total / clean.length) * 100) / 100,
      highest: sortedByScore[0],
      lowest: sortedByScore[sortedByScore.length - 1],
      strengths: sortedByScore.filter((item) => item.score >= 12),
      vigilance: sortedByScore.filter((item) => item.score < 10),
    };
  }

  function readValidatedProfile() {
    const profile = readJson(VALIDATED_KEY, null);
    if (!profile || !Array.isArray(profile.notes)) return null;
    return profile;
  }

  function validProfile() {
    const profile = readValidatedProfile();
    const notes = currentNotes();
    const series = currentSeries();

    if (!profile || !notes.length) return null;
    if (profile.signature !== signature(notes, series)) return null;

    return {
      ...profile,
      notes: normalizeNotes(profile.notes),
    };
  }

  function escapeHtml(value) {
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

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch (_) {
      return String(value || '');
    }
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(
      () => toast.classList.remove('show'),
      2800,
    );
  }

  function injectStyles() {
    if (document.getElementById('notesValidation2169Styles')) return;

    const style = document.createElement('style');
    style.id = 'notesValidation2169Styles';
    style.textContent = `
      #notesModal .notes-validation-card {
        display: grid;
        gap: 12px;
        margin: 15px 0 12px;
        padding: 15px;
        border: 1px solid #cfded9;
        border-radius: 20px;
        background: linear-gradient(160deg, #f8fbff 0%, #f1faf7 100%);
        box-shadow: 0 10px 25px rgba(24, 56, 72, .07);
      }

      #notesModal .notes-validation-head {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      #notesModal .notes-validation-icon {
        flex: 0 0 42px;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        color: #fff;
        background: linear-gradient(145deg, #2f66eb, #617cf3);
        box-shadow: 0 8px 18px rgba(47, 102, 235, .22);
      }

      #notesModal .notes-validation-title {
        margin: 0;
        color: #14231f;
        font-size: 17px;
        line-height: 1.2;
      }

      #notesModal .notes-validation-subtitle {
        margin: 4px 0 0;
        color: #66746f;
        font-size: 12px;
        line-height: 1.4;
      }

      #notesModal .notes-validation-status {
        padding: 10px 12px;
        border-radius: 14px;
        color: #98600c;
        background: #fff7e8;
        border: 1px solid #f1d59f;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.4;
      }

      #notesModal .notes-validation-status.valid {
        color: #08705d;
        background: #e9f8f3;
        border-color: #b8e1d5;
      }

      #notesModal .notes-validation-status.empty {
        color: #69766f;
        background: #f2f5f4;
        border-color: #dce4e1;
      }

      #notesModal .notes-summary-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      #notesModal .notes-summary-metric {
        min-width: 0;
        padding: 10px;
        border: 1px solid #dce7e3;
        border-radius: 14px;
        background: #fff;
      }

      #notesModal .notes-summary-metric small,
      #notesModal .notes-summary-metric strong {
        display: block;
      }

      #notesModal .notes-summary-metric small {
        color: #6d7974;
        font-size: 10px;
      }

      #notesModal .notes-summary-metric strong {
        margin-top: 3px;
        color: #13231f;
        font-size: 15px;
        overflow-wrap: anywhere;
      }

      #notesModal .notes-summary-list {
        display: grid;
        gap: 7px;
      }

      #notesModal .notes-summary-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        padding: 9px 11px;
        border: 1px solid #dce7e3;
        border-radius: 13px;
        color: #172620;
        background: #fff;
      }

      #notesModal .notes-summary-row strong {
        overflow-wrap: anywhere;
      }

      #notesModal .notes-summary-score {
        min-width: 55px;
        padding: 5px 8px;
        border-radius: 999px;
        color: #fff;
        background: #2f66eb;
        text-align: center;
        font-size: 12px;
        font-weight: 900;
      }

      #notesModal .notes-validation-actions {
        display: grid;
        gap: 8px;
      }

      #notesModal #validateNotesForAnalysisButton {
        width: 100%;
        min-height: 52px;
        border: 0;
        border-radius: 15px;
        color: #fff;
        background: linear-gradient(135deg, #086b5b, #0a8a72);
        box-shadow: 0 10px 20px rgba(8, 107, 91, .20);
        font-weight: 900;
      }

      #notesModal #validateNotesForAnalysisButton:disabled {
        opacity: .48;
        box-shadow: none;
      }

      #notesModal .notes-validation-help {
        margin: 0;
        color: #65726d;
        font-size: 11px;
        line-height: 1.4;
        text-align: center;
      }

      .tool.notes-profile-valid::after {
        content: '✓';
        position: absolute;
        top: 7px;
        left: 8px;
        width: 24px;
        height: 24px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        color: #fff;
        background: #0a8a72;
        font-size: 13px;
        font-weight: 900;
        box-shadow: 0 6px 14px rgba(10, 138, 114, .24);
      }

      @media (max-width: 480px) {
        #notesModal .notes-summary-metrics {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureCard() {
    const notesList = document.getElementById('notesList');
    const clearButton = document.getElementById('clearNotesButton');
    if (!notesList || !clearButton) return null;

    let card = document.getElementById('notesValidationCard2169');

    if (!card) {
      card = document.createElement('section');
      card.id = 'notesValidationCard2169';
      card.className = 'notes-validation-card';
      card.setAttribute('aria-label', 'Synthèse et validation des notes');
      clearButton.insertAdjacentElement('beforebegin', card);
    }

    return card;
  }

  function renderCard() {
    const card = ensureCard();
    if (!card) return;

    const notes = currentNotes();
    const summary = computeSummary(notes);
    const profile = validProfile();
    const series = currentSeries();

    let statusClass = 'empty';
    let statusText = 'Ajoutez au moins une note pour préparer une synthèse.';

    if (notes.length && profile) {
      statusClass = 'valid';
      statusText = `Profil validé le ${formatDate(profile.validated_at)}. Ces notes seront automatiquement transmises à AprèsBac IA lors de chaque analyse.`;
    } else if (notes.length) {
      statusClass = '';
      statusText = 'Notes enregistrées, mais pas encore validées. Validez cette synthèse avant de lancer une analyse personnalisée.';
    }

    const metrics = notes.length
      ? `
        <div class="notes-summary-metrics">
          <div class="notes-summary-metric">
            <small>Matières</small>
            <strong>${summary.count}</strong>
          </div>
          <div class="notes-summary-metric">
            <small>Moyenne simple</small>
            <strong>${formatScore(summary.average)}/20</strong>
          </div>
          <div class="notes-summary-metric">
            <small>Série du Bac</small>
            <strong>${escapeHtml(series)}</strong>
          </div>
        </div>
      `
      : '';

    const notesRows = notes.length
      ? `
        <div class="notes-summary-list">
          ${notes.map((item) => `
            <div class="notes-summary-row">
              <strong>${escapeHtml(item.subject)}</strong>
              <span class="notes-summary-score">${formatScore(item.score)}/20</span>
            </div>
          `).join('')}
        </div>
      `
      : '';

    const highlights = notes.length
      ? `
        <div class="notes-summary-metrics">
          <div class="notes-summary-metric">
            <small>Meilleure note</small>
            <strong>${escapeHtml(summary.highest.subject)} · ${formatScore(summary.highest.score)}</strong>
          </div>
          <div class="notes-summary-metric">
            <small>Point à renforcer</small>
            <strong>${escapeHtml(summary.lowest.subject)} · ${formatScore(summary.lowest.score)}</strong>
          </div>
          <div class="notes-summary-metric">
            <small>Notes ≥ 12</small>
            <strong>${summary.strengths.length}</strong>
          </div>
        </div>
      `
      : '';

    card.innerHTML = `
      <div class="notes-validation-head">
        <span class="notes-validation-icon">✓</span>
        <div>
          <h3 class="notes-validation-title">Synthèse de mes notes</h3>
          <p class="notes-validation-subtitle">
            Vérifiez cette synthèse avant de l’autoriser pour les analyses,
            recommandations, classements et tests d’éligibilité.
          </p>
        </div>
      </div>

      <div class="notes-validation-status ${statusClass}">
        ${escapeHtml(statusText)}
      </div>

      ${metrics}
      ${highlights}
      ${notesRows}

      <div class="notes-validation-actions">
        <button
          id="validateNotesForAnalysisButton"
          type="button"
          ${notes.length ? '' : 'disabled'}
        >
          ${profile ? '✓ Notes validées pour les analyses' : 'Valider et utiliser pour mes analyses'}
        </button>
        <p class="notes-validation-help">
          La validation reste locale. Les notes validées sont envoyées au
          service AprèsBac IA uniquement lorsque vous demandez une analyse.
        </p>
      </div>
    `;

    document
      .querySelector('[data-tool="notes"]')
      ?.classList.toggle('notes-profile-valid', Boolean(profile));
  }

  function validateNotes() {
    const notes = currentNotes();
    const series = currentSeries();

    if (!notes.length) {
      showToast('Ajoutez au moins une note avant la validation.');
      return;
    }

    const summary = computeSummary(notes);
    const profile = {
      profile_id: crypto.randomUUID
        ? crypto.randomUUID()
        : `notes-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      version: VERSION,
      series,
      notes,
      summary,
      signature: signature(notes, series),
      validated_at: new Date().toISOString(),
    };

    localStorage.setItem(VALIDATED_KEY, JSON.stringify(profile));
    renderCard();
    showToast(`${notes.length} note${notes.length > 1 ? 's' : ''} validée${notes.length > 1 ? 's' : ''} pour les analyses.`);

    window.dispatchEvent(new CustomEvent('apresbac:notes-validated', {
      detail: profile,
    }));
  }

  function openNotesModalForValidation() {
    const modal = document.getElementById('notesModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderCard();

    window.setTimeout(() => {
      document
        .getElementById('notesValidationCard2169')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  function requestNeedsValidatedNotes(target) {
    const tool = target.closest('[data-tool]');
    if (tool && PERSONALIZED_TOOLS.has(tool.dataset.tool)) return true;

    const promptButton = target.closest('[data-prompt]');
    const prompt = promptButton?.dataset.prompt || promptButton?.textContent || '';

    return /analyse mon profil|classement|recommandation|éligibilit/i.test(prompt);
  }

  function installAnalysisGuard() {
    document.addEventListener(
      'click',
      (event) => {
        if (!requestNeedsValidatedNotes(event.target)) return;

        const notes = currentNotes();
        if (!notes.length || validProfile()) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        openNotesModalForValidation();
        showToast('Validez d’abord la synthèse de vos notes.');
      },
      true,
    );
  }

  function installValidationEvents() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('#validateNotesForAnalysisButton')) {
        event.preventDefault();
        validateNotes();
      }

      if (
        event.target.closest('#addNoteButton')
        || event.target.closest('[data-delete-note]')
        || event.target.closest('[data-edit-note]')
        || event.target.closest('#clearNotesButton')
        || event.target.closest('#importOcrButton')
      ) {
        window.setTimeout(renderCard, 80);
        window.setTimeout(renderCard, 350);
      }
    });

    document.getElementById('seriesSelect')?.addEventListener('change', () => {
      window.setTimeout(renderCard, 0);
    });

    const notesList = document.getElementById('notesList');
    if (notesList && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(renderCard, 40);
      });

      observer.observe(notesList, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    const modal = document.getElementById('notesModal');
    if (modal && 'MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        if (!modal.classList.contains('hidden')) renderCard();
      });

      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  function installFetchBridge() {
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string'
        ? input
        : String(input?.url || '');

      if (!url.includes(FUNCTION_FRAGMENT) || !init?.body) {
        return originalFetch(input, init);
      }

      try {
        const body = typeof init.body === 'string'
          ? JSON.parse(init.body)
          : init.body;

        if (!body || body.action !== 'chat') {
          return originalFetch(input, init);
        }

        const profile = validProfile();
        const current = currentNotes();

        const nextBody = {
          ...body,
          notes: profile
            ? profile.notes.map((item) => ({
                subject: item.subject,
                subject_name: item.subject,
                name: item.subject,
                score: Number(item.score),
                value: Number(item.score),
                source: item.source || 'validated_public_web',
                validated: true,
              }))
            : [],
          context: {
            ...(body.context || {}),
            notes_validation: profile
              ? {
                  status: 'validated',
                  profile_id: profile.profile_id,
                  validated_at: profile.validated_at,
                  series: profile.series,
                  count: profile.summary?.count || profile.notes.length,
                  average: profile.summary?.average ?? null,
                  signature: profile.signature,
                  version: VERSION,
                }
              : {
                  status: current.length ? 'pending_validation' : 'no_notes',
                  count: current.length,
                  series: currentSeries(),
                  version: VERSION,
                },
          },
        };

        return originalFetch(input, {
          ...init,
          body: JSON.stringify(nextBody),
        });
      } catch (error) {
        console.warn('[AprèsBac notes validation V2.16.9]', error);
        return originalFetch(input, init);
      }
    };
  }

  function start() {
    injectStyles();
    ensureCard();
    renderCard();
    installValidationEvents();
    installAnalysisGuard();
    installFetchBridge();

    window.setTimeout(renderCard, 300);
    window.setTimeout(renderCard, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.__APRESBAC_NOTES_VALIDATION_V2_16_9__ = {
    renderCard,
    validateNotes,
    validProfile,
    computeSummary,
  };
})();
