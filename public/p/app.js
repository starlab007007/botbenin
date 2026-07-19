(() => {
  'use strict';

  const SUPABASE_URL = 'https://mvynepqulhflxtyymtzs.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8';
  const REST_URL = `${SUPABASE_URL}/rest/v1`;
  const CHECKIN_URL = `${SUPABASE_URL}/functions/v1/waouh-attendance-checkin`;

  const state = {
    code: '',
    site: null,
    employees: [],
    position: null,
    action: '',
    loading: false,
  };

  const el = {
    loading: document.getElementById('loadingState'),
    error: document.getElementById('errorState'),
    formState: document.getElementById('formState'),
    success: document.getElementById('successState'),
    errorMessage: document.getElementById('errorMessage'),
    errorCode: document.getElementById('errorCode'),
    retry: document.getElementById('retryButton'),
    again: document.getElementById('againButton'),
    siteName: document.getElementById('siteName'),
    siteDetails: document.getElementById('siteDetails'),
    employee: document.getElementById('employeeSelect'),
    last4: document.getElementById('last4Input'),
    actions: document.getElementById('actions'),
    gpsButton: document.getElementById('gpsButton'),
    gpsStatus: document.getElementById('gpsStatus'),
    form: document.getElementById('checkinForm'),
    submit: document.getElementById('submitButton'),
    successTitle: document.getElementById('successTitle'),
    successMessage: document.getElementById('successMessage'),
  };

  function headers() {
    return { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };
  }

  function show(name) {
    ['loading', 'error', 'formState', 'success'].forEach((key) => {
      el[key].classList.toggle('hidden', key !== name);
    });
  }

  function readCode() {
    const query = new URLSearchParams(location.search).get('c') || '';
    const hash = location.hash.replace(/^#/, '');
    const pathPart = location.pathname.split('/').filter(Boolean).pop() || '';
    const candidate = query || hash || (pathPart !== 'p' ? pathPart : '');
    return candidate.trim().toLowerCase();
  }

  async function rest(table, params) {
    const url = new URL(`${REST_URL}/${table}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { headers: headers(), cache: 'no-store' });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { data = null; }
    if (!response.ok) throw new Error(data?.message || `Erreur de lecture (${response.status})`);
    return data;
  }

  async function load() {
    show('loading');
    state.code = readCode();

    if (!/^[a-f0-9]{6,64}$/i.test(state.code)) {
      fail('Le lien de pointage est incomplet ou incorrect.', 'CODE_INVALIDE');
      return;
    }

    try {
      const exact = state.code.length > 12;
      const sites = await rest('waouh_attendance_sites_public', {
        select: 'id,name,address,radius_m,active,qr_token',
        qr_token: exact ? `eq.${state.code}` : `like.${state.code}%`,
        active: 'eq.true',
        limit: '2',
      });

      if (!Array.isArray(sites) || sites.length === 0) {
        fail('Ce QR ne correspond à aucun site actif. Demandez un nouveau QR au responsable.', 'SITE_INTROUVABLE');
        return;
      }
      if (sites.length > 1) {
        fail('Ce lien court est ambigu. Demandez au responsable de régénérer le QR.', 'CODE_AMBIGU');
        return;
      }

      state.site = sites[0];
      const employees = await rest('waouh_attendance_employees_public', {
        select: 'id,full_name',
        site_id: `eq.${state.site.id}`,
        active: 'eq.true',
        order: 'full_name.asc',
      });
      state.employees = Array.isArray(employees) ? employees : [];

      if (!state.employees.length) {
        fail("Aucun employé actif n'est renseigné pour ce site. Contactez le responsable.", 'AUCUN_EMPLOYE');
        return;
      }

      el.siteName.textContent = state.site.name || 'Site de pointage';
      el.siteDetails.textContent = [state.site.address, `Rayon autorisé : ${state.site.radius_m} m`]
        .filter(Boolean)
        .join(' · ');
      el.employee.innerHTML = '<option value="">— Sélectionner votre nom —</option>' + state.employees
        .map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.full_name)}</option>`)
        .join('');

      show('formState');
    } catch (error) {
      fail(error?.message || 'Impossible de charger la page de pointage.', 'CHARGEMENT_ECHOUE');
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function fail(message, code) {
    el.errorMessage.textContent = message;
    el.errorCode.textContent = code ? `Diagnostic : ${code}` : '';
    show('error');
  }

  function requestPosition() {
    if (!navigator.geolocation) {
      el.gpsStatus.textContent = "La géolocalisation n'est pas disponible sur ce téléphone.";
      return;
    }

    el.gpsButton.disabled = true;
    el.gpsButton.textContent = 'Recherche…';
    el.gpsStatus.textContent = 'Recherche de votre position précise…';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.position = { lat: position.coords.latitude, lng: position.coords.longitude };
        el.gpsStatus.textContent = `Position autorisée · précision ${Math.round(position.coords.accuracy)} m`;
        el.gpsButton.textContent = 'Actualiser';
        el.gpsButton.disabled = false;
      },
      (error) => {
        const messages = {
          1: 'Autorisation GPS refusée. Activez la localisation dans le navigateur.',
          2: 'Position indisponible. Activez le GPS puis réessayez.',
          3: "La recherche GPS a expiré. Réessayez à l'extérieur ou près d'une fenêtre.",
        };
        el.gpsStatus.textContent = messages[error.code] || "Impossible d'obtenir la position.";
        el.gpsButton.textContent = 'Réessayer';
        el.gpsButton.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (state.loading) return;

    const employeeId = el.employee.value;
    const last4 = el.last4.value.replace(/\D/g, '').slice(-4);

    if (!employeeId) return alert('Sélectionnez votre nom.');
    if (last4.length !== 4) return alert('Saisissez les 4 derniers chiffres de votre téléphone.');
    if (!state.action) return alert('Choisissez Arrivée, Pause, Retour ou Sortie.');
    if (!state.position) return alert('Activez la position GPS avant de valider.');

    state.loading = true;
    el.submit.disabled = true;
    el.submit.textContent = 'Validation en cours…';

    try {
      const response = await fetch(CHECKIN_URL, {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_token: state.site.qr_token,
          employee_id: employeeId,
          last4,
          action: state.action,
          lat: state.position.lat,
          lng: state.position.lng,
        }),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = {}; }
      if (!response.ok || data?.error) throw new Error(data?.error || `Pointage refusé (${response.status})`);

      el.successTitle.textContent = data?.message || 'Pointage enregistré';
      el.successMessage.textContent = data?.distance_m != null
        ? `Validation réussie à ${data.distance_m} m du site.`
        : 'Votre présence a été enregistrée avec succès.';
      show('success');
    } catch (error) {
      alert(error?.message || "Le pointage n'a pas pu être enregistré.");
    } finally {
      state.loading = false;
      el.submit.disabled = false;
      el.submit.textContent = 'Valider mon pointage';
    }
  }

  el.actions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    state.action = button.dataset.action;
    el.actions.querySelectorAll('[data-action]').forEach((item) => {
      item.classList.toggle('selected', item === button);
    });
  });
  el.last4.addEventListener('input', () => {
    el.last4.value = el.last4.value.replace(/\D/g, '').slice(0, 4);
  });
  el.gpsButton.addEventListener('click', requestPosition);
  el.form.addEventListener('submit', submit);
  el.retry.addEventListener('click', load);
  el.again.addEventListener('click', () => {
    state.action = '';
    el.last4.value = '';
    el.employee.value = '';
    el.actions.querySelectorAll('[data-action]').forEach((item) => item.classList.remove('selected'));
    show('formState');
  });

  void load();
})();
