(() => {
  'use strict';

  const VERSION = '2.16.10';
  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';

  const SUBJECTS = [
    ['Mathématiques', ['mathematiques', 'mathematique', 'maths', 'math'], ['A1','A2','B','C','D','E','F1','F2','F3','F4','G1','G2','G3','EA','DEAT','DT']],
    ['Français', ['francais', 'langue francaise', 'expression francaise'], ['A1','A2','B','C','D','E','F1','F2','F3','F4','G1','G2','G3','EA','DEAT','DT']],
    ['Anglais', ['anglais', 'english', 'langue anglaise'], ['A1','A2','B','C','D','E','F1','F2','F3','F4','G1','G2','G3','EA','DEAT','DT']],
    ['Philosophie', ['philosophie', 'philo'], ['A1','A2','B','C','D','E','G1','G2','G3']],
    ['Histoire-Géographie', ['histoire geographie', 'histoire geo', 'hist geo', 'geographie histoire'], ['A1','A2','B','C','D','E','G1','G2','G3']],
    ['EPS', ['eps', 'education physique et sportive', 'education physique', 'sport'], ['A1','A2','B','C','D','E','F1','F2','F3','F4','G1','G2','G3','EA','DEAT','DT']],
    ['Littérature française', ['litterature francaise', 'litterature', 'lettres modernes'], ['A1','A2']],
    ['Allemand', ['allemand', 'deutsch'], ['A1','A2']],
    ['Espagnol', ['espagnol', 'espanol'], ['A1','A2']],
    ['Portugais', ['portugais'], ['A1','A2']],
    ['Latin', ['latin'], ['A1','A2']],
    ['Langues nationales', ['langues nationales', 'langue nationale'], ['A1','A2']],
    ['Physique-Chimie', ['physique chimie', 'physique-chimie', 'physique et chimie', 'pc'], ['C','D','E','EA']],
    ['Sciences physiques', ['sciences physiques', 'science physique'], ['C','D','E','F1','F2','F3','F4','EA','DEAT','DT']],
    ['SVT', ['svt', 'sciences de la vie et de la terre', 'sciences naturelles'], ['C','D','EA']],
    ['Biologie-Géologie', ['biologie geologie', 'biologie-geologie', 'biologie', 'geologie'], ['D','EA']],
    ['Informatique', ['informatique', 'programmation', 'algorithmique', 'tic'], ['C','D','E','F1','F2','F3','F4','G1','G2','G3','DT','DEAT']],
    ['Économie', ['economie', 'sciences economiques', 'economie generale'], ['B','G1','G2','G3']],
    ['Comptabilité', ['comptabilite', 'compta', 'comptabilite generale'], ['B','G1','G2','G3']],
    ['Gestion', ['gestion', 'techniques de gestion', 'management'], ['B','G1','G2','G3']],
    ['Droit', ['droit', 'legislation'], ['B','G1','G2','G3']],
    ['Techniques commerciales', ['techniques commerciales', 'technique commerciale', 'commerce', 'marketing'], ['G1','G2','G3']],
    ['Mathématiques financières', ['mathematiques financieres', 'maths financieres', 'calcul financier'], ['G1','G2','G3']],
    ['Électrotechnique', ['electrotechnique', 'electro technique', 'electricite', 'electrotech'], ['E','F1','F2','F3','F4','DT','DEAT']],
    ['Électronique', ['electronique', 'circuits electroniques'], ['E','F2','F3','DT','DEAT']],
    ['Construction mécanique', ['construction mecanique', 'mecanique construction', 'technologie mecanique'], ['E','F1','F2','F3','F4','DT','DEAT']],
    ['Mécanique générale', ['mecanique generale', 'mecanique'], ['E','F1','F2','F3','F4','DT','DEAT']],
    ['Dessin technique', ['dessin technique', 'dessin industriel'], ['E','F1','F2','F3','F4','DT','DEAT']],
    ['Technologie', ['technologie', 'technologie generale'], ['E','F1','F2','F3','F4','DT','DEAT']],
    ['Génie civil', ['genie civil', 'construction civile'], ['F4','DT','DEAT']],
    ['Bâtiment', ['batiment', 'construction batiment'], ['F4','DT','DEAT']],
    ['Topographie', ['topographie', 'topometrie'], ['F4','DT','DEAT']],
    ['Énergétique', ['energetique', 'thermique', 'froid et climatisation'], ['F1','F3','DT','DEAT']],
    ['Maintenance industrielle', ['maintenance industrielle', 'maintenance', 'entretien industriel'], ['F1','F2','F3','DT','DEAT']],
    ['Agronomie', ['agronomie', 'agriculture'], ['EA','DEAT']],
    ['Production végétale', ['production vegetale', 'productions vegetales', 'phytotechnie'], ['EA','DEAT']],
    ['Production animale', ['production animale', 'productions animales', 'zootechnie'], ['EA','DEAT']],
    ['Sciences agricoles', ['sciences agricoles', 'science agricole'], ['EA','DEAT']],
  ].map(([name, aliases, series]) => ({ name, aliases, series }));

  const IGNORED = ['coefficient','coef','moyenne','total','rang','numero','matricule','annee','session','semestre','trimestre','credit','mention','decision','admis','numero de table'];

  let selectedSubject = '';
  let pendingAdd = null;
  let refreshTimer = null;
  let ocrTimer = null;

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
      .replace(/[’'`´]/g, ' ')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
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
    return Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  function series() {
    return $('#seriesSelect')?.value || localStorage.getItem(SERIES_KEY) || 'Toutes';
  }

  function notesMap() {
    const map = new Map();
    const values = readJson(NOTES_KEY, []);
    if (!Array.isArray(values)) return map;
    values.forEach((item) => {
      const subject = String(item?.subject || '').trim();
      const score = Number(item?.score);
      if (subject && Number.isFinite(score)) map.set(norm(subject), { subject, score, source: item?.source || 'manual' });
    });
    return map;
  }

  function subjectOrder() {
    const current = series();
    if (current === 'Toutes') return SUBJECTS;
    return [...SUBJECTS.filter((item) => item.series.includes(current)), ...SUBJECTS.filter((item) => !item.series.includes(current))];
  }

  function levenshtein(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
    }
    return matrix[a.length][b.length];
  }

  function similarity(a, b) {
    return 1 - (levenshtein(a, b) / Math.max(a.length, b.length, 1));
  }

  function canonical(raw) {
    const input = norm(raw);
    if (!input) return null;
    let best = null;
    for (const item of subjectOrder()) {
      for (const rawAlias of [item.name, ...item.aliases]) {
        const alias = norm(rawAlias);
        if (!alias) continue;
        let score = 0;
        if (input === alias) score = 1;
        else if (input.includes(alias) || alias.includes(input)) score = Math.min(input.length, alias.length) / Math.max(input.length, alias.length);
        else if (alias.length >= 5 && input.length >= 4) score = similarity(input, alias);
        if (score >= 0.72 && (!best || score > best.score)) best = { name: item.name, score };
      }
    }
    return best;
  }

  function styles() {
    if ($('#notesOcr21610Style')) return;
    const style = document.createElement('style');
    style.id = 'notesOcr21610Style';
    style.textContent = `
      #notesModal .notes-inline-selected.smart-note-selected{grid-column:1/-1;position:sticky;top:0;z-index:4;box-shadow:0 8px 20px rgba(34,66,82,.10)}
      #notesModal .smart-note-binding{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;margin:0 0 10px;padding:11px 13px;border:1px solid #c9d9f6;border-radius:15px;color:#1d4fc1;background:#f0f5ff}
      #notesModal .smart-note-binding strong,#notesModal .smart-note-binding small{display:block}#notesModal .smart-note-binding small{margin-top:2px;color:#66758e;font-size:11px}
      #notesModal .smart-note-score{min-width:72px;padding:7px 10px;border-radius:999px;color:#fff;background:#2f66eb;text-align:center;font-weight:900}#notesModal .smart-note-score.empty{color:#65726c;background:#e6ece9}
      #notesModal #noteValue.smart-note-ready{border-color:#2f66eb!important;box-shadow:0 0 0 3px rgba(47,102,235,.10)}
      #notesModal .notes-inline-choice{position:relative;padding-right:72px!important}#notesModal .notes-inline-choice.has-note::after{content:attr(data-saved-score);position:absolute;top:50%;right:8px;transform:translateY(-50%);min-width:50px;padding:4px 7px;border-radius:999px;color:#fff;background:#0a8a72;text-align:center;font-size:10px;font-weight:900}
      #notesModal .notes-inline-choice.has-note.selected::after{color:#1f4fd0;background:#fff}#notesModal #addNoteButton.smart-note-update{background:linear-gradient(135deg,#2f66eb,#5279ef)!important}#notesModal #addNoteButton:disabled{opacity:.45!important;box-shadow:none!important}
      .ocr-guide-21610{display:grid;gap:7px;margin:10px 0;padding:11px 12px;border:1px solid #cbded8;border-radius:15px;color:#174b41;background:#f2faf7;font-size:11px;line-height:1.4}.ocr-guide-21610 strong{color:#075f51;font-size:12px}.ocr-guide-chips-21610{display:flex;flex-wrap:wrap;gap:5px}.ocr-guide-chip-21610{padding:4px 7px;border-radius:999px;color:#075f51;background:#e1f3ed;font-weight:800}.ocr-row.semantic-21610{border-color:#bfd2fb!important;background:#f6f8ff!important}.ocr-row.semantic-21610 .ocr-conf{color:#315ec9!important}
      @media(max-width:560px){#notesModal .smart-note-binding{grid-template-columns:1fr}#notesModal .smart-note-score{justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  function selectedValue() {
    const select = $('#subjectSelect');
    const value = select?.value || '';
    return value === 'Autre' ? String($('#customSubject')?.value || '').trim() : value;
  }

  function ensureBinding() {
    const grid = $('#notesModal .form-grid');
    const row = grid?.querySelector('.form-row');
    if (!grid || !row) return null;
    const selectedCard = $('#notesModal .notes-inline-selected');
    if (selectedCard) {
      selectedCard.classList.add('smart-note-selected');
      if (selectedCard.parentElement !== grid) grid.insertBefore(selectedCard, row);
    }
    let binding = $('#smartNoteBinding21610');
    if (!binding) {
      binding = document.createElement('div');
      binding.id = 'smartNoteBinding21610';
      binding.className = 'smart-note-binding';
      row.insertAdjacentElement('beforebegin', binding);
    }
    return binding;
  }

  function badges() {
    const notes = notesMap();
    $$('#notesInlineList2168 [data-inline-subject]').forEach((button) => {
      const note = notes.get(norm(button.dataset.inlineSubject));
      button.classList.toggle('has-note', Boolean(note));
      if (note) button.dataset.savedScore = `${formatScore(note.score)}/20`;
      else delete button.dataset.savedScore;
    });
  }

  function updateBinding(focus = false) {
    const binding = ensureBinding();
    const input = $('#noteValue');
    const button = $('#addNoteButton');
    const subject = selectedValue();
    const existing = subject ? notesMap().get(norm(subject)) : null;
    const typed = Number(input?.value);
    const valid = Number.isFinite(typed) && typed >= 0 && typed <= 20 && String(input?.value || '').trim() !== '';
    selectedSubject = subject;
    if (input) {
      input.placeholder = subject ? `Note de ${subject} /20` : 'Sélectionnez une matière';
      input.setAttribute('aria-label', subject ? `Note de ${subject} sur 20` : 'Sélectionnez une matière');
      input.classList.toggle('smart-note-ready', Boolean(subject));
    }
    if (button) {
      button.disabled = !subject || !valid;
      button.classList.toggle('smart-note-update', Boolean(existing));
      button.textContent = existing ? 'Mettre à jour la note' : 'Ajouter la note';
    }
    if (binding) {
      const shown = valid ? `${formatScore(typed)}/20` : existing ? `${formatScore(existing.score)}/20` : '— /20';
      binding.innerHTML = subject ? `<span><strong>${esc(subject)}</strong><small>${existing ? 'La nouvelle saisie mettra à jour la note existante.' : 'La note saisie sera automatiquement attribuée à cette matière.'}</small></span><span class="smart-note-score${valid || existing ? '' : ' empty'}">${esc(shown)}</span>` : '<span><strong>Sélectionnez une matière</strong><small>Touchez une matière dans la liste, puis saisissez sa note sur 20.</small></span><span class="smart-note-score empty">— /20</span>';
    }
    badges();
    if (focus && subject && input) setTimeout(() => { input.focus({ preventScroll: true }); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 30);
  }

  function nextSubject() {
    const notes = notesMap();
    const buttons = $$('#notesInlineList2168 [data-inline-subject]');
    const index = buttons.findIndex((button) => norm(button.dataset.inlineSubject) === norm(selectedSubject));
    const ordered = [...buttons.slice(index + 1), ...buttons.slice(0, Math.max(0, index + 1))];
    const next = ordered.find((button) => button.dataset.inlineSubject && button.dataset.inlineSubject !== 'Autre' && !notes.has(norm(button.dataset.inlineSubject)));
    if (!next) return updateBinding();
    const api = window.__APRESBAC_NOTES_INLINE_V2_16_8__;
    if (api?.selectSubject) api.selectSubject(next.dataset.inlineSubject);
    else next.click();
    setTimeout(() => updateBinding(true), 40);
  }

  function installNotes() {
    $('#noteValue')?.addEventListener('input', () => updateBinding());
    $('#noteValue')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); $('#addNoteButton')?.click(); } });
    $('#subjectSelect')?.addEventListener('change', () => {
      const subject = selectedValue();
      const note = notesMap().get(norm(subject));
      if ($('#noteValue')) $('#noteValue').value = note ? String(note.score) : '';
      updateBinding(true);
    });
    $('#customSubject')?.addEventListener('input', () => updateBinding());

    document.addEventListener('click', (event) => {
      if (event.target.closest('#addNoteButton')) pendingAdd = { subject: selectedValue(), score: $('#noteValue')?.value };
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-inline-subject]')) setTimeout(() => updateBinding(true), 50);
      if (event.target.closest('#addNoteButton')) {
        const pending = pendingAdd;
        setTimeout(() => {
          if (!pending?.subject) return updateBinding();
          const stored = notesMap().get(norm(pending.subject));
          if (stored) { badges(); updateBinding(); nextSubject(); } else updateBinding();
        }, 150);
      }
      if (event.target.closest('[data-delete-note],[data-edit-note],#clearNotesButton')) setTimeout(() => { badges(); updateBinding(); }, 150);
    });

    const list = $('#notesInlineList2168');
    if (list && 'MutationObserver' in window) {
      new MutationObserver(() => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { badges(); updateBinding(); }, 40); }).observe(list, { childList: true, subtree: true });
    }
    const modal = $('#notesModal');
    if (modal && 'MutationObserver' in window) {
      new MutationObserver(() => { if (!modal.classList.contains('hidden')) setTimeout(() => { ensureBinding(); badges(); updateBinding(); }, 40); }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function repairNumber(raw) {
    let value = String(raw || '').trim().replace(/\s+/g, '').replace(/[OoQ]/g, '0').replace(/[Il|!]/g, '1').replace(/[Ss]/g, '5').replace(/[Bb]/g, '8').replace(/[,;:]/g, '.').replace(/[^0-9./]/g, '');
    if (/^\d{3}$/.test(value) && Number(value) > 20) value = `${value.slice(0, 2)}.${value.slice(2)}`;
    const explicit = value.match(/^(\d{1,2}(?:\.\d{1,2})?)\/20$/);
    const score = Number(explicit ? explicit[1] : value);
    if (!Number.isFinite(score) || score < 0 || score > 20) return null;
    return { score: Math.round(score * 100) / 100, explicit: Boolean(explicit), decimal: String(explicit ? explicit[1] : value).includes('.') };
  }

  function candidate(line, subjectMatch) {
    const ignored = IGNORED.some((term) => norm(line).includes(norm(term)));
    const values = String(line || '').split(/\s+/).map((token, index) => ({ token, index, repaired: repairNumber(token) })).filter((item) => item.repaired).map((item, index, all) => {
      let rank = (item.repaired.explicit ? 150 : 0) + (item.repaired.decimal ? 55 : 0) + (item.repaired.score >= 8 ? 30 : 15) + (index === all.length - 1 ? 12 : 0) + (subjectMatch?.score >= .9 ? 20 : 0);
      if (ignored && item.repaired.score <= 10) rank -= 70;
      return { ...item.repaired, token: item.token, rank };
    });
    return values.sort((a, b) => b.rank - a.rank)[0] || null;
  }

  function findSubject(line) {
    const normalized = norm(line);
    let best = null;
    for (const item of subjectOrder()) {
      for (const rawAlias of [item.name, ...item.aliases]) {
        const alias = norm(rawAlias);
        if (!alias) continue;
        if (normalized.includes(alias)) {
          const score = alias === normalized ? 1 : Math.min(.98, .82 + alias.length / 200);
          if (!best || score > best.score) best = { name: item.name, score };
          continue;
        }
        if (alias.length < 5) continue;
        const words = normalized.split(' '), aliasWords = alias.split(' ');
        for (let i = 0; i <= words.length - aliasWords.length; i += 1) {
          const score = similarity(words.slice(i, i + aliasWords.length).join(' '), alias);
          if (score >= (alias.length >= 12 ? .70 : .78) && (!best || score > best.score)) best = { name: item.name, score };
        }
      }
    }
    return best;
  }

  function semanticExtract(text) {
    const lines = String(text || '').replace(/\r/g, '\n').replace(/[|¦]/g, ' ').replace(/[–—]/g, '-').replace(/\t/g, ' ').split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const found = new Map();
    for (let i = 0; i < lines.length; i += 1) {
      for (const windowText of [lines[i], `${lines[i]} ${lines[i + 1] || ''}`.trim(), `${lines[i]} ${lines[i + 1] || ''} ${lines[i + 2] || ''}`.trim()]) {
        const subject = findSubject(windowText), score = subject && candidate(windowText, subject);
        if (!subject || !score) continue;
        const key = norm(subject.name), guide = SUBJECTS.find((item) => item.name === subject.name), confidence = Math.max(45, Math.min(99, Math.round(48 + subject.score * 32 + (score.explicit ? 12 : 0) + (score.decimal ? 5 : 0) + (guide?.series.includes(series()) ? 5 : 0))));
        const next = { subject: subject.name, score: score.score, confidence, evidence: windowText }, old = found.get(key);
        if (!old || next.confidence > old.confidence) found.set(key, next);
        break;
      }
    }
    return [...found.values()].sort((a, b) => b.confidence - a.confidence);
  }

  function ensureGuide() {
    const zone = $('#scanModal .scan-zone');
    if (!zone) return;
    let guide = $('#ocrGuide21610');
    if (!guide) {
      guide = document.createElement('div'); guide.id = 'ocrGuide21610'; guide.className = 'ocr-guide-21610';
      const sources = $('#scanModal .ocr-sources');
      if (sources) sources.insertAdjacentElement('afterend', guide); else zone.insertAdjacentElement('afterbegin', guide);
    }
    const current = series(), primary = current === 'Toutes' ? SUBJECTS.slice(0, 12) : SUBJECTS.filter((item) => item.series.includes(current));
    guide.innerHTML = `<strong>Reconnaissance guidée — série ${esc(current)}</strong><span>Le scanner recherche les mots, abréviations et variantes OCR des matières, puis attribue chaque note à la matière reconnue.</span><div class="ocr-guide-chips-21610">${primary.slice(0, 14).map((item) => `<span class="ocr-guide-chip-21610">${esc(item.name)}</span>`).join('')}</div>`;
  }

  function semanticRows() {
    const text = $('#scanText')?.value || '', list = $('#ocrList'), review = $('#ocrReview'), title = $('#ocrTitle');
    if (!text.trim() || !list || !review) return;
    const existing = new Map();
    $$('#ocrList [data-row]').forEach((row) => {
      const input = row.querySelector('[data-f="subject"]');
      const match = canonical(input?.value || '');
      if (input && match) input.value = match.name;
      if (input?.value) existing.set(norm(input.value), row);
    });
    let added = 0;
    for (const item of semanticExtract(text)) {
      if (existing.has(norm(item.subject))) continue;
      const id = `semantic-${Date.now()}-${Math.random().toString(36).slice(2)}`, row = document.createElement('div');
      row.className = 'ocr-row semantic-21610'; row.dataset.row = id;
      row.innerHTML = `<input type="checkbox" data-f="check" checked><input type="text" data-f="subject" value="${esc(item.subject)}" maxlength="60"><input type="number" data-f="score" value="${esc(item.score)}" min="0" max="20" step=".01"><button class="ocr-del" data-del="${esc(id)}" type="button">×</button><div class="ocr-conf">Reconnaissance sémantique ${Math.round(item.confidence)} % · ${esc(item.evidence.slice(0, 100))}</div>`;
      list.appendChild(row); existing.set(norm(item.subject), row); added += 1;
    }
    if (list.querySelector('[data-row]')) {
      review.classList.add('on'); const count = list.querySelectorAll('[data-row]').length;
      if (title) title.textContent = `${count} note${count > 1 ? 's' : ''} reconnue${count > 1 ? 's' : ''} — à vérifier`;
    }
    if (added) {
      const quality = $('#ocrQuality');
      if (quality) quality.insertAdjacentHTML('beforeend', `<br><strong>${added} matière${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''} par reconnaissance sémantique.</strong>`);
    }
  }

  function scheduleOcr() { clearTimeout(ocrTimer); ocrTimer = setTimeout(semanticRows, 250); }

  function installOcr() {
    ensureGuide();
    $('#seriesSelect')?.addEventListener('change', () => { ensureGuide(); scheduleOcr(); });
    $('#scanText')?.addEventListener('input', scheduleOcr);
    const list = $('#ocrList');
    if (list && 'MutationObserver' in window) new MutationObserver(scheduleOcr).observe(list, { childList: true, subtree: true });
    const modal = $('#scanModal');
    if (modal && 'MutationObserver' in window) new MutationObserver(() => { if (!modal.classList.contains('hidden')) { ensureGuide(); scheduleOcr(); } }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', (event) => { if (event.target.closest('#runOcrButton')) { setTimeout(scheduleOcr, 1500); setTimeout(scheduleOcr, 5000); setTimeout(scheduleOcr, 12000); } });
  }

  function start() {
    styles(); ensureBinding(); badges(); updateBinding(); installNotes(); installOcr();
    setTimeout(() => { ensureBinding(); badges(); updateBinding(); ensureGuide(); }, 350);
    setTimeout(() => { ensureBinding(); badges(); updateBinding(); ensureGuide(); }, 1400);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start, { once: true }) : start();
  window.__APRESBAC_NOTES_OCR_INTELLIGENCE_V2_16_10__ = { updateBinding, badges, semanticExtract, canonical, semanticRows };
})();
