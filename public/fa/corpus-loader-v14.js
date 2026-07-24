(() => {
  'use strict';

  const APP_ORDER = ['GBE', 'GOUDA', 'LETE', 'LOSSO', 'TOULA', 'TCHE', 'DI', 'ABLA', 'SA', 'WOLI', 'FOU', 'TROUKPIN', 'WLIN', 'KA', 'AKLAN', 'YEKOU'];
  const STORAGE_KEY = 'fa_ia_journal_v5_2';
  const CORPUS_VERSION = '2026-07-23-corpus-book-256-v14';
  const PRESENTATION_VERSION = '2026-07-24-corpus-presentation-v15';

  const normalizeBase = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .replace(/^GBE$/, 'GBE')
    .replace(/^YEKU$/, 'YEKOU')
    .replace(/^YEKOU$/, 'YEKOU')
    .replace(/^GUDA$/, 'GOUDA')
    .replace(/^GOUDA$/, 'GOUDA')
    .replace(/^TULA$/, 'TOULA')
    .replace(/^TOULA$/, 'TOULA')
    .replace(/^WINLIN$/, 'WLIN')
    .replace(/^WLIN$/, 'WLIN')
    .replace(/^TRUKPIN$/, 'TROUKPIN')
    .replace(/^TRUNKPIN$/, 'TROUKPIN')
    .replace(/^TROUKPIN$/, 'TROUKPIN')
    .replace(/^FU$/, 'FOU')
    .replace(/^FOU$/, 'FOU')
    .replace(/^LETE$/, 'LETE')
    .replace(/^TCHE$/, 'TCHE');

  const cleanStoredAnswer = (value) => String(value || '')
    .replace(/Interprétation intégrale\s+du\s+livre/gi, 'Interprétation intégrale')
    .replace(/Texte correspondant à l[’']entrée[^\n.!?…]*(?:[.!?…]+|$)/gi, '')
    .replace(/^\s*(?:Référence documentaire|Référence du document|Source documentaire|Source|Page PDF|Entrée n[°o])\s*:.*$/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const missingMessage = (name) => `${name} fait partie des 19 signes sur 256 dont l’interprétation n’est pas présente dans la version actuelle du corpus. Son contenu sera complété bientôt. Aucune interprétation ne sera générée ou inventée avant cette complétion.`;

  const exactReading = (entry, displayedName) => `Interprétation intégrale - ${displayedName}\n\n${entry.text}`;

  const normalizeHeading = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  function sanitizeCorpus(corpus) {
    for (const entry of Object.values(corpus.entries || {})) {
      const paragraphs = String(entry.text || '').split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
      while (paragraphs.length && /^LES DERIVE/.test(normalizeHeading(paragraphs.at(-1)))) paragraphs.pop();
      entry.text = paragraphs.join('\n\n');

      // Deux titres sont coupés sur plusieurs lignes dans l’extraction du PDF.
      // On retire uniquement le fragment de titre répété, sans réécrire le corpus.
      if (entry.number === 41 && entry.text.startsWith('TRUNKPIN Est le')) entry.text = entry.text.slice('TRUNKPIN '.length);
      if (entry.number === 126 && entry.text.startsWith('ABLA AKLAN DO ABLAdit')) entry.text = entry.text.slice('ABLA '.length);
    }
    return corpus;
  }

  async function decodeCorpus() {
    const binary = atob(window.FA_BOOK_CORPUS_B64 || '');
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (typeof DecompressionStream !== 'function') throw new Error('Décompression du corpus non prise en charge par ce navigateur.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    const corpus = sanitizeCorpus(JSON.parse(text));
    if (corpus.version !== CORPUS_VERSION || corpus.documented_count !== 237 || corpus.missing_count !== 19) {
      throw new Error('Corpus FA incomplet ou version inattendue.');
    }
    const total = Object.keys(corpus.entries || {}).length + (corpus.missing || []).length;
    if (total !== 256) throw new Error(`Matrice FA incomplète : ${total}/256.`);
    return corpus;
  }

  function migrateJournal(corpus) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : (parsed.entries || []);
      let changed = false;

      for (const item of entries) {
        if (!item?.sign) continue;
        const first = APP_ORDER[(Number(item.sign.x) || 0) - 1];
        const second = APP_ORDER[(Number(item.sign.y) || 0) - 1];
        if (!first || !second) continue;

        const key = `${first}|${second}`;
        const source = corpus.entries[key];
        const name = item.sign.name || `${first} - ${second}`;
        if (!Array.isArray(item.msg)) item.msg = [];

        const introIndex = item.msg.findIndex((message, index) => index > 0 && message?.r === 'assistant');
        const oldText = introIndex >= 0 ? String(item.msg[introIndex]?.t || '') : '';
        const requiresMigration = item.corpus_presentation_version !== PRESENTATION_VERSION
          || /Interprétation intégrale\s+du\s+livre|Référence documentaire|Texte correspondant à l[’']entrée/i.test(oldText);

        if (!requiresMigration) continue;

        const replacement = source ? exactReading(source, name) : missingMessage(name);
        const corpusMessage = { r: 'assistant', t: cleanStoredAnswer(replacement), corpus: true };
        if (introIndex >= 0) item.msg[introIndex] = corpusMessage;
        else item.msg.push(corpusMessage);

        item.corpus_version = CORPUS_VERSION;
        item.corpus_presentation_version = PRESENTATION_VERSION;
        item.corpus_key = key;
        changed = true;
      }

      if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: '5.2',
          corpus_version: CORPUS_VERSION,
          corpus_presentation_version: PRESENTATION_VERSION,
          entries,
        }));
      }
    } catch (error) {
      console.warn('Migration du journal FA non appliquée', error);
    }
  }

  window.FA_BOOK_CORPUS_READY = decodeCorpus().then((corpus) => {
    window.FA_BOOK_CORPUS = corpus;
    migrateJournal(corpus);
    window.__FA_CORPUS_TEST__ = {
      version: corpus.version,
      presentationVersion: PRESENTATION_VERSION,
      documented: Object.keys(corpus.entries).length,
      missing: corpus.missing.length,
      total: Object.keys(corpus.entries).length + corpus.missing.length,
      has: (first, second) => Boolean(corpus.entries[`${normalizeBase(first)}|${normalizeBase(second)}`]),
      isMissing: (first, second) => corpus.missing.includes(`${normalizeBase(first)}|${normalizeBase(second)}`),
    };
    return corpus;
  }).catch((error) => {
    console.error('Échec du chargement du corpus FA', error);
    window.__FA_CORPUS_ERROR__ = error;
    throw error;
  });
})();