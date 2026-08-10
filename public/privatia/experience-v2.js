(() => {
  const VERSION = '20260810-experience-v2';

  const waitForExperience = (attempt = 0) => {
    const live = document.querySelector('.pa-live');
    const journey = document.getElementById('usecase');
    if (!live || !journey) {
      if (attempt < 80) setTimeout(() => waitForExperience(attempt + 1), 100);
      return;
    }
    if (document.documentElement.dataset.privataiExperience === VERSION) return;
    document.documentElement.dataset.privataiExperience = VERSION;

    const style = document.createElement('style');
    style.id = 'pa-experience-v2-style';
    style.textContent = `
      .pa-x2-demo-note{display:inline-flex;align-items:center;gap:5px;padding:4px 6px;border-radius:999px;background:#fff7ed;color:#b45309;border:1px solid #fed7aa;font-size:7px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.pa-page[data-theme="dark"] .pa-x2-demo-note{background:#3b2411;color:#fdba74;border-color:#6d3a16}
      .pa-x2-question-title{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:9px}.pa-x2-question-title strong{font-size:9.5px}.pa-x2-sent{display:inline-flex;align-items:center;gap:5px;color:#168153;font-size:7.5px;font-weight:850}.pa-x2-sent:before{content:'✓';display:grid;place-items:center;width:13px;height:13px;border-radius:50%;background:#eaf8f0}
      .pa-x2-query{padding:10px 11px;border-radius:12px;background:#6550e8;color:#fff;font-size:8.1px;line-height:1.52;box-shadow:0 8px 22px rgba(101,80,232,.18)}
      .pa-x2-query b{color:#fff}.pa-x2-search{margin-top:8px;padding:8px 9px;border:1px solid #e3e8ef;border-radius:10px;background:#f8fafc;color:#667085;font-size:7.6px;line-height:1.45}.pa-page[data-theme="dark"] .pa-x2-search{background:#111826;border-color:#2b3548;color:#aeb8c8}
      .pa-x2-answer{display:grid;gap:6px}.pa-x2-answer-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.pa-x2-answer-head strong{font-size:9.5px}.pa-x2-score{padding:4px 6px;border-radius:999px;background:#eefcf4;color:#137a46;font-size:7px;font-weight:900}.pa-page[data-theme="dark"] .pa-x2-score{background:#123123;color:#75e0a7}
      .pa-x2-findings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.pa-x2-finding{padding:8px;border:1px solid #e4e8ef;border-radius:10px;background:#fafbfc;min-width:0}.pa-page[data-theme="dark"] .pa-x2-finding{background:#111826;border-color:#2b3548}.pa-x2-finding b{display:block;color:#27324a!important;font-size:7.7px;line-height:1.3}.pa-page[data-theme="dark"] .pa-x2-finding b{color:#eef2f8!important}.pa-x2-finding p{margin:3px 0 0;color:#667085;font-size:7.1px;line-height:1.38}.pa-x2-refs{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.pa-x2-refs span{padding:3px 4px;border-radius:5px;background:#fff;border:1px solid #dfe4eb;color:#667085;font-size:6.5px;font-weight:800}.pa-page[data-theme="dark"] .pa-x2-refs span{background:#171e2d;border-color:#30394c;color:#b7c0cf}.pa-x2-priority{margin-top:1px;padding:7px 8px;border-radius:9px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:7.2px;line-height:1.4}.pa-page[data-theme="dark"] .pa-x2-priority{background:#3b2411;border-color:#6d3a16;color:#fdba74}

      .pa-x2-journey-shell{position:relative;padding:16px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 97%,var(--violet) 3%),var(--surface));box-shadow:0 28px 80px rgba(15,23,42,.08);overflow:hidden}
      .pa-x2-tourbar{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin-bottom:14px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--surface) 96%,var(--violet) 4%)}
      .pa-x2-live{display:inline-flex;align-items:center;gap:7px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}.pa-x2-live i{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px color-mix(in srgb,var(--green) 14%,transparent);animation:paX2Blink 1.2s ease-in-out infinite}@keyframes paX2Blink{50%{opacity:.35;transform:scale(.75)}}
      .pa-x2-progress{height:6px;border-radius:999px;background:var(--line);overflow:hidden}.pa-x2-progress i{display:block;width:10%;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--violet),#9b68f0);transition:width .35s ease}.pa-x2-controls{display:flex;gap:6px}.pa-x2-controls button{height:30px;padding:0 9px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:8.5px;font-weight:850;cursor:pointer}.pa-x2-controls button:last-child{background:var(--violet);border-color:transparent;color:#fff}
      .pa-x2-tabs{display:flex;gap:7px;overflow:auto;padding:1px 1px 8px;scrollbar-width:none}.pa-x2-tabs::-webkit-scrollbar{display:none}.pa-x2-tab{min-width:92px;padding:9px 7px;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--muted);font:inherit;font-size:9px;font-weight:820;cursor:pointer}.pa-x2-tab.active{background:var(--violet-soft);color:var(--violet);border-color:color-mix(in srgb,var(--violet) 44%,var(--line))}
      .pa-x2-stage{display:grid;grid-template-columns:minmax(240px,.72fr) minmax(0,1.28fr);min-height:430px;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:var(--surface)}
      .pa-x2-copy{padding:28px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid var(--line)}.pa-x2-num{width:34px;height:34px;display:grid;place-items:center;margin-bottom:16px;border-radius:10px;background:var(--violet-soft);color:var(--violet);font-size:10px;font-weight:900}.pa-x2-copy h3{margin:0;color:var(--ink);font-size:22px;letter-spacing:-.035em}.pa-x2-copy p{margin:10px 0 0;color:var(--muted);font-size:11.5px;line-height:1.65}.pa-x2-local{margin-top:18px;padding:10px 11px;border:1px solid color-mix(in srgb,var(--green) 28%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--green) 5%,var(--surface));color:var(--muted);font-size:9.7px;line-height:1.48}.pa-x2-local b{color:var(--ink)}
      .pa-x2-screen{padding:20px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,color-mix(in srgb,var(--violet) 5%,var(--surface-soft)),var(--surface-soft))}.pa-x2-card{width:min(590px,100%);padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:0 18px 50px rgba(15,23,42,.08);color:var(--ink);animation:paX2In .3s ease}@keyframes paX2In{from{opacity:.3;transform:translateY(7px)}to{opacity:1;transform:none}}
      .pa-x2-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.pa-x2-brand{font-size:11px;font-weight:900}.pa-x2-status{padding:5px 7px;border-radius:999px;background:color-mix(in srgb,var(--green) 8%,var(--surface));color:var(--green);font-size:8px;font-weight:850}.pa-x2-field{margin-top:8px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-soft)}.pa-x2-field b{display:block;font-size:9.5px}.pa-x2-field span{display:block;margin-top:3px;color:var(--muted);font-size:8.3px;line-height:1.42}.pa-x2-file{display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid color-mix(in srgb,#ef4444 25%,var(--line));border-radius:12px;background:color-mix(in srgb,#ef4444 4%,var(--surface))}.pa-x2-file i{width:40px;height:44px;display:grid;place-items:center;border-radius:8px;background:#ef4444;color:#fff;font-style:normal;font-size:8px;font-weight:900}.pa-x2-file b{font-size:9.5px}.pa-x2-file small{display:block;margin-top:3px;color:var(--muted);font-size:8px}.pa-x2-secret{font-size:7px;font-weight:900;color:#b91c1c;background:#fee2e2;padding:5px 6px;border-radius:6px}.pa-page[data-theme="dark"] .pa-x2-secret{background:rgba(239,68,68,.15);color:#fca5a5}
      .pa-x2-chat{display:grid;gap:8px}.pa-x2-bubble{max-width:94%;padding:10px 11px;border-radius:12px;font-size:9px;line-height:1.5}.pa-x2-bubble.user{margin-left:auto;background:var(--violet);color:#fff;border-bottom-right-radius:4px}.pa-x2-bubble.ai{background:var(--surface-soft);border:1px solid var(--line);border-bottom-left-radius:4px}.pa-x2-bubble.ai b{color:var(--violet)}
      .pa-x2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.pa-x2-result{padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--surface-soft)}.pa-x2-result b{display:block;font-size:8.8px}.pa-x2-result p{margin:4px 0 0;color:var(--muted);font-size:8px;line-height:1.42}.pa-x2-cites{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.pa-x2-cites span{padding:3px 5px;border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--muted);font-size:7px;font-weight:800}
      .pa-x2-table{display:grid;gap:6px}.pa-x2-row{display:grid;grid-template-columns:1.25fr .7fr 1fr;gap:6px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--surface-soft);align-items:center}.pa-x2-row b{font-size:8px}.pa-x2-row span{font-size:7.5px;color:var(--muted)}.pa-x2-row em{font-style:normal;font-size:7.3px;color:var(--violet);font-weight:850}
      .pa-x2-export{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-soft)}.pa-x2-export i{width:42px;height:46px;display:grid;place-items:center;border-radius:9px;background:#e9efff;color:#3657b3;font-style:normal;font-size:8px;font-weight:900}.pa-x2-export b{font-size:9.5px}.pa-x2-export small{display:block;margin-top:3px;color:var(--muted);font-size:8px}.pa-x2-download{margin-left:auto;padding:7px 9px;border-radius:8px;background:var(--violet);color:#fff;font-size:8px;font-weight:850}

      .pa-x2-cases{width:min(1180px,calc(100% - 40px));margin:0 auto;padding:64px 0 34px}.pa-x2-cases-head{max-width:800px;margin:0 auto 26px;text-align:center}.pa-x2-kicker{display:inline-flex;padding:7px 10px;border-radius:999px;background:var(--violet-soft);color:var(--violet);font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.pa-x2-cases-head h2{margin:12px 0 0;color:var(--ink);font-size:clamp(28px,4vw,46px);letter-spacing:-.05em}.pa-x2-cases-head p{margin:13px auto 0;color:var(--muted);font-size:13px;line-height:1.68;max-width:760px}.pa-x2-disclaimer{margin:14px auto 0;max-width:800px;padding:10px 12px;border:1px solid #fed7aa;border-radius:11px;background:#fff7ed;color:#9a3412;font-size:9.5px;line-height:1.5;text-align:center}.pa-page[data-theme="dark"] .pa-x2-disclaimer{background:#3b2411;border-color:#6d3a16;color:#fdba74}
      .pa-x2-feature{margin-top:24px;padding:20px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb,var(--violet) 6%,var(--surface)),var(--surface));box-shadow:0 20px 55px rgba(15,23,42,.07)}.pa-x2-feature-grid{display:grid;grid-template-columns:.82fr 1.18fr;gap:18px}.pa-x2-feature h3{margin:0;color:var(--ink);font-size:20px;letter-spacing:-.03em}.pa-x2-feature p{margin:8px 0 0;color:var(--muted);font-size:11px;line-height:1.62}.pa-x2-feature-label{display:inline-flex;margin-bottom:9px;padding:5px 7px;border-radius:7px;background:#111827;color:#fff;font-size:7.5px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.pa-page[data-theme="dark"] .pa-x2-feature-label{background:#f8fafc;color:#111827}.pa-x2-feature-prompt{margin-top:13px;padding:11px;border-radius:12px;background:var(--violet);color:#fff;font-size:9.4px;line-height:1.52}.pa-x2-feature-answer{display:grid;gap:7px}.pa-x2-feature-item{padding:9px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}.pa-x2-feature-item b{display:block;font-size:8.8px}.pa-x2-feature-item span{display:block;margin-top:3px;color:var(--muted);font-size:8px;line-height:1.43}.pa-x2-feature-item em{display:block;margin-top:4px;color:var(--violet);font-style:normal;font-size:7.4px;font-weight:850}
      .pa-x2-case-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.pa-x2-case{padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:0 10px 28px rgba(15,23,42,.04)}.pa-x2-case-domain{display:flex;justify-content:space-between;gap:8px;align-items:center}.pa-x2-case-domain strong{font-size:11px}.pa-x2-case-domain span{font-size:7px;font-weight:900;color:var(--violet);background:var(--violet-soft);padding:4px 6px;border-radius:6px}.pa-x2-case h4{margin:10px 0 0;color:var(--ink);font-size:13px;letter-spacing:-.02em}.pa-x2-case p{margin:6px 0 0;color:var(--muted);font-size:9.4px;line-height:1.52}.pa-x2-case .q{margin-top:9px;padding:8px;border-radius:9px;background:var(--surface-soft);color:var(--ink);font-size:8.7px;line-height:1.45}.pa-x2-case footer{margin-top:9px;padding-top:9px;border-top:1px solid var(--line);color:var(--violet);font-size:8px;font-weight:850;line-height:1.45}
      @media(max-width:900px){.pa-x2-stage,.pa-x2-feature-grid{grid-template-columns:1fr}.pa-x2-copy{border-right:0;border-bottom:1px solid var(--line)}.pa-x2-case-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:640px){.pa-x2-findings,.pa-x2-grid,.pa-x2-case-grid{grid-template-columns:1fr}.pa-x2-tourbar{grid-template-columns:1fr auto}.pa-x2-progress{grid-column:1/-1;grid-row:2}.pa-x2-stage{min-height:0}.pa-x2-copy{padding:20px}.pa-x2-screen{padding:11px}.pa-x2-row{grid-template-columns:1fr}.pa-x2-cases{width:min(100% - 24px,1180px);padding-top:48px}.pa-x2-cases-head{text-align:left}.pa-x2-disclaimer{text-align:left}.pa-x2-feature{padding:14px}}
      @media(prefers-reduced-motion:reduce){.pa-x2-live i{animation:none}.pa-x2-progress i{transition:none}}
    `;
    document.head.appendChild(style);

    // -----------------------------------------------------------------------
    // HERO : enrichit les scènes Message / Réponse de la démo existante.
    // -----------------------------------------------------------------------
    const sceneHost = live.querySelector('[data-live-scene]');
    const stepEl = live.querySelector('.pa-live-step');
    const applyHeroDetail = () => {
      if (!sceneHost || !stepEl) return;
      const step = (stepEl.textContent || '').trim();
      if (sceneHost.dataset.x2Step === step) return;
      if (step === '05') {
        sceneHost.dataset.x2Step = step;
        sceneHost.innerHTML = `
          <div class="pa-live-card">
            <div class="pa-live-card-top"><strong>Chat — Opération Atlas</strong><span class="pa-x2-demo-note">Cas fictif</span></div>
            <div class="pa-x2-question-title"><strong>Message envoyé à l’agent</strong><span class="pa-x2-sent">Envoyé</span></div>
            <div class="pa-x2-query"><b>Analyse les aspects clés du dossier :</b> gouvernance, budget, calendrier, dépendance fournisseur et conformité. Pour chaque point, donne le constat, l’impact, le niveau de risque, l’action recommandée et les pages/sections qui justifient la réponse.</div>
            <div class="pa-x2-search">Recherche hybride locale en cours dans <b>Projet_Atlas_TOP_SECRET.pdf</b> • index lexical + sémantique • références activées.</div>
          </div>`;
      } else if (step === '06') {
        sceneHost.dataset.x2Step = step;
        sceneHost.innerHTML = `
          <div class="pa-live-card">
            <div class="pa-x2-answer-head"><strong>Réponse détaillée et sourcée</strong><span class="pa-x2-score">5 aspects trouvés</span></div>
            <div class="pa-x2-findings">
              <div class="pa-x2-finding"><b>Gouvernance — élevé</b><p>Trois décisions critiques n’ont pas de responsable formel.</p><div class="pa-x2-refs"><span>§2.1 p.12</span><span>p.14</span></div></div>
              <div class="pa-x2-finding"><b>Budget — élevé</b><p>Exposition estimée à +14,8% sur les postes indexés et devises.</p><div class="pa-x2-refs"><span>§4.3 p.27</span><span>Ann. C p.79</span></div></div>
              <div class="pa-x2-finding"><b>Calendrier — critique</b><p>Le jalon M4 ne conserve que 6 jours de marge opérationnelle.</p><div class="pa-x2-refs"><span>§6.2 p.41–42</span></div></div>
              <div class="pa-x2-finding"><b>Fournisseur — élevé</b><p>Trois composants critiques restent mono-source, sans solution contractuelle immédiate.</p><div class="pa-x2-refs"><span>p.18</span><span>§5.4 p.34–35</span><span>p.62</span></div></div>
            </div>
            <div class="pa-x2-priority"><b>Priorité proposée :</b> sécuriser une alternative fournisseur et statuer sur le jalon M4 sous 30 jours. Références de démonstration fictives.</div>
          </div>`;
      } else {
        sceneHost.dataset.x2Step = step;
      }
    };
    applyHeroDetail();
    if (sceneHost && 'MutationObserver' in window) {
      new MutationObserver(() => requestAnimationFrame(applyHeroDetail)).observe(sceneHost, { childList: true, subtree: false });
    }

    // -----------------------------------------------------------------------
    // PARCOURS DETAILLE : 10 étapes, 2 messages, 2 réponses, références.
    // -----------------------------------------------------------------------
    const shell = journey.querySelector('.pa-journey-shell');
    if (shell) {
      shell.className = 'pa-x2-journey-shell';
      shell.innerHTML = `
        <div class="pa-x2-tourbar">
          <span class="pa-x2-live"><i></i> Parcours détaillé automatique</span>
          <span class="pa-x2-progress"><i></i></span>
          <span class="pa-x2-controls"><button type="button" data-x2-pause>Pause</button><button type="button" data-x2-replay>Rejouer</button></span>
        </div>
        <div class="pa-x2-tabs" role="tablist" aria-label="Parcours détaillé PrivatAI"></div>
        <div class="pa-x2-stage" aria-live="polite">
          <div class="pa-x2-copy"><div class="pa-x2-num">01</div><h3></h3><p></p><div class="pa-x2-local"></div></div>
          <div class="pa-x2-screen"><div class="pa-x2-card" data-x2-visual></div></div>
        </div>`;

      const steps = [
        {
          label:'Ouvrir', title:'Ouvrez PrivatAI', text:'Le moteur conversationnel et le moteur de recherche documentaire se préparent sur l’ordinateur.', local:'<b>Local-first.</b> Après installation des modèles, le parcours documentaire peut fonctionner hors ligne.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">PrivatAI</span><span class="pa-x2-status">Moteur local prêt</span></div><div class="pa-x2-field"><b>IA conversationnelle locale</b><span>Disponible pour les échanges du projet.</span></div><div class="pa-x2-field"><b>Recherche documentaire locale</b><span>Index lexical + sémantique prêt à interroger les documents.</span></div>`
        },
        {
          label:'Projet', title:'Créez le projet confidentiel', text:'Le dossier garde ensemble documents, agent, discussions et livrables, sans mélanger les contextes.', local:'<b>Cas de démonstration fictif.</b> Le projet « Opération Atlas » sert uniquement à illustrer le workflow.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Nouveau projet</span><span class="pa-x2-status">Contexte isolé</span></div><div class="pa-x2-field"><b>Opération Atlas — Comité d’investissement</b><span>Dossier confidentiel • analyse avant décision d’engagement.</span></div><div class="pa-x2-field"><b>Objectif</b><span>Identifier les risques, leurs preuves documentaires et les décisions à prendre.</span></div>`
        },
        {
          label:'Agent', title:'Configurez un agent spécialisé', text:'L’agent reçoit une mission explicite : analyser le dossier, distinguer faits et inférences, et citer chaque preuve.', local:'<b>Consigne de prudence.</b> Si une conclusion n’est pas soutenue par le dossier, l’agent doit le signaler.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Agent privé</span><span class="pa-x2-status">Actif</span></div><div class="pa-x2-field"><b>Analyste Décision & Risques</b><span>Rôle : synthèse exécutive, risques, contradictions, recommandations.</span></div><div class="pa-x2-field"><b>Règle de réponse</b><span>Toujours fournir page/section et séparer « preuve », « analyse » et « recommandation ».</span></div>`
        },
        {
          label:'Document', title:'Chargez le dossier sensible', text:'Le document est ajouté au projet puis préparé pour la recherche locale.', local:'<b>Document fictif.</b> Les pages et références affichées dans cette démonstration sont simulées.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Documents</span><span class="pa-x2-status">Local</span></div><div class="pa-x2-file"><i>PDF</i><div><b>Projet_Atlas_TOP_SECRET.pdf</b><small>86 pages • 18,4 Mo • démonstration fictive</small></div><span class="pa-x2-secret">TOP SECRET</span></div><div class="pa-x2-field"><b>Stockage</b><span>Le fichier reste dans l’environnement local du projet.</span></div>`
        },
        {
          label:'Indexer', title:'Indexez et préparez les références', text:'PrivatAI segmente le contenu et prépare les passages recherchables avant toute question.', local:'<b>RAG hybride.</b> Recherche lexicale et sémantique combinées pour retrouver les passages les plus utiles.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Index documentaire</span><span class="pa-x2-status">Prêt</span></div><div class="pa-x2-grid"><div class="pa-x2-result"><b>326 passages</b><p>Segments préparés localement.</p></div><div class="pa-x2-result"><b>86 pages référencées</b><p>Numéros de page conservés.</p></div><div class="pa-x2-result"><b>Lexical + sémantique</b><p>Recherche hybride activée.</p></div><div class="pa-x2-result"><b>Traçabilité</b><p>Références attachées aux réponses.</p></div></div>`
        },
        {
          label:'Message 1', title:'Envoyez une question sur les aspects clés', text:'La question demande une analyse multi-critères, pas un simple résumé.', local:'<b>Question structurée.</b> L’utilisateur exige constat, impact, niveau de risque, action et preuve documentaire.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Chat du projet</span><span class="pa-x2-status">Message envoyé</span></div><div class="pa-x2-chat"><div class="pa-x2-bubble user">Analyse les aspects clés du dossier : gouvernance, budget, calendrier, dépendance fournisseur et conformité. Pour chacun : constat, impact, niveau de risque, action recommandée et pages/sections justificatives.</div><div class="pa-x2-bubble ai">Recherche locale dans le dossier… passages candidats classés par pertinence.</div></div>`
        },
        {
          label:'Réponse 1', title:'Recevez une analyse détaillée et sourcée', text:'La réponse présente les conclusions et permet de revenir aux passages qui les soutiennent.', local:'<b>Références simulées pour la démonstration.</b> Dans l’application, les références dépendent du document réellement importé.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Réponse 1 — aspects clés</span><span class="pa-x2-status">5 conclusions</span></div><div class="pa-x2-grid"><div class="pa-x2-result"><b>1. Gouvernance — élevé</b><p>3 décisions critiques sans responsable formel.</p><div class="pa-x2-cites"><span>§2.1 p.12</span><span>p.14</span></div></div><div class="pa-x2-result"><b>2. Budget — élevé</b><p>Exposition potentielle de +14,8% sur postes indexés et devises.</p><div class="pa-x2-cites"><span>§4.3 p.27</span><span>Ann. C p.79</span></div></div><div class="pa-x2-result"><b>3. Calendrier — critique</b><p>Jalon M4 : seulement 6 jours de marge opérationnelle.</p><div class="pa-x2-cites"><span>§6.2 p.41–42</span></div></div><div class="pa-x2-result"><b>4. Fournisseur — élevé</b><p>3 composants critiques mono-source.</p><div class="pa-x2-cites"><span>p.18</span><span>§5.4 p.34–35</span><span>p.62</span></div></div><div class="pa-x2-result"><b>5. Conformité — moyen</b><p>Deux pièces de contrôle sont annoncées mais non annexées.</p><div class="pa-x2-cites"><span>§8.1 p.55</span><span>p.58</span></div></div><div class="pa-x2-result"><b>Synthèse</b><p>2 décisions prioritaires : alternative fournisseur et jalon M4.</p><div class="pa-x2-cites"><span>preuves croisées</span></div></div></div>`
        },
        {
          label:'Message 2', title:'Relancez l’agent pour passer à la décision', text:'Une deuxième question transforme les constats en responsabilités et échéances concrètes.', local:'<b>Conversation contextuelle.</b> La relance reste dans le projet et s’appuie sur la réponse précédente et le même dossier.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Chat du projet</span><span class="pa-x2-status">Relance envoyée</span></div><div class="pa-x2-chat"><div class="pa-x2-bubble user">À partir de ces constats, quelles décisions devons-nous prendre sous 30 jours, par qui, avec quelle priorité ? Pour chaque décision, cite la preuve documentaire qui la justifie.</div><div class="pa-x2-bubble ai">Je consolide les risques avec les responsabilités, délais et références du dossier…</div></div>`
        },
        {
          label:'Réponse 2', title:'Obtenez une matrice de décision', text:'PrivatAI convertit l’analyse en actions directement exploitables par une direction ou un comité.', local:'<b>Traçabilité décisionnelle.</b> Chaque action reste associée à la preuve utilisée pour la proposer.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Réponse 2 — décisions sous 30 jours</span><span class="pa-x2-status">Priorisées</span></div><div class="pa-x2-table"><div class="pa-x2-row"><b>Sécuriser un fournisseur alternatif</b><span>Achats + Technique • J+15</span><em>Critique • p.18, 34–35, 62</em></div><div class="pa-x2-row"><b>Rebaseliner le jalon M4</b><span>PMO • J+7</span><em>Critique • §6.2 p.41–42</em></div><div class="pa-x2-row"><b>Nommer les responsables des 3 décisions</b><span>Direction projet • J+5</span><em>Élevé • §2.1 p.12–14</em></div><div class="pa-x2-row"><b>Obtenir les 2 pièces de conformité</b><span>Compliance • J+20</span><em>Moyen • §8.1 p.55, p.58</em></div></div>`
        },
        {
          label:'Rapport', title:'Générez la note de décision', text:'L’analyse et la matrice deviennent un livrable professionnel prêt à être partagé dans le circuit interne.', local:'<b>Sortie locale.</b> Le document est généré et enregistré sur l’ordinateur.',
          html:`<div class="pa-x2-top"><span class="pa-x2-brand">Studio Documents</span><span class="pa-x2-status">Prêt</span></div><div class="pa-x2-export"><i>DOCX</i><div><b>Note_Decision_Operation_Atlas.docx</b><small>Résumé exécutif • 5 risques • preuves • matrice 30 jours • recommandations</small></div><span class="pa-x2-download">Télécharger</span></div><div class="pa-x2-field"><b>Références incluses</b><span>Les pages/sections utilisées dans la démonstration sont reprises dans le livrable.</span></div>`
        }
      ];

      const tabsHost = shell.querySelector('.pa-x2-tabs');
      const progress = shell.querySelector('.pa-x2-progress i');
      const num = shell.querySelector('.pa-x2-num');
      const title = shell.querySelector('.pa-x2-copy h3');
      const text = shell.querySelector('.pa-x2-copy p');
      const local = shell.querySelector('.pa-x2-local');
      const visual = shell.querySelector('[data-x2-visual]');
      const pauseBtn = shell.querySelector('[data-x2-pause]');
      const replayBtn = shell.querySelector('[data-x2-replay]');
      let current = 0;
      let paused = false;
      let timer = null;
      let inView = true;

      steps.forEach((step, index) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pa-x2-tab'; b.textContent = `${index + 1}. ${step.label}`;
        b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        b.addEventListener('click', (event) => { current = index; render(); if (event.isTrusted) { paused = true; pauseBtn.textContent = 'Reprendre'; clearTimeout(timer); } });
        tabsHost.appendChild(b);
      });
      const tabs = [...tabsHost.children];

      const render = () => {
        const step = steps[current];
        num.textContent = String(current + 1).padStart(2, '0'); title.textContent = step.title; text.textContent = step.text; local.innerHTML = step.local; visual.innerHTML = step.html;
        tabs.forEach((tab, i) => { const active = i === current; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active ? 'true' : 'false'); });
        progress.style.width = `${((current + 1) / steps.length) * 100}%`;
        tabs[current]?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
      };
      const schedule = () => {
        clearTimeout(timer);
        if (paused || !inView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const dwell = [5,6,7,8].includes(current) ? 5600 : 4100;
        timer = setTimeout(() => { current = (current + 1) % steps.length; render(); schedule(); }, dwell);
      };
      pauseBtn.addEventListener('click', () => { paused = !paused; pauseBtn.textContent = paused ? 'Reprendre' : 'Pause'; if (paused) clearTimeout(timer); else schedule(); });
      replayBtn.addEventListener('click', () => { current = 0; paused = false; pauseBtn.textContent = 'Pause'; render(); schedule(); });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => { entries.forEach((entry) => { inView = entry.isIntersecting; if (inView) schedule(); else clearTimeout(timer); }); }, { threshold:.2 }).observe(journey);
      }
      render(); schedule();
    }

    // -----------------------------------------------------------------------
    // CAS D'USAGE CONCRETS : 1 cas complet + 6 métiers.
    // -----------------------------------------------------------------------
    if (!document.getElementById('cases')) {
      const cases = document.createElement('section');
      cases.id = 'cases'; cases.className = 'pa-x2-cases pa-reveal';
      cases.innerHTML = `
        <div class="pa-x2-cases-head"><span class="pa-x2-kicker">Cas d’usage concrets</span><h2>Des questions métiers précises. Des réponses vérifiables.</h2><p>PrivatAI ne sert pas uniquement à « résumer un PDF ». Il aide à transformer un dossier sensible en constats, décisions et livrables avec retour aux passages sources.</p><div class="pa-x2-disclaimer"><b>Exemples fictifs :</b> les sociétés, montants, pages, articles et résultats ci-dessous servent uniquement à illustrer le fonctionnement de PrivatAI.</div></div>
        <article class="pa-x2-feature">
          <div class="pa-x2-feature-grid">
            <div><span class="pa-x2-feature-label">Cas pratique complet • Juridique</span><h3>Un contrat fournisseur de 68 pages doit être renouvelé sous 48 h.</h3><p>La société fictive Amani Industrie veut savoir ce qui peut générer un coût important, bloquer une sortie du contrat ou renforcer sa dépendance au fournisseur.</p><div class="pa-x2-feature-prompt"><b>Question envoyée :</b><br>« Repère les clauses de pénalité supérieures à 5 M FCFA, le renouvellement tacite, les dépendances critiques, les SLA et toutes les obligations à échéance sous 30 jours. Pour chaque point, cite l’article et la page. »</div><p><b>Livrable :</b> note de risque juridique de 2 pages + tableau des obligations + propositions de renégociation.</p></div>
            <div class="pa-x2-feature-answer">
              <div class="pa-x2-feature-item"><b>Pénalités — exposition potentielle 12 M FCFA</b><span>2% par semaine de retard, plafond 12% sur le lot concerné.</span><em>Art. 12.3 • p.26</em></div>
              <div class="pa-x2-feature-item"><b>Renouvellement tacite — vigilance élevée</b><span>Reconduction de 24 mois si préavis non envoyé 90 jours avant l’échéance.</span><em>Art. 17.2 • p.41</em></div>
              <div class="pa-x2-feature-item"><b>Dépendance technique — critique</b><span>Pièces de rechange exclusives au fournisseur sans alternative autorisée.</span><em>Annexe B • p.63</em></div>
              <div class="pa-x2-feature-item"><b>Décision proposée</b><span>Renégocier 12.3 et 17.2, obtenir une clause d’alternative fournisseur et assigner l’attestation d’assurance à un responsable avant J+15.</span><em>Art. 21.1 • p.48</em></div>
            </div>
          </div>
        </article>
        <div class="pa-x2-case-grid">
          <article class="pa-x2-case"><div class="pa-x2-case-domain"><strong>Juridique</strong><span>CONTRATS</span></div><h4>Comparer deux versions d’un contrat</h4><p>Version signée vs avenant proposé : clauses ajoutées, supprimées ou durcies.</p><div class="q">« Qu’est-ce qui change sur responsabilité, paiement, résiliation et confidentialité ? Cite les deux versions. »</div><footer>Résultat : tableau des écarts + clauses à négocier + note de décision.</footer></article>
          <article class="pa-x2-case"><div class="pa-x2-case-domain"><strong>Audit & Finance</strong><span>RISQUES</span></div><h4>Exploiter un rapport d’audit de 126 pages</h4><p>La direction veut distinguer anomalies majeures, causes, impacts et actions non clôturées.</p><div class="q">« Classe les constats par criticité, chiffre l’exposition lorsqu’elle est documentée et cite chaque preuve. »</div><footer>Résultat : top risques + matrice actions/responsables/échéances + synthèse comité.</footer></article>
          <article class="pa-x2-case"><div class="pa-x2-case-domain"><strong>Ressources humaines</strong><span>COHÉRENCE</span></div><h4>Contrôler règlement et contrats internes</h4><p>Comparer les règles de congé, primes, période d’essai et procédures disciplinaires.</p><div class="q">« Signale les incohérences entre documents et montre précisément où elles apparaissent. »</div><footer>Résultat : écarts documentaires + points à harmoniser + projet de note RH.</footer></article>
          <article class="pa-x2-case"><div class="pa-x2-case-domain"><strong>Santé</strong><span>QUALITÉ</span></div><h4>Analyser procédures qualité et rapport d’incident</h4><p>Un établissement veut rapprocher une procédure interne des faits décrits dans un rapport d’incident.</p><div class="q">« Quelles étapes prévues n’apparaissent pas dans le rapport ? Cite procédure et incident. »</div><footer>Résultat : écarts de processus + preuves + plan d’amélioration. Pas de diagnostic médical automatisé.</footer></article>
          <article class="pa-x2-case"><div class="pa-x2-case-domain"><strong>Conformité</strong><span>CONTRÔLE</span></div><h4>Préparer une revue de conformité</h4><p>Politique interne, procédure d’accès et contrats doivent être confrontés avant un contrôle.</p><div class="q">« Identifie les obligations non couvertes, les preuves manquantes et les contradictions entre documents. »</div><footer>Résultat : checklist de conformité + gaps + références + plan de remédiation.</footer></article>
          <article class="pa-x2-case"><div class="pa-x2-case-domain"><strong>Direction & Stratégie</strong><span>DÉCISION</span></div><h4>Préparer un comité d’investissement</h4><p>Business plan, notes budgétaires et comptes rendus contiennent hypothèses et décisions dispersées.</p><div class="q">« Quelles hypothèses sont fragiles, quelles décisions restent ouvertes et quelles preuves les soutiennent ? »</div><footer>Résultat : briefing exécutif + scénarios + décisions sous 30 jours + note DOCX.</footer></article>
        </div>`;
      journey.insertAdjacentElement('afterend', cases);
      requestAnimationFrame(() => cases.classList.add('visible'));

      const nav = document.querySelector('.pa-links');
      if (nav && !nav.querySelector('a[href="#cases"]')) {
        const link = document.createElement('a'); link.href = '#cases'; link.textContent = 'Cas pratiques';
        const security = nav.querySelector('a[href="#security"]');
        if (security) nav.insertBefore(link, security); else nav.appendChild(link);
      }
    }
  };

  waitForExperience();
})();
