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
    comprehensive: {
      title: 'Comprendre le signe en profondeur',
      minWords: 190,
      maxWords: 300,
      instruction: 'À partir de l’interprétation intégrale du signe, expliquer son message central dans le contexte précis de la consultation. Distinguer clairement la dynamique principale, les forces disponibles, les difficultés, les conditions d’évolution et l’orientation la plus juste. Ne pas recopier intégralement le corpus et ne pas produire de généralités détachées de la question.',
      structure: ['Message central', 'Application à la situation', 'Point de vigilance', 'Orientation'],
    },
    positive: {
      title: 'Lumière et ouvertures',
      minWords: 120,
      maxWords: 210,
      instruction: 'Identifier les ouvertures, protections, qualités et possibilités favorables réellement soutenues par l’interprétation intégrale. Expliquer comment elles peuvent se manifester dans le contexte de la consultation et sous quelles conditions elles deviennent utiles.',
      structure: ['Ouvertures', 'Conditions favorables', 'Conseil'],
    },
    warning: {
      title: 'Vigilances et obstacles',
      minWords: 120,
      maxWords: 210,
      instruction: 'Dégager les risques, erreurs, blocages, excès ou comportements aggravants contenus dans l’interprétation intégrale. Les relier directement à la situation de l’utilisateur, sans fatalisme, sans accusation occulte et sans dramatisation.',
      structure: ['Vigilances', 'Ce qui peut aggraver', 'Prudence à adopter'],
    },
    relationship: {
      title: 'Amour, famille et relations',
      minWords: 140,
      maxWords: 230,
      instruction: 'Analyser uniquement la dimension relationnelle du signe : couple, famille, entourage, confiance, parole, loyauté, limites et responsabilités. Adapter l’analyse à la question posée et au contexte de consultation.',
      structure: ['Dynamique relationnelle', 'Risque relationnel', 'Attitude recommandée'],
    },
    work: {
      title: 'Travail, argent et projets',
      minWords: 140,
      maxWords: 230,
      instruction: 'Interpréter le signe dans les domaines du travail, de l’argent, de l’entreprise et des projets. Montrer les opportunités, les contraintes concrètes, les décisions à éviter et les conditions de progression, en restant strictement ancré dans l’interprétation intégrale.',
      structure: ['Potentiel', 'Contraintes', 'Décision utile'],
    },
    health: {
      title: 'Santé et équilibre',
      minWords: 100,
      maxWords: 180,
      instruction: 'Présenter uniquement une lecture symbolique de l’équilibre, du rythme de vie, du repos, des tensions et de la prudence. Ne poser aucun diagnostic, ne recommander aucun traitement et orienter vers un professionnel de santé en présence de symptômes ou de danger.',
      structure: ['Lecture symbolique', 'Équilibre à préserver', 'Prudence'],
    },
    action: {
      title: 'Conseils et conduite à tenir',
      minWords: 110,
      maxWords: 190,
      instruction: 'Transformer l’interprétation intégrale en conseils pratiques, réalistes et hiérarchisés pour la situation présente. Distinguer ce qu’il faut clarifier, éviter, entreprendre et observer. Ne détailler aucun rituel réservé ; toute pratique traditionnelle doit être validée par un Bokonon qualifié.',
      structure: ['À clarifier', 'À éviter', 'À faire maintenant'],
    },
    summary: {
      title: 'Résumé essentiel',
      minWords: 65,
      maxWords: 120,
      instruction: 'Donner une synthèse très claire et concise de l’interprétation appliquée à la consultation : message principal, force, vigilance et orientation immédiate. Ne pas répéter de longues phrases du corpus.',
      structure: ['Message', 'Force', 'Vigilance', 'Orientation'],
    },
    free_question: {
      title: 'Réponse à votre question',
      minWords: 130,
      maxWords: 230,
      instruction: 'Répondre directement et précisément à la question libre de l’utilisateur en interprétant l’interprétation intégrale dans son contexte. Expliquer le lien entre le signe et la question, distinguer ce qui est favorable, ce qui demande prudence et l’orientation concrète à retenir.',
      structure: ['Réponse directe', 'Lecture du signe dans ce contexte', 'Orientation'],
    },
  };

  const selectProfile = (payload) => {
    const requestedKey = payload.focus?.intent_key || 'comprehensive';
    const focusLabel = normalizeText(payload.focus?.label);
    const userMessage = normalizeText(payload.user_message);
    const isFreeQuestion = requestedKey === 'comprehensive' && userMessage && focusLabel && userMessage !== focusLabel;
    const key = isFreeQuestion ? 'free_question' : (PROFILES[requestedKey] ? requestedKey : 'free_question');
    return { key, profile: PROFILES[key] };
  };

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

    const isInitialReading = (payload.focus?.intent_key === 'comprehensive') && (!Array.isArray(payload.history) || payload.history.length === 0);
    if (isInitialReading) {
      return makeResponse(exactReading(entry, displayedName), {
        corpus_key: key,
        corpus_entry_number: entry.number,
        corpus_exact: true,
      });
    }

    const { key: analysisKey, profile } = selectProfile(payload);
    const consultationQuestion = payload.user_message || payload.context?.intention || '';
    const enriched = {
      ...payload,
      focus: {
        ...(payload.focus || {}),
        intent_key: analysisKey,
        label: profile.title,
        instruction: profile.instruction,
        required_sections: profile.structure,
      },
      context: {
        ...(payload.context || {}),
        consultation_question: consultationQuestion,
        interpretation_mode: 'contextual_divinatory_analysis',
      },
      corpus: {
        version: corpus.version,
        source: corpus.source,
        key,
        entry_number: entry.number,
        original_title: entry.original_title,
        pdf_page: entry.pdf_page,
        exact_text: entry.text,
        primary_interpretation: entry.text,
      },
      analysis_contract: {
        role: 'Assistant IA expert en interprétation divinatoire du Fâ, rigoureux, clair et prudent.',
        primary_basis: 'Utiliser exclusivement l’interprétation intégrale fournie dans corpus.exact_text comme fondement de l’analyse.',
        task: profile.instruction,
        consultation_theme: payload.context?.category || '',
        consultation_intention: payload.context?.intention || '',
        user_question: consultationQuestion,
        output_title: profile.title,
        output_sections: profile.structure,
        style: 'Français clair, précis, compréhensible, contextualisé, sans répétition et sans longue introduction.',
        forbidden: [
          'Inventer un verset, un proverbe, un rituel, un interdit ou une prescription absente du corpus',
          'Combiner de manière générique les deux signes fondamentaux à la place du signe exact',
          'Mentionner le livre, la page, le numéro d’entrée, une référence documentaire ou une source',
          'Recopier intégralement l’interprétation intégrale dans la réponse analytique',
          'Présenter une prédiction comme certaine ou fatale',
        ],
      },
      constraints: {
        ...(payload.constraints || {}),
        document_only: true,
        exact_corpus_entry_required: true,
        use_exact_interpretation_as_primary_basis: true,
        contextualize_with_consultation: true,
        answer_user_question_directly: true,
        refuse_external_knowledge: true,
        refuse_invention: true,
        no_generic_base_sign_combination: true,
        no_source_reference_in_answer: true,
        do_not_mention_book: true,
        do_not_repeat_full_corpus: true,
        simple_french: true,
        concise_but_substantive: true,
        min_words: profile.minWords,
        max_words: profile.maxWords,
        max_paragraphs: 5,
      },
    };

    try {
      const response = await previousFetch(url, { ...options, body: JSON.stringify(enriched) });
      if (response.status === 402) return response;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.clone().json();
      if (!data?.answer) throw new Error('Réponse vide');
      const { answer, ...metadata } = data;
      return makeResponse(answer, {
        ...metadata,
        corpus_key: key,
        corpus_analysis: true,
        analysis_intent: analysisKey,
      });
    } catch (error) {
      console.warn('Analyse contextuelle FA indisponible', error);
      return makeResponse(`L’analyse contextuelle « ${profile.title} » est momentanément indisponible. Votre interprétation intégrale reste conservée. Veuillez relancer cette demande dans quelques instants.`, {
        corpus_key: key,
        corpus_analysis_unavailable: true,
        analysis_intent: analysisKey,
      });
    }
  };
})();