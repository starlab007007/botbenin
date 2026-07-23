(() => {
  'use strict';

  const previousFetch = window.faAuthenticatedFetch
    ? window.faAuthenticatedFetch.bind(window)
    : window.fetch.bind(window);

  const normalizeBase = (value) => {
    const compact = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
    const aliases = { YEKU: 'YEKOU', GUDA: 'GOUDA', TULA: 'TOULA', WINLIN: 'WLIN', TRUKPIN: 'TROUKPIN', TRUNKPIN: 'TROUKPIN', FU: 'FOU' };
    return aliases[compact] || compact;
  };

  const makeResponse = (answer, metadata = {}) => new Response(JSON.stringify({ answer, ...metadata }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-FA-Corpus-Enforced': 'true' },
  });

  const missingMessage = (name) => `${name} fait partie des 19 signes sur 256 dont l’interprétation n’est pas présente dans la version actuelle du livre « 256 signe de fa ». Son corpus sera complété bientôt. Aucune interprétation ne sera générée ou inventée avant cette complétion.`;

  const exactReading = (entry, displayedName) => `Interprétation intégrale du livre — ${displayedName}\n\n${entry.text}\n\nRéférence documentaire : entrée n° ${entry.number} — « ${entry.original_title} », page PDF ${entry.pdf_page}.`;

  window.faAuthenticatedFetch = async (url, options = {}) => {
    let payload;
    try { payload = JSON.parse(options.body || '{}'); } catch { return previousFetch(url, options); }
    if (payload?.action !== 'interpret' || !payload?.sign) return previousFetch(url, options);

    let corpus;
    try { corpus = await window.FA_BOOK_CORPUS_READY; }
    catch {
      return makeResponse('Le corpus documentaire du Fâ n’a pas pu être chargé. La lecture est suspendue afin d’éviter toute interprétation non vérifiée.', { corpus_error: true });
    }

    const first = normalizeBase(payload.sign.x);
    const second = normalizeBase(payload.sign.y);
    const key = `${first}|${second}`;
    const displayedName = payload.sign.canonical_name || `${first} - ${second}`;
    const entry = corpus.entries[key];

    if (!entry) return makeResponse(missingMessage(displayedName), { corpus_key: key, corpus_missing: true });

    const isInitialReading = (payload.focus?.intent_key === 'comprehensive') && (!Array.isArray(payload.history) || payload.history.length === 0);
    if (isInitialReading) {
      return makeResponse(exactReading(entry, displayedName), {
        corpus_key: key,
        corpus_entry_number: entry.number,
        corpus_exact: true,
      });
    }

    const enriched = {
      ...payload,
      corpus: {
        version: corpus.version,
        source: corpus.source,
        key,
        entry_number: entry.number,
        original_title: entry.original_title,
        pdf_page: entry.pdf_page,
        exact_text: entry.text,
      },
      constraints: {
        ...(payload.constraints || {}),
        document_only: true,
        exact_corpus_entry_required: true,
        refuse_external_knowledge: true,
        refuse_invention: true,
        no_generic_base_sign_combination: true,
      },
    };

    try {
      const response = await previousFetch(url, { ...options, body: JSON.stringify(enriched) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.clone().json();
      if (!data?.answer) throw new Error('Réponse vide');
      return response;
    } catch (error) {
      console.warn('Chat FA indisponible, retour au texte documentaire exact', error);
      return makeResponse(`Le service conversationnel est momentanément indisponible. Voici la seule lecture vérifiée disponible pour ${displayedName} :\n\n${entry.text}`, {
        corpus_key: key,
        corpus_fallback_exact: true,
      });
    }
  };
})();
