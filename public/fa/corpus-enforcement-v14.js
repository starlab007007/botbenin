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

  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  const cleanAnswer = (value) => String(value || '')
    .replace(/Interprétation intégrale\s+du\s+livre/gi, 'Interprétation intégrale')
    .replace(/Texte correspondant à l[’']entrée[^\n.!?…]*(?:[.!?…]+|$)/gi, '')
    .replace(/^\s*(?:Référence documentaire|Référence du document|Source documentaire|Source|Page PDF|Entrée n[°o])\s*:.*$/gmi, '')
    .replace(/\b(?:selon|d[’']après|dans)\s+(?:le|ce)\s+livre\b\s*[:,]?\s*/gi, '')
    .replace(/\b(?:le|ce)\s+livre\s+(?:indique|mentionne|précise|explique|dit)\s+(?:que\s+)?/gi, '')
    .replace(/\b(?:tiré|tirée|issu|issue)\s+du\s+livre\b/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const makeResponse = (answer, metadata = {}) => new Response(JSON.stringify({ answer: cleanAnswer(answer), ...metadata }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-FA-Corpus-Enforced': 'true' },
  });

  const missingMessage = (name) => `${name} fait partie des 19 signes sur 256 dont l’interprétation n’est pas présente dans la version actuelle du corpus. Son contenu sera complété bientôt. Aucune interprétation ne sera générée ou inventée avant cette complétion.`;
  const exactReading = (entry, displayedName) => `Interprétation intégrale - ${displayedName}\n\n${entry.text}`;

  const PROFILES = {
    comprehensive: ['Comprendre le signe en profondeur', 300, 'Explique le message central, les forces, les difficultés, les conditions d’évolution et l’orientation juste dans le contexte précis de la consultation.'],
    positive: ['Lumière et ouvertures', 210, 'Analyse les forces, protections, ouvertures et conditions favorables réellement soutenues par l’interprétation intégrale.'],
    warning: ['Vigilances et obstacles', 210, 'Analyse les risques, blocages et comportements aggravants sans fatalité ni dramatisation.'],
    relationship: ['Amour, famille et relations', 230, 'Analyse le couple, la famille, l’entourage, la confiance, la parole, les limites et les responsabilités.'],
    work: ['Travail, argent et projets', 230, 'Analyse le travail, les ressources, l’entreprise, les projets, les opportunités et les contraintes concrètes.'],
    health: ['Santé et équilibre', 180, 'Donne uniquement une lecture symbolique de l’équilibre, du rythme de vie, du repos et de la prudence, sans diagnostic ni traitement.'],
    action: ['Conseils et conduite à tenir', 190, 'Transforme le message en conseils pratiques et hiérarchisés : ce qu’il faut clarifier, éviter, entreprendre et observer, sans inventer de rituel.'],
    summary: ['Résumé essentiel', 120, 'Donne une synthèse concise : message principal, force, vigilance et orientation immédiate.'],
    free_question: ['Réponse à votre question', 230, 'Réponds directement à la question de l’utilisateur en reliant précisément le signe au contexte de la consultation.'],
  };

  const selectProfile = (payload) => {
    const requested = payload.focus?.intent_key || 'comprehensive';
    const label = normalizeText(payload.focus?.label);
    const message = normalizeText(payload.user_message);
    const free = requested === 'comprehensive' && message && label && message !== label;
    const key = free ? 'free_question' : (PROFILES[requested] ? requested : 'free_question');
    const [title, maxWords, instruction] = PROFILES[key];
    return { key, title, maxWords, instruction };
  };

  const compactHistory = (history) => (Array.isArray(history) ? history : [])
    .filter((item) => !/^Interprétation intégrale\s*-/i.test(String(item?.content || '')))
    .slice(-6)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.content || '').slice(0, 1200),
    }));

  window.faAuthenticatedFetch = async (url, options = {}) => {
    let payload;
    try { payload = JSON.parse(options.body || '{}'); } catch { return previousFetch(url, options); }
    if (payload?.action !== 'interpret' || !payload?.sign) return previousFetch(url, options);

    let corpus;
    try { corpus = await window.FA_BOOK_CORPUS_READY; }
    catch {
      return makeResponse('Le corpus du Fâ n’a pas pu être chargé. La lecture est suspendue afin d’éviter toute interprétation non vérifiée.', { corpus_error: true });
    }

    const first = normalizeBase(payload.sign.x);
    const second = normalizeBase(payload.sign.y);
    const key = `${first}|${second}`;
    const displayedName = payload.sign.canonical_name || `${first} - ${second}`;
    const entry = corpus.entries[key];

    if (!entry) return makeResponse(missingMessage(displayedName), { corpus_key: key, corpus_missing: true });

    const initial = payload.focus?.intent_key === 'comprehensive' && (!Array.isArray(payload.history) || payload.history.length === 0);
    if (initial) {
      return makeResponse(exactReading(entry, displayedName), {
        corpus_key: key,
        corpus_entry_number: entry.number,
        corpus_exact: true,
      });
    }

    const profile = selectProfile(payload);
    const originalQuestion = String(payload.user_message || payload.context?.intention || '').trim();
    const transportMessage = [
      `DEMANDE : ${originalQuestion || profile.title}`,
      `THÈME DE CONSULTATION : ${payload.context?.category || 'Question libre'}`,
      `INTENTION : ${payload.context?.intention || 'Non précisée'}`,
      `ANGLE D’ANALYSE : ${profile.title}`,
      `CONSIGNE : ${profile.instruction}`,
      `INTERPRÉTATION INTÉGRALE DU SIGNE ${displayedName} À UTILISER EXCLUSIVEMENT :`,
      entry.text,
      `RÉPONSE ATTENDUE : français clair, précis et contextualisé, maximum ${profile.maxWords} mots. Ne mentionne aucune source, page, entrée ou livre. N’invente aucun verset, rituel, interdit ou prescription.`,
    ].join('\n\n');

    // Le backend historique waouh-fa-chat attend ce contrat compact.
    // Le corpus n’est envoyé qu’une seule fois pour éviter les dépassements de taille et de contexte.
    const compatiblePayload = {
      action: 'interpret',
      sign: payload.sign,
      context: {
        category: payload.context?.category || '',
        intention: payload.context?.intention || '',
        locale: payload.context?.locale || 'fr-BJ',
      },
      focus: {
        intent_key: profile.key,
        label: profile.title,
        instruction: profile.instruction,
        required_sections: [profile.title],
        excluded_angles: [],
      },
      history: compactHistory(payload.history),
      user_message: transportMessage,
      constraints: {
        document_only: true,
        simple_french: true,
        max_words: profile.maxWords,
        hide_sources: true,
        differentiate_each_payload: true,
        contextualize_with_intention: true,
        no_invented_ritual: true,
        no_occult_accusation: true,
      },
      device_id: payload.device_id,
      access_code: payload.access_code,
    };

    try {
      const response = await previousFetch(url, { ...options, body: JSON.stringify(compatiblePayload) });
      if (response.status === 402) return response;
      const text = await response.clone().text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Réponse serveur non JSON'); }
      if (!data?.answer) throw new Error('Réponse vide');
      const { answer, ...metadata } = data;
      return makeResponse(answer, {
        ...metadata,
        corpus_key: key,
        corpus_analysis: true,
        analysis_intent: profile.key,
      });
    } catch (error) {
      console.error('Échec waouh-fa-chat', { message: error.message, corpusKey: key, intent: profile.key });
      return makeResponse(`L’analyse « ${profile.title} » n’a pas pu être générée. Vérifiez votre connexion puis relancez ce payload. L’interprétation intégrale du signe reste disponible au-dessus.`, {
        corpus_key: key,
        corpus_analysis_unavailable: true,
        analysis_intent: profile.key,
        diagnostic: String(error.message || error).slice(0, 180),
      });
    }
  };
})();