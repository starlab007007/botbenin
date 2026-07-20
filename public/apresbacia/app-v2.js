(() => {
  'use strict';

  const SUPABASE_URL = 'https://mvynepqulhflxtyymtzs.supabase.co';
  const KEY_PARTS = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.',
    'g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8',
  ];
  const SUPABASE_ANON_KEY = KEY_PARTS.join('');
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/waouh-apresbac-chat`;
  const PUBLIC_URL = 'https://bot.bj/apresbacia';
  const MESSAGES_KEY = 'botbj_apresbacia_clone_messages_v2';
  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';

  const seriesOptions = ['Toutes', 'A1', 'A2', 'B', 'C', 'D', 'E', 'F1', 'F2', 'F3', 'F4', 'G1', 'G2', 'G3', 'EA', 'DEAT', 'DT'];
  const commonSubjects = ['Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'SVT', 'Philosophie', 'Histoire-Géographie', 'Économie', 'Comptabilité', 'Informatique', 'Électrotechnique', 'Construction mécanique', 'Dessin technique', 'Autre'];

  const state = {
    messages: readJson(MESSAGES_KEY, []),
    notes: readJson(NOTES_KEY, []),
    sessionId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    sending: false,
    programCount: 615,
    toolsCollapsed: false,
    scanFile: null,
    scanText: '',
  };

  const els = {
    statusStrip: document.getElementById('statusStrip'),
    statusText: document.getElementById('statusText'),
    toolsGrid: document.getElementById('toolsGrid'),
    collapseButton: document.getElementById('collapseButton'),
    collapseText: document.getElementById('collapseText'),
    series: document.getElementById('seriesSelect'),
    notesCount: document.getElementById('notesCount'),
    notesBadge: document.getElementById('notesBadge'),
    programCount: document.getElementById('programCount'),
    messages: document.getElementById('messages'),
    composer: document.getElementById('composer'),
    input: document.getElementById('messageInput'),
    send: document.getElementById('sendButton'),
    clear: document.getElementById('clearButton'),
    refresh: document.getElementById('refreshButton'),
    back: document.getElementById('backButton'),
    notesModal: document.getElementById('notesModal'),
    scanModal: document.getElementById('scanModal'),
    subjectSelect: document.getElementById('subjectSelect'),
    customSubject: document.getElementById('customSubject'),
    noteValue: document.getElementById('noteValue'),
    addNoteButton: document.getElementById('addNoteButton'),
    notesList: document.getElementById('notesList'),
    clearNotes: document.getElementById('clearNotesButton'),
    scanInput: document.getElementById('scanInput'),
    scanPreview: document.getElementById('scanPreview'),
    scanProgress: document.getElementById('scanProgress'),
    scanProgressText: document.getElementById('scanProgressText'),
    scanText: document.getElementById('scanText'),
    runOcr: document.getElementById('runOcrButton'),
    importOcr: document.getElementById('importOcrButton'),
    toast: document.getElementById('toast'),
  };

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(state.messages.slice(-50)));
    localStorage.setItem(NOTES_KEY, JSON.stringify(state.notes.slice(0, 40)));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function selectedSeries() {
    return els.series.value === 'Toutes' ? null : els.series.value;
  }

  function normalizedNotes() {
    return state.notes.map((item) => ({
      subject: item.subject,
      subject_name: item.subject,
      name: item.subject,
      score: Number(item.score),
      value: Number(item.score),
      source: item.source || 'public_web',
    }));
  }

  function notesSummary() {
    if (!state.notes.length) return 'Aucune note enregistrée.';
    return state.notes.map((item) => `${item.subject}: ${Number(item.score).toFixed(2)}/20`).join(', ');
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  function setStatus(ok, text) {
    els.statusStrip.classList.toggle('error', !ok);
    els.statusText.textContent = text;
  }

  function renderSeries() {
    const remembered = localStorage.getItem(SERIES_KEY) || 'Toutes';
    els.series.innerHTML = seriesOptions.map((value) => `<option value="${escapeHtml(value)}"${value === remembered ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
  }

  function renderCounters() {
    const count = state.notes.length;
    els.notesCount.textContent = `${count} note${count > 1 ? 's' : ''}`;
    els.notesBadge.textContent = String(count);
    els.notesBadge.classList.toggle('hidden', count === 0);
    els.programCount.textContent = `${state.programCount} filières`;
  }

  function renderNotes() {
    if (!state.notes.length) {
      els.notesList.innerHTML = '<div class="empty">Aucune note enregistrée. Ajoutez les matières principales de votre relevé.</div>';
      return;
    }
    els.notesList.innerHTML = state.notes.map((item, index) => `
      <div class="note-item">
        <div><strong>${escapeHtml(item.subject)}</strong><span>${Number(item.score).toFixed(2)} / 20 · ${item.source === 'ocr' ? 'OCR' : 'saisie manuelle'}</span></div>
        <button type="button" class="small-btn" data-edit-note="${index}" title="Modifier">✎</button>
        <button type="button" class="small-btn" data-delete-note="${index}" title="Supprimer">×</button>
      </div>`).join('');
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function renderPrograms(programs) {
    return toArray(programs).slice(0, 8).map((program) => {
      const name = program?.name || program?.program_name || program?.nom_exact_filiere || 'Filière';
      const institution = program?.institution || program?.etablissement || 'Établissement à confirmer';
      const university = program?.university || program?.universite || '';
      const score = Number.isFinite(Number(program?.match_score)) ? Math.round(Number(program.match_score)) : null;
      const eligibility = program?.eligibility && typeof program.eligibility === 'object' ? program.eligibility : null;
      const subjects = toArray(program?.subjects).filter(Boolean).slice(0, 8);
      const occupations = toArray(program?.occupations).filter(Boolean).slice(0, 8);
      const chips = [program?.admission_mode, program?.scholarship_quota != null ? `Bourse : ${program.scholarship_quota}` : null, program?.aid_fpp_quota != null ? `Aide/FPP : ${program.aid_fpp_quota}` : null, eligibility?.label].filter(Boolean);
      return `<details class="program"><summary><div class="program-main"><div class="program-title">${escapeHtml(name)}</div><div class="program-subtitle">${escapeHtml([institution, university].filter(Boolean).join(' · '))}</div></div>${score == null ? '' : `<div class="score">${score}</div>`}</summary><div class="program-body">${chips.length ? `<div class="chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>` : ''}${eligibility?.message ? `<p><strong>${escapeHtml(eligibility.message)}</strong></p>` : ''}${subjects.length ? `<p><strong>Matières :</strong> ${escapeHtml(subjects.join(', '))}</p>` : ''}${program?.outcomes ? `<p><strong>Débouchés :</strong> ${escapeHtml(program.outcomes)}</p>` : ''}${occupations.length ? `<p><strong>Métiers :</strong> ${escapeHtml(occupations.join(', '))}</p>` : ''}</div></details>`;
    }).join('');
  }

  function renderMessage(message) {
    const role = message.role === 'user' ? 'user' : 'assistant';
    const sections = toArray(message.sections).slice(0, 6).map((section) => `<article class="answer-section"><h3>${escapeHtml(section?.title || 'Détail')}</h3><p>${escapeHtml(section?.content || '')}</p></article>`).join('');
    const programs = renderPrograms(message.programs);
    const followups = toArray(message.followUps).slice(0, 5).map((text) => `<button type="button" class="followup" data-prompt="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('');
    return `<div class="message-row ${role}"><div class="bubble${message.error ? ' error' : ''}">${message.summary ? `<div class="summary">${escapeHtml(message.summary)}</div>` : ''}<div>${escapeHtml(message.text || '')}</div>${sections ? `<div class="sections">${sections}</div>` : ''}${programs ? `<div class="programs">${programs}</div>` : ''}${followups ? `<div class="followups">${followups}</div>` : ''}${message.error && message.retryPrompt ? `<button type="button" class="retry" data-prompt="${escapeHtml(message.retryPrompt)}">Réessayer</button>` : ''}</div></div>`;
  }

  function renderMessages() {
    els.messages.innerHTML = state.messages.map(renderMessage).join('') + (state.sending ? '<div class="message-row assistant"><div class="bubble"><span class="typing">AprèsBac IA prépare la réponse <span class="dots"><i></i><i></i><i></i></span></span></div></div>' : '');
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  }

  function autoResize() {
    els.input.style.height = 'auto';
    els.input.style.height = `${Math.min(145, Math.max(78, els.input.scrollHeight))}px`;
  }

  async function invoke(body, attempt = 0) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'x-request-id': `public-clone-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch (_) { throw new Error('Réponse invalide du service AprèsBac IA.'); }
      if (!response.ok || data?.ok === false || data?.error) throw new Error(data?.message || data?.technical_message || `Erreur ${response.status}`);
      return data;
    } catch (error) {
      if (attempt === 0 && (error?.name === 'AbortError' || String(error).toLowerCase().includes('network'))) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        return invoke(body, 1);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function healthCheck() {
    setStatus(true, 'Connexion à AprèsBac IA…');
    try {
      const data = await invoke({ action: 'health', context: { locale: 'fr-BJ', channel: 'public-web-clone' } });
      const count = Number(data?.catalog?.programs || data?.program_count || 615);
      if (Number.isFinite(count) && count > 0) state.programCount = count;
      renderCounters();
      setStatus(true, 'AprèsBac IA est opérationnel.');
    } catch (_) {
      setStatus(false, 'AprèsBac IA est momentanément indisponible. Touchez Actualiser.');
    }
  }

  async function sendMessage(prompt) {
    const message = String(prompt ?? els.input.value).trim();
    if (!message || state.sending) return;
    state.messages.push({ role: 'user', text: message });
    state.sending = true;
    els.send.disabled = true;
    els.input.value = '';
    autoResize();
    saveState();
    renderMessages();
    try {
      const data = await invoke({
        action: 'chat',
        message,
        bac_series: selectedSeries(),
        session_id: state.sessionId,
        notes: normalizedNotes(),
        conversation: state.messages.slice(-10).map((entry) => ({ role: entry.role, content: entry.text })),
        context: {
          module_version: 'public-web-flutter-clone-2.0.0',
          locale: 'fr-BJ',
          channel: 'public-web',
          response_profile: 'COMPACT_DYNAMIC',
          max_results: 8,
          include: { quotas: true, subjects: true, outcomes: true, occupations: true, calculations: true, universities: true, follow_up_suggestions: true, sources: true },
        },
      });
      state.sessionId = data?.session_id || state.sessionId;
      state.messages.push({ role: 'assistant', text: data?.answer || 'La réponse est disponible.', summary: data?.summary || '', sections: data?.sections || [], programs: data?.programs || [], followUps: data?.follow_up_suggestions || [] });
      setStatus(true, 'AprèsBac IA est opérationnel.');
    } catch (error) {
      const text = error?.name === 'AbortError' ? 'La requête a expiré. Vérifiez votre connexion puis réessayez.' : (error?.message || 'AprèsBac IA ne peut pas répondre maintenant.');
      state.messages.push({ role: 'assistant', text, error: true, retryPrompt: message });
      setStatus(false, 'Une erreur est survenue. Vous pouvez réessayer.');
    } finally {
      state.sending = false;
      els.send.disabled = false;
      saveState();
      renderMessages();
    }
  }

  function promptForTool(action) {
    const series = selectedSeries() ? `Ma série du Bac est ${selectedSeries()}.` : 'Je n’ai pas encore sélectionné ma série du Bac.';
    const notes = notesSummary();
    const prompts = {
      profile: `${series} Mes notes sont : ${notes} Analyse mon profil scolaire, mes points forts, mes limites et propose les domaines d’études adaptés.`,
      recommendations: `${series} Mes notes sont : ${notes} Donne-moi mes meilleures recommandations de filières, classées et expliquées.`,
      eligibility: `${series} Mes notes sont : ${notes} Vérifie mon éligibilité aux filières compatibles et distingue les critères confirmés des informations à valider.`,
      ranking: `${series} Mes notes sont : ${notes} Vérifie les calculs de classement possibles avec les données officielles disponibles. N’invente aucun coefficient manquant.`,
      universities: `${series} Montre les universités et écoles qui proposent les filières compatibles avec mon profil.`,
      explore: `${series} Explore les filières compatibles, leurs débouchés, métiers, établissements, quotas et modes d’admission.`,
    };
    return prompts[action] || '';
  }

  function openModal(modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function addOrUpdateNote(subject, score, source = 'manual') {
    const cleanSubject = String(subject || '').trim();
    const numeric = Number(score);
    if (!cleanSubject) throw new Error('La matière est obligatoire.');
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 20) throw new Error('La note doit être comprise entre 0 et 20.');
    const existing = state.notes.findIndex((item) => item.subject.toLowerCase() === cleanSubject.toLowerCase());
    const value = { subject: cleanSubject, score: Math.round(numeric * 100) / 100, source };
    if (existing >= 0) state.notes[existing] = value;
    else state.notes.push(value);
    state.notes.sort((a, b) => a.subject.localeCompare(b.subject, 'fr'));
    saveState();
    renderNotes();
    renderCounters();
  }

  function populateSubjects() {
    els.subjectSelect.innerHTML = commonSubjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join('');
  }

  async function loadTesseract() {
    if (window.Tesseract) return window.Tesseract;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Le moteur OCR ne peut pas être chargé. Vérifiez la connexion.'));
      document.head.appendChild(script);
    });
    return window.Tesseract;
  }

  function normalizeSubject(raw) {
    const text = raw.replace(/[^A-Za-zÀ-ÿ\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const lower = text.toLowerCase();
    const aliases = [
      [/math/, 'Mathématiques'], [/fran/, 'Français'], [/angl/, 'Anglais'], [/phys|chim/, 'Physique-Chimie'], [/svt|sciences de la vie/, 'SVT'], [/philo/, 'Philosophie'], [/hist|géog|geog/, 'Histoire-Géographie'], [/écono|econo/, 'Économie'], [/compta/, 'Comptabilité'], [/inform/, 'Informatique'], [/électro|electro/, 'Électrotechnique'], [/dessin/, 'Dessin technique'],
    ];
    for (const [pattern, label] of aliases) if (pattern.test(lower)) return label;
    return text.length >= 2 ? text : '';
  }

  function extractNotes(text) {
    const detected = [];
    const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const matches = [...line.matchAll(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-\s]{1,38}?)\s*[:\-]?\s*(20(?:[,.]0+)?|1?\d(?:[,.]\d{1,2})?)\s*(?:\/\s*20)?\b/g)];
      for (const match of matches) {
        const subject = normalizeSubject(match[1]);
        const score = Number(String(match[2]).replace(',', '.'));
        if (subject && Number.isFinite(score) && score >= 0 && score <= 20 && !detected.some((item) => item.subject.toLowerCase() === subject.toLowerCase())) detected.push({ subject, score });
      }
    }
    return detected;
  }

  async function runOcr() {
    if (!state.scanFile) return toast('Choisissez ou photographiez d’abord le relevé.');
    els.runOcr.disabled = true;
    els.scanProgress.parentElement.classList.remove('hidden');
    els.scanProgress.style.width = '2%';
    els.scanProgressText.textContent = 'Chargement du moteur OCR…';
    try {
      const Tesseract = await loadTesseract();
      const result = await Tesseract.recognize(state.scanFile, 'fra+eng', {
        logger: (event) => {
          const progress = Math.max(2, Math.round(Number(event.progress || 0) * 100));
          els.scanProgress.style.width = `${progress}%`;
          els.scanProgressText.textContent = event.status ? `${event.status} · ${progress}%` : `${progress}%`;
        },
      });
      state.scanText = result?.data?.text || '';
      els.scanText.value = state.scanText;
      els.scanProgress.style.width = '100%';
      els.scanProgressText.textContent = 'OCR terminé. Vérifiez le texte puis importez les notes.';
      const count = extractNotes(state.scanText).length;
      toast(`${count} note${count > 1 ? 's' : ''} détectée${count > 1 ? 's' : ''}.`);
    } catch (error) {
      els.scanProgressText.textContent = error?.message || 'Échec de la lecture OCR.';
      toast(els.scanProgressText.textContent);
    } finally {
      els.runOcr.disabled = false;
    }
  }

  function importOcrNotes() {
    const detected = extractNotes(els.scanText.value);
    if (!detected.length) return toast('Aucune paire matière/note détectée. Corrigez le texte ou ajoutez les notes manuellement.');
    detected.forEach((item) => addOrUpdateNote(item.subject, item.score, 'ocr'));
    closeModal(els.scanModal);
    toast(`${detected.length} note${detected.length > 1 ? 's' : ''} importée${detected.length > 1 ? 's' : ''}.`);
  }

  function clearConversation() {
    if (!state.messages.length || confirm('Effacer la conversation AprèsBac IA ?')) {
      state.messages = [];
      state.sessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      saveState();
      renderMessages();
    }
  }

  document.addEventListener('click', (event) => {
    const tool = event.target.closest('[data-tool]');
    if (tool) {
      const action = tool.dataset.tool;
      if (action === 'notes') { renderNotes(); openModal(els.notesModal); return; }
      if (action === 'scan') { openModal(els.scanModal); return; }
      const prompt = promptForTool(action);
      if (prompt) void sendMessage(prompt);
    }
    const promptButton = event.target.closest('[data-prompt]');
    if (promptButton) void sendMessage(promptButton.dataset.prompt);
    const closeButton = event.target.closest('[data-close-modal]');
    if (closeButton) closeModal(document.getElementById(closeButton.dataset.closeModal));
    const deleteButton = event.target.closest('[data-delete-note]');
    if (deleteButton) {
      state.notes.splice(Number(deleteButton.dataset.deleteNote), 1);
      saveState(); renderNotes(); renderCounters();
    }
    const editButton = event.target.closest('[data-edit-note]');
    if (editButton) {
      const item = state.notes[Number(editButton.dataset.editNote)];
      if (!item) return;
      const value = prompt(`Modifier la note de ${item.subject} (0 à 20)`, String(item.score));
      if (value != null) {
        try { addOrUpdateNote(item.subject, value, item.source); } catch (error) { toast(error.message); }
      }
    }
  });

  els.collapseButton.addEventListener('click', () => {
    state.toolsCollapsed = !state.toolsCollapsed;
    els.toolsGrid.classList.toggle('hidden', state.toolsCollapsed);
    els.collapseText.textContent = state.toolsCollapsed ? 'Développer' : 'Réduire';
    els.collapseButton.querySelector('span:last-child').textContent = state.toolsCollapsed ? '⌄' : '⌃';
  });

  els.series.addEventListener('change', () => {
    localStorage.setItem(SERIES_KEY, els.series.value);
    toast(selectedSeries() ? `Série ${selectedSeries()} sélectionnée.` : 'Toutes les séries sélectionnées.');
  });

  els.composer.addEventListener('submit', (event) => { event.preventDefault(); void sendMessage(); });
  els.input.addEventListener('input', autoResize);
  els.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); }
  });
  els.clear.addEventListener('click', clearConversation);
  els.refresh.addEventListener('click', () => void healthCheck());
  els.back.addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'https://bot.bj'; });

  els.addNoteButton.addEventListener('click', () => {
    const subject = els.subjectSelect.value === 'Autre' ? els.customSubject.value : els.subjectSelect.value;
    try {
      addOrUpdateNote(subject, els.noteValue.value, 'manual');
      els.noteValue.value = '';
      els.customSubject.value = '';
      toast('Note enregistrée.');
    } catch (error) { toast(error.message); }
  });
  els.subjectSelect.addEventListener('change', () => els.customSubject.classList.toggle('hidden', els.subjectSelect.value !== 'Autre'));
  els.clearNotes.addEventListener('click', () => {
    if (state.notes.length && confirm('Supprimer toutes les notes enregistrées ?')) {
      state.notes = []; saveState(); renderNotes(); renderCounters(); toast('Notes supprimées.');
    }
  });

  els.scanInput.addEventListener('change', () => {
    const file = els.scanInput.files?.[0];
    if (!file) return;
    state.scanFile = file;
    els.scanPreview.src = URL.createObjectURL(file);
    els.scanPreview.classList.remove('hidden');
    els.scanText.value = '';
    els.scanProgress.parentElement.classList.add('hidden');
  });
  els.runOcr.addEventListener('click', () => void runOcr());
  els.importOcr.addEventListener('click', importOcrNotes);

  document.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => {
    const routes = { chat: '/app/chat', bots: '/app/bots', ia: '/apresbacia', diffusion: '/app/broadcast', partner: '/app/partner' };
    location.href = routes[button.dataset.nav] || '/';
  }));

  renderSeries();
  populateSubjects();
  renderNotes();
  renderCounters();
  renderMessages();
  autoResize();
  void healthCheck();
})();