(() => {
  'use strict';

  const E = 'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-fa-chat';
  const K = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJtdnlucXBxdWxoZmx4dHl5bXR6cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ3NTk4MTUzLCJleHAiOjIwNjMxMzQxNTN9.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8';
  const J = 'fa_ia_journal_v5_2';
  const A = window.FA_ASSETS || {};
  const app = document.getElementById('app');

  const C = [
    'Destinée et orientation', 'Travail et vocation', 'Entreprise ou projet', 'Argent et ressources',
    'Mariage et union', 'Relation et communication', 'Famille et lignée', 'Conflit ou litige',
    'Voyage ou déplacement', 'Santé et équilibre personnel', 'Protection', 'Apprentissage et initiation',
    'Choix entre plusieurs possibilités', 'Compréhension d’un blocage', 'Projet communautaire', 'Question libre',
  ];

  const B = [
    ['GBÉ', 'IIII', 'vie, renaissance et ouverture', 'renouveau, vitalité et capacité de recommencer', 'dispersion et impulsivité', 'clarifier ce qui doit renaître'],
    ['GOUDA', 'III2', 'transmission, responsabilité et engagement collectif', 'courage de servir et transmission utile', 'charge excessive ou engagement mal défini', 'définir clairement les responsabilités'],
    ['LÊTÊ', 'II2I', 'fertilité, abondance et prospérité consciente', 'croissance progressive et ressources disponibles', 'excès ou impatience', 'organiser les ressources avec mesure'],
    ['LOSSO', 'II22', 'alliances, destin collectif et pièges invisibles', 'coopération et force du réseau', 'promesse ambiguë ou alliance déséquilibrée', 'vérifier les alliances'],
    ['TOULA', 'I2II', 'dualité, chaos créateur et maîtrise des contraires', 'créativité et adaptation', 'confusion ou choix contradictoires', 'choisir une direction cohérente'],
    ['TCHÊ', 'I2I2', 'discernement, vérité et intelligence', 'lucidité et décision juste', 'parole tranchante ou jugement précipité', 'chercher les faits et parler avec mesure'],
    ['DI', 'I22I', 'vérité cachée, épreuve et transformation', 'révélation utile et courage intérieur', 'secret ou blocage enfoui', 'examiner la cause réelle'],
    ['ABLA', 'I222', 'service, humilité et épreuve initiatique', 'patience et utilité sociale', 'sacrifice de soi excessif', 'servir sans s’effacer'],
    ['SA', '2III', 'temps, cycles et maturation', 'patience et sens du rythme', 'retard ou répétition d’un cycle', 'respecter la temporalité'],
    ['WOLI', '2II2', 'rêves, intuition et mondes cachés', 'intuition fine et perception des signaux faibles', 'illusion ou interprétation excessive', 'recouper l’intuition avec les faits'],
    ['FOU', '2I2I', 'silence, invisible et profondeur', 'écoute intérieure et prudence', 'isolement ou non-dit', 'ralentir et observer'],
    ['TROUKPIN', '2I22', 'mémoire, réparation et retour à l’origine', 'reconnexion et réparation', 'oubli ou perte de repères', 'retrouver l’origine du problème'],
    ['WLIN', '22II', 'résistance, évolution lente et pouvoir intérieur', 'endurance et progrès durable', 'rigidité ou fatigue prolongée', 'avancer avec constance'],
    ['KA', '22I2', 'volonté, combat et victoire sur l’adversité', 'force et dépassement par l’effort', 'conflit ou usage excessif de la force', 'agir avec fermeté et justice'],
    ['AKLAN', '222I', 'feu créateur, conflit et métamorphose', 'énergie créatrice et transformation rapide', 'colère ou rupture brutale', 'canaliser l’énergie avant d’agir'],
    ['YÊKOU', '2222', 'parole, justice et mémoire', 'vérité, médiation et parole réparatrice', 'malentendu ou parole blessante', 'réparer les non-dits et respecter la parole donnée'],
  ].map((x, i) => ({ n: i + 1, name: x[0], p: [...x[1]].map((v) => (v === '2' ? 'II' : 'I')), theme: x[2], light: x[3], shadow: x[4], action: x[5] }));

  const F = [
    ['comprehensive', 'Comprendre le signe en profondeur', 'Analyser le message central, les forces, les vigilances, les conditions d’évolution et l’orientation juste à partir de l’interprétation intégrale.'],
    ['positive', 'Lumière et ouvertures', 'Analyser les forces, protections, ouvertures et conditions favorables soutenues par l’interprétation intégrale.'],
    ['warning', 'Vigilances et obstacles', 'Analyser les risques, blocages et attitudes aggravantes sans fatalité, à partir de l’interprétation intégrale.'],
    ['relationship', 'Amour, famille et relations', 'Interpréter les liens, la famille, le couple, la parole et la confiance dans le contexte de la consultation.'],
    ['work', 'Travail, argent et projets', 'Interpréter le travail, les ressources, le commerce et les projets dans le contexte de la consultation.'],
    ['health', 'Santé et équilibre', 'Présenter uniquement une lecture symbolique de l’équilibre, sans diagnostic ni traitement.'],
    ['action', 'Conseils et conduite à tenir', 'Transformer le message du signe en conseils pratiques sans inventer de rituel réservé.'],
    ['summary', 'Résumé essentiel', 'Donner une synthèse courte : message, force, vigilance et orientation.'],
  ].map((x) => ({ key: x[0], label: x[1], instruction: x[2] }));

  let s = { screen: 'home', step: 0, cat: '', raw: '', intent: '', faces: Array(8).fill('OPEN'), sign: null, phase: 'Le silence s’installe', throwing: false, msg: [], typing: false, quick: [], id: null, date: null, menu: null };

  const esc = (x) => String(x ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const rnd = (n) => { const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0] % n; };
  const toast = (x) => { const element = document.getElementById('toast'); if (!element) return; element.textContent = x; element.classList.add('show'); setTimeout(() => element.classList.remove('show'), 2200); };
  const head = (title, subtitle, back = true, actions = '') => `<header class="topbar">${back ? '<button class="icon-btn" data-a="back" aria-label="Retour">←</button>' : ''}<div class="titles"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${actions}</header>`;
  const bubble = (m) => `<div class="bubble ${m.r === 'user' ? 'user' : ''} ${m.e ? 'error' : ''}">${m.r === 'assistant' ? '<span class="spark">✦</span>' : ''}${esc(m.t).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>`;

  function render() { app.innerHTML = `<div class="app-shell">${navigator.onLine ? '' : '<div class="offline-banner">Mode hors ligne : lancer et journal disponibles.</div>'}${s.screen === 'home' ? home() : s.screen === 'consult' ? consult() : s.screen === 'result' ? result() : journal()}</div>`; bind(); }
  function home() { return `${head('FA IA', 'Consultation du Fâ', false)}<section class="screen"><div class="hero" style="background-image:url('${A.fa_chain_mystic_hero || ''}')"><div class="hero-content"><span class="badge">8 CAURIS · 1 SIGNE</span><h2 class="hero-title">Une intention.<br>Un lancer.<br>Un message.</h2><button class="primary" data-a="start">◉ Lancer le Fâ</button></div></div><div class="actions-grid"><button class="compact-card" data-a="start"><span class="card-icon" style="background:#f8efdc;color:#d6a64a">◉</span><h3>Télé-consultation</h3><p>Une intention, un signe</p></button><button class="compact-card" data-a="journal"><span class="card-icon" style="background:#e8efec;color:#497b67">▤</span><h3>Journal</h3><p>Vos consultations</p></button></div><div class="hint-card"><span>✦</span><span>Concentrez-vous. Lancez la chaîne. Laissez le signe parler.</span></div></section>`; }
  function consult() { let content = s.msg.map(bubble).join(''); if (!s.step) content += `<div class="chips">${C.map((c) => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>`; if (s.step === 2) content += stage(); return `${head('FA IA', 'Consultation assistée', true, '<button class="icon-btn" data-a="start" aria-label="Recommencer">↻</button>')}<section class="screen"><div class="chat-list">${content}</div></section>${s.step === 1 ? '<div class="composer"><div class="composer-row"><textarea id="intent" maxlength="280" placeholder="Écrivez votre situation..."></textarea><button class="send-btn" data-a="intent" aria-label="Envoyer">↑</button></div><button class="silent-btn" data-a="silent">◉̸ Garder mon intention en silence</button></div>' : ''}`; }
  function grid(show = false) { const order = [0, 4, 1, 5, 2, 6, 3, 7]; return `<div class="cowrie-grid">${order.map((i) => { const face = s.faces[i]; const visibleFace = (!show && s.throwing) ? 'OPEN' : face; const src = visibleFace === 'OPEN' ? A.cowrie_open_real : A.cowrie_closed_real; return `<div class="cowrie-slot" data-face-index="${i}"><img class="cowrie" data-face-index="${i}" src="${src}" alt="Cauri"><div class="trait">${show ? (face === 'OPEN' ? 'I' : 'II') : ''}</div></div>`; }).join('')}</div>`; }
  function stage() { return `<div class="chain-stage"><div class="chain-card ${s.throwing ? 'throwing' : ''}"><div class="chain-title">CHAÎNE DU FÂ</div><div class="phase">${esc(s.phase)}</div>${grid(false)}</div><button class="big-brown" data-a="throw" ${s.throwing ? 'disabled' : ''}>◉ ${s.throwing ? 'Le Fâ se révèle…' : 'Lancer le Fâ'}</button><button class="text-action" data-a="change" ${s.throwing ? 'disabled' : ''}>✎ Changer mon intention</button></div>`; }
  function result() { const fav = entry(s.id)?.fav; const actions = `<button class="icon-btn" data-a="copy" aria-label="Copier">▣</button><button class="icon-btn" data-a="fav" aria-label="Favori">${fav ? '★' : '☆'}</button><button class="icon-btn" data-a="save" aria-label="Enregistrer">🔖</button>`; return `${head(s.sign.name, 'Interprétation en conversation', true, actions)}<section class="screen result-chat"><div class="reveal-card"><div class="reveal-chain"><div class="chain-title">CHAÎNE DU FÂ</div>${grid(true)}</div><div class="reveal-meta"><div class="eyebrow">SIGNE RÉVÉLÉ</div><h2>${esc(s.sign.name)}</h2><p>${esc(s.cat)}</p></div></div><div style="height:14px"></div>${s.msg.map(bubble).join('')}${s.typing ? '<div class="bubble"><span class="typing"><i></i><i></i><i></i></span> FA IA approfondit l’interprétation…</div>' : ''}${s.quick.length && !s.typing ? `<div class="quick-replies">${s.quick.map((q) => `<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}<div class="footer-note">Lecture FA IA V5.2. Une pratique traditionnelle réservée doit être validée par un Bokonon qualifié.</div></section><div class="composer"><div class="composer-row"><button class="icon-btn" style="color:#24150c;font-size:28px" data-a="start" aria-label="Recommencer">↻</button><input id="chat" maxlength="1800" placeholder="Question sur le signe..."><button class="send-btn" data-a="send" aria-label="Envoyer">↑</button></div></div>`; }
  function journal() { const entries = list(); const action = entries.length ? '<button class="icon-btn" data-a="clear" aria-label="Vider le journal">⌫</button>' : ''; let content = '<div class="journal-info"><h2>🔒 Journal privé sur ce téléphone</h2><p>Relisez les signes reçus, observez les changements et évitez de répéter immédiatement la même question. Les données restent dans le stockage local de l’application.</p></div>'; content += entries.length ? `<div class="journal-list">${entries.map(card).join('')}</div>` : '<div class="empty"><div class="big-icon">▤</div><h2>Votre journal est vide</h2><p>Après un lancer, enregistrez le signe et sa lecture.</p><button class="primary" data-a="start">Commencer une consultation</button></div>'; return `${head('Mon journal du Fâ', '', true, action)}<section class="screen">${content}</section>`; }
  function card(e) { const date = new Date(e.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); return `<article class="journal-card" data-open="${e.id}"><div class="ref-badge">${e.sign.ref}</div><div><h3>${esc(e.sign.name)}</h3><div class="category">${esc(e.cat)}</div><div class="date">${date}</div><div class="intention">${esc(e.raw || 'Intention gardée en silence')}</div></div><div class="menu"><button class="icon-btn" data-menu="${e.id}" aria-label="Menu">⋮</button>${s.menu === e.id ? `<div class="menu-panel"><button data-do="open" data-id="${e.id}">Ouvrir</button><button data-do="copy" data-id="${e.id}">Copier</button><button data-do="fav" data-id="${e.id}">${e.fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button><button class="danger" data-do="del" data-id="${e.id}">Supprimer</button></div>` : ''}</div></article>`; }

  function bind() { app.querySelectorAll('[data-a]').forEach((e) => { e.onclick = () => act(e.dataset.a); }); app.querySelectorAll('[data-cat]').forEach((e) => { e.onclick = () => cat(e.dataset.cat); }); app.querySelectorAll('[data-q]').forEach((e) => { e.onclick = () => send(e.dataset.q); }); app.querySelectorAll('[data-open]').forEach((e) => { e.onclick = (event) => { if (!event.target.closest('[data-menu]') && !event.target.closest('.menu-panel')) open(e.dataset.open); }; }); app.querySelectorAll('[data-menu]').forEach((e) => { e.onclick = (event) => { event.stopPropagation(); s.menu = s.menu === e.dataset.menu ? null : e.dataset.menu; render(); }; }); app.querySelectorAll('[data-do]').forEach((e) => { e.onclick = (event) => { event.stopPropagation(); doEntry(e.dataset.do, e.dataset.id); }; }); const chat = document.getElementById('chat'); if (chat) chat.onkeydown = (event) => { if (event.key === 'Enter') { event.preventDefault(); send(); } }; }
  function act(action) { if (s.throwing && ['start', 'journal', 'back', 'change', 'clear'].includes(action)) return; if (action === 'start') start(); else if (action === 'journal') { s.screen = 'journal'; render(); } else if (action === 'back') { s.screen === 'consult' && s.step ? s.step-- : (s.screen = 'home'); render(); } else if (action === 'intent') intent(false); else if (action === 'silent') intent(true); else if (action === 'throw') throwFa(); else if (action === 'change') { s.step = 1; render(); } else if (action === 'send') send(); else if (action === 'save') { save(); toast('Consultation enregistrée.'); } else if (action === 'copy') copy(); else if (action === 'fav') fav(s.id); else if (action === 'clear' && confirm('Vider le journal ?')) { localStorage.removeItem(J); render(); } }
  function start() { s = { ...s, screen: 'consult', step: 0, cat: '', raw: '', intent: '', faces: Array(8).fill('OPEN'), sign: null, phase: 'Le silence s’installe', throwing: false, msg: [{ r: 'assistant', t: 'Que souhaitez-vous éclairer ?' }], typing: false, quick: [], id: null, date: null }; render(); }
  function cat(category) { s.cat = category; s.step = 1; s.msg.push({ r: 'user', t: category }, { r: 'assistant', t: 'Gardez votre souhait en vous, ou écrivez une phrase.' }); render(); }
  function intent(silent) { const raw = silent ? '' : (document.getElementById('intent')?.value || '').trim(); s.raw = raw; s.intent = raw || `Quelles forces, difficultés et conditions dois-je considérer dans le domaine « ${s.cat} » ?`; s.step = 2; s.msg.push({ r: 'user', t: raw || 'Je garde mon intention en silence.' }, { r: 'assistant', t: raw ? 'Intention comprise. Respirez, puis lancez la chaîne.' : 'Très bien. Respirez, puis lancez la chaîne.' }); render(); }
  function resolve(faces) { const a = faces.slice(0, 4).map((x) => (x === 'OPEN' ? 'I' : 'II')); const b = faces.slice(4).map((x) => (x === 'OPEN' ? 'I' : 'II')); const y = B.find((x) => x.p.join() === a.join()); const x = B.find((value) => value.p.join() === b.join()); if (!x || !y) throw new Error('Configuration du signe invalide.'); return { x, y, a, b, ref: `${x.n}-${y.n}`, name: x.n === y.n ? `${x.name}-Mêji` : `${x.name} - ${y.name}` }; }

  async function throwFa() {
    if (s.throwing) return;
    const finalFaces = Array.from({ length: 8 }, () => (rnd(2) ? 'OPEN' : 'CLOSED'));
    s.faces = finalFaces; s.throwing = true; s.phase = 'Le silence s’installe'; render();
    const duration = 6500 + rnd(3001);
    const phases = [['La chaîne s’éveille', 0.08], ['Les huit cauris se mêlent', 0.23], ['Le mouvement s’intensifie', 0.43], ['Les faces restent cachées', 0.66], ['La chaîne se stabilise', 0.84], ['Le signe se révèle', 0.94]];
    const timers = phases.map(([label, ratio]) => setTimeout(() => { s.phase = label; const phase = document.querySelector('.chain-card.throwing .phase'); if (phase) phase.textContent = label; const button = document.querySelector('[data-a="throw"]'); if (button) { button.disabled = true; button.textContent = '◉ Le Fâ se révèle…'; } }, Math.round(duration * ratio)));
    try { if (window.FA_FLUTTER_THROW?.play) await window.FA_FLUTTER_THROW.play({ duration, finalFaces }); else await new Promise((resolveWait) => setTimeout(resolveWait, duration)); }
    catch (error) { console.error('Animation FA IA indisponible', error); await new Promise((resolveWait) => setTimeout(resolveWait, duration)); }
    finally { timers.forEach(clearTimeout); }
    s.sign = resolve(finalFaces); s.phase = s.sign.name; s.throwing = false; render();
    await new Promise((resolveWait) => setTimeout(resolveWait, 720));
    s.screen = 'result'; s.id = crypto.randomUUID ? crypto.randomUUID() : `fa-${Date.now()}`; s.date = new Date().toISOString(); s.msg = [{ r: 'assistant', t: `Les huit faces ont formé ${s.sign.name}. Posez-moi vos questions sur ce signe.` }]; s.typing = true; render();
    const answerText = await answer('Comprendre le signe en profondeur', []); s.msg.push({ r: 'assistant', t: answerText }); s.quick = F.map((x) => x.label); s.typing = false; save(); render();
  }

  function focus(message) { const normalized = norm(message); const exact = F.find((x) => norm(x.label) === normalized); if (exact) return exact; if (/LUMIERE|POSITIF|OUVERTURE/.test(normalized)) return F[1]; if (/VIGILANCE|DANGER|OBSTACLE/.test(normalized)) return F[2]; if (/AMOUR|FAMILLE|RELATION|MARIAGE/.test(normalized)) return F[3]; if (/TRAVAIL|ARGENT|PROJET|ENTREPRISE/.test(normalized)) return F[4]; if (/SANTE|CORPS|EQUILIBRE/.test(normalized)) return F[5]; if (/CONSEIL|ACTION|FAIRE|EVITER/.test(normalized)) return F[6]; if (/RESUME|ESSENTIEL/.test(normalized)) return F[7]; return F[0]; }
  function payload(message, history) { const selected = focus(message); return { action: 'interpret', sign: { reference: s.sign.ref, canonical_name: s.sign.name, x: s.sign.x.name, y: s.sign.y.name, column_a: s.sign.a, column_b: s.sign.b }, context: { category: s.cat, intention: s.intent, locale: 'fr-BJ' }, focus: { intent_key: selected.key, label: selected.label, instruction: selected.instruction, required_sections: [selected.label], excluded_angles: [] }, history: history.slice(-8).map((x) => ({ role: x.r, content: x.t })), user_message: message, constraints: { document_only: true, simple_french: true, detail_level: 'balanced', max_words: 320, hide_sources: true, speak_as_fa_knowledge: true, differentiate_each_payload: true, contextualize_with_intention: true, no_invented_ritual: true, no_occult_accusation: true, no_generic_base_sign_combination: true } }; }
  function fallback(message, history = []) { const selected = focus(message); if (!history.length && selected.key === 'comprehensive') return 'L’interprétation intégrale n’a pas pu être chargée. La lecture est suspendue afin d’éviter toute interprétation non vérifiée. Veuillez réessayer dans quelques instants.'; return `L’analyse contextuelle « ${selected.label} » est momentanément indisponible. Votre interprétation intégrale reste conservée. Veuillez relancer cette demande dans quelques instants.`; }
  const DEV_KEY = 'fa_ia_device_v1';
  const CODE_KEY = 'fa_ia_access_code_v1';
  function deviceId() { let v = localStorage.getItem(DEV_KEY); if (!v) { const seed = new Uint32Array(2); crypto.getRandomValues(seed); v = (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${seed[0].toString(36)}${seed[1].toString(36)}`); localStorage.setItem(DEV_KEY, v); } return v; }
  function accessCode() { return (localStorage.getItem(CODE_KEY) || '').trim() || null; }
  function setAccessCode(v) { if (v) localStorage.setItem(CODE_KEY, v); else localStorage.removeItem(CODE_KEY); }
  async function callFa(body) {
    const request = window.faAuthenticatedFetch || fetch;
    const headers = { 'Content-Type': 'application/json', apikey: K, Authorization: `Bearer ${K}`, 'x-fa-device': deviceId() };
    const code = accessCode(); if (code) headers['x-fa-code'] = code;
    const response = await request(E, { method: 'POST', headers, body: JSON.stringify({ ...body, device_id: deviceId(), access_code: code }) });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, data };
  }
  async function answer(message, history) {
    try {
      let res = await callFa(payload(message, history));
      if (res.status === 402 && (res.data?.reason === 'code_exhausted' || res.data?.reason === 'code_invalid' || res.data?.reason === 'code_expired' || res.data?.reason === 'code_inactive')) {
        setAccessCode(null);
      }
      if (res.status === 402) {
        const msg = res.data?.message || 'Quota atteint.';
        const entered = window.prompt(`${msg}\n\nEntrez un code d'accès à 6 chiffres pour continuer (ou annulez) :`, '');
        const clean = (entered || '').replace(/\D/g, '');
        if (clean.length === 6) {
          setAccessCode(clean);
          res = await callFa(payload(message, history));
        }
      }
      if (!res.ok) throw new Error(res.data?.message || `HTTP ${res.status}`);
      if (!res.data?.answer) throw new Error('Réponse vide');
      return res.data.answer;
    } catch (err) {
      toast(String(err.message || err));
      return fallback(message, history);
    }
  }
  async function send(quick) { const input = document.getElementById('chat'); const message = (quick || input?.value || '').trim(); if (!message || s.typing) return; const history = [...s.msg]; s.msg.push({ r: 'user', t: message }); s.quick = []; s.typing = true; render(); const response = await answer(message, history); s.msg.push({ r: 'assistant', t: response }); s.quick = F.map((x) => x.label); s.typing = false; save(); render(); }

  function list() { try { const parsed = JSON.parse(localStorage.getItem(J) || '[]'); return (Array.isArray(parsed) ? parsed : parsed.entries || []).sort((a, b) => new Date(b.date) - new Date(a.date)); } catch { return []; } }
  function write(entries) { localStorage.setItem(J, JSON.stringify({ version: '5.2', corpus_presentation_version: window.__FA_CORPUS_TEST__?.presentationVersion || null, entries: entries.slice(0, 100) })); }
  function entry(id) { return list().find((x) => x.id === id); }
  function save() { if (!s.id) return; const entries = list(); const existing = entry(s.id) || {}; const item = { ...existing, id: s.id, date: s.date, cat: s.cat, raw: s.raw, intent: s.intent, faces: s.faces, sign: { ref: s.sign.ref, name: s.sign.name, x: s.sign.x.n, y: s.sign.y.n }, msg: s.msg, fav: existing.fav || false }; const index = entries.findIndex((x) => x.id === s.id); if (index >= 0) entries[index] = item; else entries.unshift(item); write(entries); }
  function fav(id) { const entries = list(); const item = entries.find((x) => x.id === id); if (!item) { save(); return fav(id); } item.fav = !item.fav; write(entries); toast(item.fav ? 'Ajouté aux favoris.' : 'Retiré des favoris.'); render(); }
  function open(id) { const item = entry(id); if (!item) return; const x = B[item.sign.x - 1], y = B[item.sign.y - 1]; s = { ...s, screen: 'result', id: item.id, date: item.date, cat: item.cat, raw: item.raw, intent: item.intent, faces: item.faces, sign: { x, y, a: y.p, b: x.p, ref: item.sign.ref, name: item.sign.name }, msg: item.msg, quick: F.map((value) => value.label), typing: false, menu: null }; render(); }
  function copy() { navigator.clipboard?.writeText(`FA IA — ${s.sign.name}\n${s.sign.a.map((x, i) => `${x}     ${s.sign.b[i]}`).join('\n')}`); toast('Signe copié.'); }
  function doEntry(action, id) { const item = entry(id); if (action === 'open') open(id); else if (action === 'copy') { navigator.clipboard?.writeText(`FA IA — ${item.sign.name}`); toast('Copié.'); } else if (action === 'fav') fav(id); else if (action === 'del' && confirm('Supprimer cette consultation ?')) { write(list().filter((x) => x.id !== id)); s.menu = null; render(); } }

  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  window.addEventListener('pagehide', () => window.FA_FLUTTER_THROW?.cancel?.());
  window.__FA_IA_TEST__ = { B, C, F, resolve, focus, verifyFaces: (faces) => ({ valid: Array.isArray(faces) && faces.length === 8 && faces.every((x) => x === 'OPEN' || x === 'CLOSED'), sign: resolve(faces) }) };
  render();
})();