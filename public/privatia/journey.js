(() => {
  const stepsTarget = document.querySelector('.pa-steps#how');
  if (!stepsTarget || document.getElementById('usecase')) return;

  const style = document.createElement('style');
  style.id = 'pa-private-journey-style';
  style.textContent = `
    .pa-journey{width:min(1180px,calc(100% - 40px));margin:26px auto 0;padding:72px 0 34px;position:relative}
    .pa-journey-head{max-width:820px;margin:0 auto 28px;text-align:center}
    .pa-journey-kicker{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;padding:7px 11px;border:1px solid color-mix(in srgb,var(--violet) 25%,var(--line));border-radius:999px;background:var(--violet-soft);color:var(--violet);font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
    .pa-journey-kicker:before{content:'';width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px color-mix(in srgb,var(--green) 15%,transparent)}
    .pa-journey-head h2{margin:0;color:var(--ink);font-size:clamp(29px,4vw,48px);line-height:1.03;letter-spacing:-.055em}
    .pa-journey-head h2 em{font-style:normal;color:var(--violet)}
    .pa-journey-head p{max-width:760px;margin:16px auto 0;color:var(--muted);font-size:14px;line-height:1.7}
    .pa-journey-assurance{margin:22px auto 30px;padding:13px 16px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;border:1px solid color-mix(in srgb,var(--green) 31%,var(--line));border-radius:16px;background:color-mix(in srgb,var(--green) 6%,var(--surface));color:var(--ink);font-size:11px;font-weight:760}
    .pa-journey-assurance span{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
    .pa-journey-assurance i{width:7px;height:7px;border-radius:50%;background:var(--green)}
    .pa-journey-shell{padding:16px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 97%,var(--violet) 3%),var(--surface));box-shadow:0 28px 80px rgba(15,23,42,.08)}
    .pa-journey-tabs{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;margin-bottom:14px}
    .pa-journey-tab{min-width:0;padding:10px 6px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--muted);font:inherit;font-size:10px;font-weight:820;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease,color .16s ease}
    .pa-journey-tab:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--violet) 38%,var(--line))}
    .pa-journey-tab.active{border-color:color-mix(in srgb,var(--violet) 45%,var(--line));background:var(--violet-soft);color:var(--violet)}
    .pa-journey-stage{display:grid;grid-template-columns:minmax(230px,.72fr) minmax(0,1.28fr);min-height:390px;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:var(--surface)}
    .pa-journey-copy{padding:30px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid var(--line)}
    .pa-journey-number{width:32px;height:32px;display:grid;place-items:center;margin-bottom:18px;border-radius:10px;background:var(--violet-soft);color:var(--violet);font-size:11px;font-weight:900}
    .pa-journey-copy h3{margin:0;color:var(--ink);font-size:23px;letter-spacing:-.035em}
    .pa-journey-copy p{margin:10px 0 0;color:var(--muted);font-size:12px;line-height:1.65}
    .pa-journey-local{margin-top:20px;padding:11px 12px;display:flex;gap:9px;border:1px solid color-mix(in srgb,var(--green) 27%,var(--line));border-radius:12px;background:color-mix(in srgb,var(--green) 5%,var(--surface));color:var(--muted);font-size:10.5px;line-height:1.5}
    .pa-journey-local svg{width:17px;height:17px;flex:none;color:var(--green);fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .pa-journey-screen{position:relative;padding:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--violet) 5%,var(--surface-soft)),var(--surface-soft));display:flex;align-items:center;justify-content:center}
    .pa-j-card{width:min(560px,100%);padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--surface);box-shadow:0 18px 55px rgba(15,23,42,.09);color:var(--ink)}
    .pa-j-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
    .pa-j-brand{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:900}.pa-j-brand b{width:28px;height:28px;display:grid;place-items:center;border-radius:9px;background:var(--violet-soft);color:var(--violet);font-size:11px}
    .pa-j-status{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;background:color-mix(in srgb,var(--green) 8%,var(--surface));color:var(--green);font-size:9px;font-weight:850}.pa-j-status:before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
    .pa-j-title{margin:0 0 7px;font-size:16px;letter-spacing:-.025em}.pa-j-sub{margin:0;color:var(--muted);font-size:10.5px;line-height:1.55}
    .pa-j-row{margin-top:14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .pa-j-option{padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-soft)}
    .pa-j-option strong{display:block;font-size:10.5px}.pa-j-option span{display:block;margin-top:4px;color:var(--muted);font-size:9.5px;line-height:1.4}
    .pa-j-option.selected{border-color:color-mix(in srgb,var(--violet) 42%,var(--line));background:var(--violet-soft)}
    .pa-j-agent{display:flex;align-items:center;gap:12px;margin-top:15px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}
    .pa-j-avatar{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:12px;background:linear-gradient(135deg,#6754ee,#8b5cf6);color:#fff;font-size:15px;font-weight:900}.pa-j-agent strong{display:block;font-size:11px}.pa-j-agent span{display:block;margin-top:3px;color:var(--muted);font-size:9.5px}
    .pa-j-file{margin-top:14px;padding:13px;display:grid;grid-template-columns:40px 1fr auto;gap:11px;align-items:center;border:1px solid color-mix(in srgb,#ef4444 25%,var(--line));border-radius:14px;background:color-mix(in srgb,#ef4444 4%,var(--surface))}
    .pa-j-file-icon{width:40px;height:44px;display:grid;place-items:center;border-radius:9px;background:#ef4444;color:#fff;font-size:9px;font-weight:900}.pa-j-file strong{display:block;font-size:10.5px}.pa-j-file small{display:block;margin-top:3px;color:var(--muted);font-size:9px}.pa-j-classified{padding:5px 7px;border-radius:7px;background:#fee2e2;color:#b91c1c;font-size:8px;font-weight:900;letter-spacing:.06em}
    .pa-j-progress{height:5px;margin-top:12px;overflow:hidden;border-radius:999px;background:var(--line)}.pa-j-progress i{display:block;width:100%;height:100%;background:linear-gradient(90deg,var(--violet),#8b5cf6)}
    .pa-j-chat{display:grid;gap:10px;margin-top:14px}.pa-j-bubble{max-width:88%;padding:11px 12px;border-radius:13px;font-size:10px;line-height:1.55}.pa-j-user{margin-left:auto;background:var(--violet);color:#fff;border-bottom-right-radius:4px}.pa-j-ai{background:var(--surface-soft);border:1px solid var(--line);color:var(--ink);border-bottom-left-radius:4px}.pa-j-ai strong{color:var(--violet)}
    .pa-j-citations{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.pa-j-citations span{padding:4px 6px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--muted);font-size:8px;font-weight:750}
    .pa-j-export{margin-top:14px;padding:13px;border:1px solid var(--line);border-radius:14px;background:var(--surface-soft)}.pa-j-export-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.pa-j-export strong{font-size:10.5px}.pa-j-export small{display:block;margin-top:3px;color:var(--muted);font-size:9px}.pa-j-download{padding:7px 9px;border:0;border-radius:8px;background:var(--violet);color:#fff;font:inherit;font-size:9px;font-weight:850}
    .pa-j-formats{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.pa-j-formats span{padding:5px 7px;border:1px solid var(--line);border-radius:7px;background:var(--surface);font-size:8px;font-weight:800;color:var(--muted)}
    .pa-journey-final{margin:18px 4px 0;padding:18px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;border:1px solid color-mix(in srgb,var(--violet) 28%,var(--line));border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--violet) 6%,var(--surface)),color-mix(in srgb,var(--green) 4%,var(--surface)))}
    .pa-journey-final-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:var(--violet-soft);color:var(--violet)}.pa-journey-final-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pa-journey-final strong{display:block;color:var(--ink);font-size:12px}.pa-journey-final span{display:block;margin-top:3px;color:var(--muted);font-size:10.5px;line-height:1.5}
    .pa-page[data-theme="dark"] .pa-journey-shell,.pa-page[data-theme="dark"] .pa-j-card{box-shadow:0 28px 70px rgba(0,0,0,.25)}
    .pa-page[data-theme="dark"] .pa-j-classified{background:rgba(239,68,68,.15);color:#fca5a5}
    @media(max-width:900px){.pa-journey-tabs{grid-template-columns:repeat(4,minmax(0,1fr))}.pa-journey-stage{grid-template-columns:1fr;min-height:0}.pa-journey-copy{border-right:0;border-bottom:1px solid var(--line);padding:24px}.pa-journey-screen{min-height:320px}}
    @media(max-width:640px){.pa-journey{width:min(100% - 24px,1180px);padding-top:48px}.pa-journey-head{text-align:left}.pa-journey-head p{font-size:12px}.pa-journey-assurance{justify-content:flex-start}.pa-journey-tabs{display:flex;overflow:auto;padding-bottom:4px;scrollbar-width:none}.pa-journey-tabs::-webkit-scrollbar{display:none}.pa-journey-tab{min-width:92px}.pa-journey-shell{padding:9px;border-radius:20px}.pa-journey-copy{padding:20px}.pa-journey-copy h3{font-size:20px}.pa-journey-screen{padding:12px;min-height:300px}.pa-j-card{padding:15px}.pa-j-row{grid-template-columns:1fr}.pa-j-file{grid-template-columns:38px 1fr}.pa-j-classified{grid-column:2}.pa-journey-final{grid-template-columns:1fr}.pa-journey-final-icon{display:none}}
    @media(prefers-reduced-motion:reduce){.pa-journey-tab{transition:none}}
  `;
  document.head.appendChild(style);

  const journey = document.createElement('section');
  journey.className = 'pa-journey pa-reveal';
  journey.id = 'usecase';
  journey.setAttribute('aria-labelledby', 'pa-journey-title');
  journey.innerHTML = `
    <div class="pa-journey-head">
      <div class="pa-journey-kicker">Parcours réel • Document sensible</div>
      <h2 id="pa-journey-title">Un dossier top confidentiel.<br><em>Du document au livrable, sur votre ordinateur.</em></h2>
      <p>Une fois PrivatAI et ses modèles locaux installés, l’analyse documentaire, la recherche dans le dossier et la génération de réponses s’exécutent localement. Aucune API d’IA distante n’est nécessaire pour ce parcours.</p>
    </div>
    <div class="pa-journey-assurance" aria-label="Garanties du parcours local">
      <span><i></i> Document local</span><span><i></i> Modèle IA local</span><span><i></i> Recherche RAG locale</span><span><i></i> Réponses locales</span><span><i></i> Export sur votre ordinateur</span>
    </div>
    <div class="pa-journey-shell">
      <div class="pa-journey-tabs" role="tablist" aria-label="Étapes du parcours PrivatAI">
        <button class="pa-journey-tab active" type="button" role="tab" aria-selected="true" data-step="0">1. Ouvrir</button>
        <button class="pa-journey-tab" type="button" role="tab" aria-selected="false" data-step="1">2. Projet</button>
        <button class="pa-journey-tab" type="button" role="tab" aria-selected="false" data-step="2">3. Agent</button>
        <button class="pa-journey-tab" type="button" role="tab" aria-selected="false" data-step="3">4. Document</button>
        <button class="pa-journey-tab" type="button" role="tab" aria-selected="false" data-step="4">5. Question</button>
        <button class="pa-journey-tab" type="button" role="tab" aria-selected="false" data-step="5">6. Réponse</button>
        <button class="pa-journey-tab" type="button" role="tab" aria-selected="false" data-step="6">7. Rapport</button>
      </div>
      <div class="pa-journey-stage" aria-live="polite">
        <div class="pa-journey-copy">
          <div class="pa-journey-number">01</div>
          <h3>Ouvrez PrivatAI</h3>
          <p>Vous entrez dans votre espace de travail local. Le moteur IA et vos espaces restent dans l’environnement de votre ordinateur.</p>
          <div class="pa-journey-local"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-4"/></svg><div><strong>Travail documentaire hors ligne.</strong><br>Après installation des modèles locaux, vous pouvez couper Internet pour analyser vos documents.</div></div>
        </div>
        <div class="pa-journey-screen"><div class="pa-j-card" data-journey-visual></div></div>
      </div>
    </div>
    <div class="pa-journey-final">
      <div class="pa-journey-final-icon"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9.5 12 1.7 1.7 3.6-4"/></svg></div>
      <div><strong>Le principe : le document sensible reste dans votre environnement de travail local.</strong><span>Vous le chargez, l’indexez, l’interrogez et générez votre livrable depuis PrivatAI. Le cloud n’est pas nécessaire pour l’analyse IA de ce parcours.</span></div>
    </div>
  `;

  stepsTarget.parentNode.insertBefore(journey, stepsTarget);

  const nav = document.querySelector('.pa-links');
  if (nav && !nav.querySelector('a[href="#usecase"]')) {
    const link = document.createElement('a');
    link.href = '#usecase';
    link.textContent = 'Parcours';
    const howLink = nav.querySelector('a[href="#how"]');
    if (howLink) nav.insertBefore(link, howLink);
    else nav.appendChild(link);
  }

  const stepData = [
    {
      n: '01',
      title: 'Ouvrez PrivatAI',
      text: 'Vous entrez dans votre espace de travail local. Le moteur IA et vos espaces restent dans l’environnement de votre ordinateur.',
      local: '<strong>Travail documentaire hors ligne.</strong><br>Après installation des modèles locaux, vous pouvez couper Internet pour analyser vos documents.',
      visual: `<div class="pa-j-top"><div class="pa-j-brand"><b>PA</b>PrivatAI</div><span class="pa-j-status">Moteur local prêt</span></div><h4 class="pa-j-title">Bonjour. Que souhaitez-vous faire ?</h4><p class="pa-j-sub">Votre espace privé pour travailler avec vos documents et votre IA locale.</p><div class="pa-j-row"><div class="pa-j-option selected"><strong>Créer un projet</strong><span>Organiser un dossier sensible</span></div><div class="pa-j-option"><strong>Nouveau chat</strong><span>Interroger directement l’IA locale</span></div></div>`
    },
    {
      n: '02',
      title: 'Créez un projet confidentiel',
      text: 'Le projet rassemble le document, les conversations, l’agent et les livrables dans un contexte séparé et identifiable.',
      local: '<strong>Contexte maîtrisé.</strong><br>Le dossier de travail reste associé à ce projet sur votre machine.',
      visual: `<div class="pa-j-top"><div class="pa-j-brand"><b>P</b>Nouveau projet</div><span class="pa-j-status">Local</span></div><h4 class="pa-j-title">Opération Atlas — CONFIDENTIEL</h4><p class="pa-j-sub">Analyse stratégique d’un dossier interne à diffusion strictement limitée.</p><div class="pa-j-row"><div class="pa-j-option selected"><strong>Contexte isolé</strong><span>Documents et échanges du projet</span></div><div class="pa-j-option"><strong>Livrables</strong><span>Rapports produits dans ce dossier</span></div></div>`
    },
    {
      n: '03',
      title: 'Créez votre agent spécialisé',
      text: 'Définissez un agent adapté à la mission : rôle, consignes, niveau de prudence et façon d’exploiter les sources du projet.',
      local: '<strong>Agent local.</strong><br>Ses instructions structurent l’analyse sans envoyer votre document à un service d’IA distant.',
      visual: `<div class="pa-j-top"><div class="pa-j-brand"><b>A</b>Agents</div><span class="pa-j-status">Privé</span></div><div class="pa-j-agent"><div class="pa-j-avatar">AS</div><div><strong>Analyste stratégique privé</strong><span>Analyse les risques • Cite les passages • Signale les incertitudes</span></div></div><div class="pa-j-row"><div class="pa-j-option selected"><strong>Instruction</strong><span>Répondre uniquement à partir du dossier</span></div><div class="pa-j-option"><strong>Sortie</strong><span>Synthèse exécutive + recommandations</span></div></div>`
    },
    {
      n: '04',
      title: 'Chargez le document top confidentiel',
      text: 'Ajoutez le PDF, DOCX, TXT ou Markdown au projet. PrivatAI prépare le document pour la recherche et l’analyse locales.',
      local: '<strong>Indexation locale.</strong><br>Le contenu est découpé et indexé sur votre ordinateur pour être interrogé par l’IA.',
      visual: `<div class="pa-j-top"><div class="pa-j-brand"><b>D</b>Documents</div><span class="pa-j-status">Indexation locale</span></div><div class="pa-j-file"><div class="pa-j-file-icon">PDF</div><div><strong>Projet_Atlas_TOP_SECRET.pdf</strong><small>86 pages • Dossier interne</small></div><span class="pa-j-classified">TOP SECRET</span></div><div class="pa-j-progress"><i></i></div><p class="pa-j-sub" style="margin-top:9px">Document prêt pour la recherche contextuelle locale.</p>`
    },
    {
      n: '05',
      title: 'Posez vos questions sur le dossier',
      text: 'Questionnez le document comme un analyste : risques, incohérences, décisions, chronologie, chiffres clés ou passages précis.',
      local: '<strong>Aucune API IA distante requise.</strong><br>La question, la recherche dans le document et l’inférence peuvent rester sur la machine.',
      visual: `<div class="pa-j-top"><div class="pa-j-brand"><b>C</b>Chat du projet</div><span class="pa-j-status">Hors ligne</span></div><div class="pa-j-chat"><div class="pa-j-bubble pa-j-user">Identifie les 5 risques critiques du projet, explique leur impact et cite les pages qui justifient chaque conclusion.</div><div class="pa-j-bubble pa-j-ai">Recherche locale dans <strong>Projet_Atlas_TOP_SECRET.pdf</strong>…</div></div>`
    },
    {
      n: '06',
      title: 'Obtenez une réponse contextualisée',
      text: 'PrivatAI croise les passages retrouvés avec le modèle local pour produire une réponse exploitable, avec les références du dossier.',
      local: '<strong>Traçabilité documentaire.</strong><br>La réponse peut conserver les références utiles afin de revenir au passage source.',
      visual: `<div class="pa-j-top"><div class="pa-j-brand"><b>IA</b>Réponse locale</div><span class="pa-j-status">Terminé</span></div><div class="pa-j-chat"><div class="pa-j-bubble pa-j-ai" style="max-width:100%"><strong>1. Risque de dépendance fournisseur — élevé.</strong><br>Le contrat concentre trois composants critiques chez un fournisseur unique…<div class="pa-j-citations"><span>p. 18</span><span>p. 34–35</span><span>p. 62</span></div></div><div class="pa-j-bubble pa-j-ai" style="max-width:100%"><strong>2. Risque de calendrier — élevé.</strong><br>Deux jalons structurants ont moins de dix jours de marge…<div class="pa-j-citations"><span>p. 41</span><span>p. 47</span></div></div></div>`
    },
    {
      n: '07',
      title: 'Générez et téléchargez le livrable',
      text: 'Transformez l’analyse en document professionnel : synthèse exécutive, note de décision, rapport, recommandations ou compte rendu.',
      local: '<strong>Sortie sur votre ordinateur.</strong><br>Le livrable est généré depuis le contexte du projet puis enregistré dans votre environnement.',
      visual: `<div class="pa-j-top"><div class="pa-j-brand"><b>R</b>Studio Documents</div><span class="pa-j-status">Prêt</span></div><h4 class="pa-j-title">Rapport confidentiel — Opération Atlas</h4><p class="pa-j-sub">Synthèse exécutive • risques • preuves documentaires • recommandations</p><div class="pa-j-export"><div class="pa-j-export-head"><div><strong>Rapport_confidentiel_Atlas.docx</strong><small>Document professionnel généré localement</small></div><button class="pa-j-download" type="button" tabindex="-1">Télécharger</button></div><div class="pa-j-formats"><span>DOCX</span><span>PDF</span><span>HTML</span><span>Markdown</span></div></div>`
    }
  ];

  const tabs = [...journey.querySelectorAll('.pa-journey-tab')];
  const number = journey.querySelector('.pa-journey-number');
  const title = journey.querySelector('.pa-journey-copy h3');
  const text = journey.querySelector('.pa-journey-copy > p');
  const local = journey.querySelector('.pa-journey-local div');
  const visual = journey.querySelector('[data-journey-visual]');

  const showStep = (index, focus = false) => {
    const data = stepData[index];
    if (!data) return;
    tabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    number.textContent = data.n;
    title.textContent = data.title;
    text.textContent = data.text;
    local.innerHTML = data.local;
    visual.innerHTML = data.visual;
    if (focus) tabs[index]?.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showStep(index));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      showStep(next, true);
    });
  });

  showStep(0);
})();
