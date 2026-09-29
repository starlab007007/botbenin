import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { compareSync } from "https://esm.sh/bcryptjs@2.4.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;
type AdminClient = ReturnType<typeof createClient>;

function jsonResponse(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function htmlResponse(status: number, body: string) {
  return new Response(body, {
    status,
    headers: {
      ...cors,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function cleanError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as JsonRecord;
    return String(
      value.message ??
        value.details ??
        value.hint ??
        value.error ??
        "Erreur inconnue",
    );
  }
  return String(error ?? "Erreur inconnue");
}

async function digestHex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function meters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earth = 6371000;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earth *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function workDate(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "Africa/Porto-Novo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

async function loadContext(
  admin: AdminClient,
  rawToken: string,
) {
  const token = rawToken.trim().toLowerCase();

  if (!/^r[a-f0-9]{16}$/.test(token)) {
    throw new Error("QR_INVALIDE");
  }

  const tokenHash = await digestHex(token);

  const qrResult = await admin
    .from("waouh_presence_qr_tokens")
    .select(
      "id,site_id,expires_at,use_limit,use_count,revoked_at",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (qrResult.error) throw qrResult.error;

  const qr = qrResult.data;

  if (
    !qr ||
    qr.revoked_at ||
    new Date(qr.expires_at).getTime() <= Date.now()
  ) {
    throw new Error("QR_EXPIRE_OU_INVALIDE");
  }

  if (Number(qr.use_count ?? 0) >= Number(qr.use_limit ?? 0)) {
    throw new Error("LIMITE_QR_ATTEINTE");
  }

  const siteResult = await admin
    .from("waouh_presence_sites")
    .select(
      [
        "id",
        "user_id",
        "name",
        "address",
        "latitude",
        "longitude",
        "radius_meters",
        "max_accuracy_meters",
        "require_geolocation",
        "require_employee_code",
        "require_pin",
        "timezone",
        "active",
      ].join(","),
    )
    .eq("id", qr.site_id)
    .maybeSingle();

  if (siteResult.error) throw siteResult.error;

  const site = siteResult.data;

  if (!site || site.active === false) {
    throw new Error("SITE_DESACTIVE");
  }

  return { token, qr, site };
}

function publicMessage(error: unknown) {
  const raw = cleanError(error);

  const labels: Record<string, string> = {
    QR_INVALIDE:
      "Le lien de pointage est incomplet ou incorrect.",
    QR_EXPIRE_OU_INVALIDE:
      "Ce QR est expiré, révoqué ou invalide. Demandez un nouveau QR.",
    LIMITE_QR_ATTEINTE:
      "Le nombre maximal de pointages autorisés pour ce QR est atteint.",
    SITE_DESACTIVE:
      "Ce site de présence est désactivé.",
    EMPLOYEE_CODE_REQUIRED:
      "Le matricule est obligatoire.",
    PIN_REQUIRED:
      "Le PIN doit contenir exactement 4 chiffres.",
    EMPLOYEE_IDENTITY_INVALID:
      "Matricule ou PIN incorrect.",
    LOCATION_REQUIRED:
      "La position GPS est obligatoire.",
    LOCATION_ACCURACY_TOO_LOW:
      "La précision GPS est insuffisante. Actualisez la position.",
    OUTSIDE_ALLOWED_RADIUS:
      "Vous êtes hors du rayon autorisé pour ce site.",
    ARRIVAL_REQUIRED:
      "Une arrivée doit être enregistrée avant cette action.",
    BREAK_ALREADY_STARTED:
      "Une pause est déjà en cours.",
    NO_ACTIVE_BREAK:
      "Aucune pause active n’a été trouvée.",
  };

  for (const [code, label] of Object.entries(labels)) {
    if (raw.includes(code)) return label;
  }

  return raw || "Le pointage n’a pas pu être enregistré.";
}

async function preview(
  admin: AdminClient,
  token: string,
) {
  const context = await loadContext(admin, token);

  return {
    ok: true,
    version: "8.0.0",
    site: {
      name: context.site.name,
      address: context.site.address,
      radius_meters: context.site.radius_meters,
      max_accuracy_meters:
        context.site.max_accuracy_meters,
      require_geolocation:
        context.site.require_geolocation !== false,
      require_employee_code:
        context.site.require_employee_code !== false,
      require_pin:
        context.site.require_pin !== false,
    },
    expires_at: context.qr.expires_at,
    remaining_uses: Math.max(
      0,
      Number(context.qr.use_limit ?? 0) -
        Number(context.qr.use_count ?? 0),
    ),
  };
}

async function checkin(
  admin: AdminClient,
  body: JsonRecord,
) {
  const token = String(body.token ?? "").trim();
  const context = await loadContext(admin, token);
  const site = context.site;
  const qr = context.qr;

  const action = String(body.action ?? "").trim();

  if (
    ![
      "arrival",
      "break_start",
      "break_end",
      "departure",
    ].includes(action)
  ) {
    throw new Error("ACTION_INVALIDE");
  }

  const employeeCode = String(
    body.employee_code ?? "",
  )
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 64);

  const pin = String(body.pin ?? "")
    .replace(/\D/g, "")
    .slice(0, 4);

  if (
    site.require_employee_code !== false &&
    !employeeCode
  ) {
    throw new Error("EMPLOYEE_CODE_REQUIRED");
  }

  if (
    site.require_pin !== false &&
    !/^\d{4}$/.test(pin)
  ) {
    throw new Error("PIN_REQUIRED");
  }

  const membersResult = await admin
    .from("waouh_presence_members")
    .select(
      "id,site_id,member_user_id,display_name,employee_code,pin_hash,status",
    )
    .eq("site_id", site.id)
    .eq("status", "active")
    .limit(1000);

  if (membersResult.error) throw membersResult.error;

  const member = (membersResult.data ?? []).find(
    (item) =>
      String(item.employee_code ?? "")
        .trim()
        .toUpperCase() === employeeCode,
  );

  if (!member) {
    throw new Error("EMPLOYEE_IDENTITY_INVALID");
  }

  if (site.require_pin !== false) {
    const pinHash = String(member.pin_hash ?? "");

    if (
      !pinHash ||
      !compareSync(pin, pinHash)
    ) {
      throw new Error("EMPLOYEE_IDENTITY_INVALID");
    }
  }

  let distance: number | null = null;
  let inside = true;

  const latitude = numberValue(body.latitude);
  const longitude = numberValue(body.longitude);
  const accuracy = numberValue(body.accuracy_meters);

  if (site.require_geolocation !== false) {
    if (
      latitude == null ||
      longitude == null
    ) {
      throw new Error("LOCATION_REQUIRED");
    }

    if (
      accuracy == null ||
      accuracy >
        Number(site.max_accuracy_meters ?? 100)
    ) {
      throw new Error("LOCATION_ACCURACY_TOO_LOW");
    }

    distance = meters(
      Number(site.latitude),
      Number(site.longitude),
      latitude,
      longitude,
    );

    inside =
      distance <= Number(site.radius_meters ?? 100);

    if (!inside) {
      throw new Error(
        `OUTSIDE_ALLOWED_RADIUS:${Math.round(distance)}`,
      );
    }
  }

  const requestId = String(
    body.request_id ?? crypto.randomUUID(),
  ).trim();

  const previousResult = await admin
    .from("waouh_presence_events")
    .select(
      "id,action,occurred_at,distance_meters,inside_radius",
    )
    .eq("request_id", requestId)
    .maybeSingle();

  if (
    previousResult.error &&
    !String(previousResult.error.message ?? "")
      .includes("0 rows")
  ) {
    throw previousResult.error;
  }

  if (previousResult.data) {
    return {
      ok: true,
      already_recorded: true,
      message: "Pointage déjà enregistré.",
      event: previousResult.data,
    };
  }

  const sessionResult = await admin
    .from("waouh_presence_sessions")
    .select("*")
    .eq("member_id", member.id)
    .eq("site_id", site.id)
    .eq("status", "open")
    .is("check_out_at", null)
    .maybeSingle();

  if (
    sessionResult.error &&
    !String(sessionResult.error.message ?? "")
      .includes("0 rows")
  ) {
    throw sessionResult.error;
  }

  const session = sessionResult.data;

  if (action === "arrival" && session) {
    return {
      ok: true,
      already_recorded: true,
      message: "Une présence est déjà ouverte.",
      event: {
        id: session.check_in_event_id,
        action: "arrival",
        occurred_at: session.check_in_at,
        site_name: site.name,
        member_name: member.display_name,
      },
    };
  }

  if (
    action === "break_start" &&
    !session
  ) {
    throw new Error("ARRIVAL_REQUIRED");
  }

  if (
    action === "break_start" &&
    session.break_started_at
  ) {
    throw new Error("BREAK_ALREADY_STARTED");
  }

  if (
    action === "break_end" &&
    (!session || !session.break_started_at)
  ) {
    throw new Error(
      session ? "NO_ACTIVE_BREAK" : "ARRIVAL_REQUIRED",
    );
  }

  if (
    action === "departure" &&
    !session
  ) {
    throw new Error("ARRIVAL_REQUIRED");
  }

  const actorUserId =
    member.member_user_id ?? site.user_id;
  const now = new Date();
  const nowIso = now.toISOString();

  const eventResult = await admin
    .from("waouh_presence_events")
    .insert({
      user_id: actorUserId,
      actor_user_id: actorUserId,
      member_id: member.id,
      site_id: site.id,
      token_id: qr.id,
      request_id: requestId,
      action,
      latitude,
      longitude,
      accuracy_meters: accuracy,
      distance_meters:
        distance == null ? null : Math.round(distance),
      inside_radius: inside,
      source: "qr",
      metadata: {
        employee_code: member.employee_code,
        channel: "public_web",
        version: "8.0.0",
      },
      occurred_at: nowIso,
    })
    .select("*")
    .single();

  if (eventResult.error) throw eventResult.error;

  const event = eventResult.data;

  if (action === "arrival") {
    const insertSession = await admin
      .from("waouh_presence_sessions")
      .insert({
        user_id: actorUserId,
        member_id: member.id,
        site_id: site.id,
        work_date: workDate(
          String(
            site.timezone ??
              "Africa/Porto-Novo",
          ),
        ),
        check_in_event_id: event.id,
        check_in_at: nowIso,
        break_seconds: 0,
        status: "open",
      });

    if (insertSession.error) {
      throw insertSession.error;
    }
  } else if (action === "break_start") {
    const update = await admin
      .from("waouh_presence_sessions")
      .update({
        break_started_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", session.id);

    if (update.error) throw update.error;
  } else if (action === "break_end") {
    const started =
      new Date(session.break_started_at).getTime();
    const seconds = Math.max(
      0,
      Math.floor(
        (now.getTime() - started) / 1000,
      ),
    );

    const update = await admin
      .from("waouh_presence_sessions")
      .update({
        break_seconds:
          Number(session.break_seconds ?? 0) +
          seconds,
        break_started_at: null,
        updated_at: nowIso,
      })
      .eq("id", session.id);

    if (update.error) throw update.error;
  } else if (action === "departure") {
    let extraBreak = 0;

    if (session.break_started_at) {
      extraBreak = Math.max(
        0,
        Math.floor(
          (
            now.getTime() -
            new Date(
              session.break_started_at,
            ).getTime()
          ) / 1000,
        ),
      );
    }

    const update = await admin
      .from("waouh_presence_sessions")
      .update({
        break_seconds:
          Number(session.break_seconds ?? 0) +
          extraBreak,
        break_started_at: null,
        check_out_event_id: event.id,
        check_out_at: nowIso,
        status: "closed",
        updated_at: nowIso,
      })
      .eq("id", session.id);

    if (update.error) throw update.error;
  }

  const countUpdate = await admin
    .from("waouh_presence_qr_tokens")
    .update({
      use_count: Number(qr.use_count ?? 0) + 1,
    })
    .eq("id", qr.id);

  if (countUpdate.error) {
    console.warn(
      "QR use_count update failed",
      countUpdate.error,
    );
  }

  await admin
    .from("waouh_presence_audit_log")
    .insert({
      site_id: site.id,
      actor_user_id: actorUserId,
      action,
      entity_type: "presence_event",
      entity_id: event.id,
      details: {
        member_id: member.id,
        distance_meters:
          distance == null ? null : Math.round(distance),
        accuracy_meters: accuracy,
        channel: "public_web",
      },
    })
    .then(() => undefined)
    .catch(() => undefined);

  const labels: Record<string, string> = {
    arrival:
      "Arrivée enregistrée avec succès.",
    break_start:
      "Début de pause enregistré.",
    break_end:
      "Retour de pause enregistré.",
    departure:
      "Départ enregistré avec succès.",
  };

  return {
    ok: true,
    already_recorded: false,
    message: labels[action],
    event: {
      id: event.id,
      site_id: site.id,
      site_name: site.name,
      member_name: member.display_name,
      action,
      occurred_at: event.occurred_at,
      inside_radius: inside,
      distance_meters:
        distance == null ? null : Math.round(distance),
      accuracy_meters: accuracy,
    },
  };
}

function pageHtml(token: string) {
  const safeToken =
    /^r[a-f0-9]{16}$/.test(token)
      ? token
      : "";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#075e54">
  <title>Présence QR · Bot.BJ</title>
  <style>
    :root{--g:#075e54;--gd:#05483f;--bg:#f3f7f5;--line:#dce8e4;--text:#13231e;--muted:#68766f;--red:#a22f35}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%}body{font-family:Inter,system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text)}
    .page{max-width:560px;min-height:100dvh;margin:auto;background:var(--bg)}
    header{padding:max(18px,env(safe-area-inset-top)) 18px 20px;color:#fff;background:linear-gradient(145deg,var(--gd),var(--g))}
    header h1{margin:0;font-size:22px}header p{margin:5px 0 0;color:#d8fff3;font-size:12px}
    main{padding:14px 11px max(26px,env(safe-area-inset-bottom))}
    .card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:16px;box-shadow:0 8px 24px rgba(7,72,61,.07)}
    .stack{display:grid;gap:13px}.center{text-align:center}.icon{font-size:38px}
    h2{margin:6px 0 4px;font-size:21px}p{line-height:1.45}.muted{color:var(--muted);font-size:12px}
    label{display:block;margin-bottom:6px;font-size:12px;font-weight:850}
    input{width:100%;min-height:49px;padding:0 13px;border:1px solid #cfdeda;border-radius:14px;background:#fbfdfc;font-size:16px;outline:none}
    input:focus{border-color:#69bca5;box-shadow:0 0 0 3px rgba(7,94,84,.09)}
    .actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .action{min-height:70px;border:1px solid var(--line);border-radius:16px;background:#fbfdfc;font-weight:850;cursor:pointer}
    .action.selected{border-color:var(--g);background:#e5f5ef;color:var(--gd)}
    .gps{display:flex;align-items:center;gap:10px;padding:11px;border:1px solid var(--line);border-radius:15px}
    .gpscopy{flex:1}.gpscopy strong{display:block;font-size:12px}.gpscopy span{display:block;margin-top:3px;color:var(--muted);font-size:10.5px}
    button{font:inherit}.btn{min-height:49px;border:0;border-radius:14px;padding:0 15px;font-weight:900;cursor:pointer}
    .primary{width:100%;background:var(--g);color:#fff}.secondary{background:#e5f5ef;color:var(--g)}
    .hidden{display:none!important}.error{color:var(--red)}.notice{padding:10px;border-radius:13px;background:#eff8f4;color:#245247;font-size:11px}
    .spinner{width:36px;height:36px;margin:10px auto;border:4px solid #d8e8e2;border-top-color:var(--g);border-radius:50%;animation:spin .8s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}button:disabled{opacity:.5}
  </style>
</head>
<body>
  <div class="page">
    <header>
      <h1>Présence QR</h1>
      <p>Pointage sécurisé et géolocalisé · Bot.BJ</p>
    </header>
    <main>
      <section id="loading" class="card center">
        <div class="spinner"></div>
        <h2>Ouverture du pointage</h2>
        <p class="muted">Vérification du QR et chargement du site…</p>
      </section>

      <section id="error" class="card center hidden">
        <div class="icon">⚠️</div>
        <h2>Pointage indisponible</h2>
        <p id="errorText" class="error"></p>
        <button id="retry" class="btn secondary" type="button">Réessayer</button>
      </section>

      <section id="success" class="card center hidden">
        <div class="icon">✅</div>
        <h2 id="successTitle">Pointage enregistré</h2>
        <p id="successText" class="muted"></p>
        <button id="again" class="btn secondary" type="button">Nouveau pointage</button>
      </section>

      <form id="form" class="card stack hidden">
        <div class="center">
          <div class="icon">📍</div>
          <h2 id="siteName">Site</h2>
          <p id="siteDetails" class="muted"></p>
        </div>

        <div class="notice">
          Saisissez votre matricule et votre PIN, choisissez l’action puis autorisez la position GPS.
        </div>

        <div id="codeField">
          <label for="employeeCode">Matricule</label>
          <input id="employeeCode" autocomplete="username" maxlength="64" placeholder="Exemple : EMP-001">
        </div>

        <div id="pinField">
          <label for="pin">PIN à 4 chiffres</label>
          <input id="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="4" placeholder="••••">
        </div>

        <div>
          <label>Type de pointage</label>
          <div id="actions" class="actions">
            <button class="action" data-action="arrival" type="button">🟢<br>Arrivée</button>
            <button class="action" data-action="break_start" type="button">☕<br>Début pause</button>
            <button class="action" data-action="break_end" type="button">▶️<br>Retour pause</button>
            <button class="action" data-action="departure" type="button">🔴<br>Départ</button>
          </div>
        </div>

        <div id="gpsBox" class="gps">
          <div>🛰️</div>
          <div class="gpscopy">
            <strong>Position GPS</strong>
            <span id="gpsStatus">Position non encore autorisée.</span>
          </div>
          <button id="gpsButton" class="btn secondary" type="button">Activer</button>
        </div>

        <button id="submit" class="btn primary" type="submit">Valider mon pointage</button>
      </form>
    </main>
  </div>

  <script>
    (() => {
      const TOKEN = ${JSON.stringify(safeToken)};
      const ENDPOINT = location.origin + location.pathname;
      const state = {
        site: null,
        action: '',
        position: null,
        loading: false,
      };

      const el = {
        loading: document.getElementById('loading'),
        error: document.getElementById('error'),
        success: document.getElementById('success'),
        form: document.getElementById('form'),
        errorText: document.getElementById('errorText'),
        retry: document.getElementById('retry'),
        again: document.getElementById('again'),
        siteName: document.getElementById('siteName'),
        siteDetails: document.getElementById('siteDetails'),
        codeField: document.getElementById('codeField'),
        pinField: document.getElementById('pinField'),
        code: document.getElementById('employeeCode'),
        pin: document.getElementById('pin'),
        actions: document.getElementById('actions'),
        gpsBox: document.getElementById('gpsBox'),
        gpsButton: document.getElementById('gpsButton'),
        gpsStatus: document.getElementById('gpsStatus'),
        submit: document.getElementById('submit'),
        successTitle: document.getElementById('successTitle'),
        successText: document.getElementById('successText'),
      };

      function show(name) {
        ['loading','error','success','form'].forEach(
          (key) => el[key].classList.toggle('hidden', key !== name),
        );
      }

      async function call(body) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        try {
          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({...body, token: TOKEN}),
            signal: controller.signal,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || data.ok === false) {
            throw new Error(data.message || data.error || 'Opération impossible.');
          }
          return data;
        } finally {
          clearTimeout(timeout);
        }
      }

      async function load() {
        show('loading');

        try {
          const data = await call({operation:'preview'});
          state.site = data.site;
          el.siteName.textContent = data.site.name || 'Site';
          el.siteDetails.textContent = [
            data.site.address,
            'Rayon autorisé : ' + data.site.radius_meters + ' m',
          ].filter(Boolean).join(' · ');
          el.codeField.classList.toggle(
            'hidden',
            data.site.require_employee_code === false,
          );
          el.pinField.classList.toggle(
            'hidden',
            data.site.require_pin === false,
          );
          el.gpsBox.classList.toggle(
            'hidden',
            data.site.require_geolocation === false,
          );
          show('form');

          if (data.site.require_geolocation !== false) {
            requestPosition();
          }
        } catch (error) {
          el.errorText.textContent =
            error.message || 'Impossible de charger le pointage.';
          show('error');
        }
      }

      function requestPosition() {
        if (!navigator.geolocation) {
          el.gpsStatus.textContent =
            'La géolocalisation est indisponible sur ce téléphone.';
          return;
        }

        el.gpsButton.disabled = true;
        el.gpsButton.textContent = 'Recherche…';
        el.gpsStatus.textContent =
          'Recherche de votre position précise…';

        navigator.geolocation.getCurrentPosition(
          (position) => {
            state.position = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy_meters: position.coords.accuracy,
            };
            el.gpsStatus.textContent =
              'Position autorisée · précision ' +
              Math.round(position.coords.accuracy) + ' m';
            el.gpsButton.disabled = false;
            el.gpsButton.textContent = 'Actualiser';
          },
          (error) => {
            const messages = {
              1: 'Autorisation GPS refusée. Activez la localisation.',
              2: 'Position indisponible. Activez le GPS.',
              3: 'La recherche GPS a expiré. Réessayez.',
            };
            el.gpsStatus.textContent =
              messages[error.code] || 'Position indisponible.';
            el.gpsButton.disabled = false;
            el.gpsButton.textContent = 'Réessayer';
          },
          {enableHighAccuracy:true,timeout:15000,maximumAge:0},
        );
      }

      el.actions.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        state.action = button.dataset.action;
        el.actions.querySelectorAll('[data-action]').forEach(
          (item) => item.classList.toggle('selected', item === button),
        );
      });

      el.pin.addEventListener('input', () => {
        el.pin.value = el.pin.value.replace(/\\D/g,'').slice(0,4);
      });

      el.gpsButton.addEventListener('click', requestPosition);
      el.retry.addEventListener('click', load);
      el.again.addEventListener('click', () => {
        state.action = '';
        el.pin.value = '';
        el.actions.querySelectorAll('[data-action]').forEach(
          (item) => item.classList.remove('selected'),
        );
        show('form');
      });

      el.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (state.loading) return;

        if (!state.action) {
          alert('Choisissez le type de pointage.');
          return;
        }

        if (
          state.site.require_employee_code !== false &&
          !el.code.value.trim()
        ) {
          alert('Saisissez votre matricule.');
          return;
        }

        if (
          state.site.require_pin !== false &&
          !/^\\d{4}$/.test(el.pin.value)
        ) {
          alert('Saisissez votre PIN à 4 chiffres.');
          return;
        }

        if (
          state.site.require_geolocation !== false &&
          !state.position
        ) {
          alert('Activez la position GPS.');
          return;
        }

        state.loading = true;
        el.submit.disabled = true;
        el.submit.textContent = 'Validation en cours…';

        try {
          const data = await call({
            operation: 'checkin',
            action: state.action,
            employee_code: el.code.value.trim(),
            pin: el.pin.value,
            request_id: crypto.randomUUID(),
            ...(state.position || {}),
          });

          el.successTitle.textContent =
            data.message || 'Pointage enregistré';
          const event = data.event || {};
          el.successText.textContent =
            event.distance_meters == null
              ? 'Votre pointage a été enregistré avec succès.'
              : 'Validation réussie à ' +
                event.distance_meters + ' m du site.';
          show('success');
        } catch (error) {
          alert(error.message || 'Le pointage a échoué.');
        } finally {
          state.loading = false;
          el.submit.disabled = false;
          el.submit.textContent = 'Valider mon pointage';
        }
      });

      load();
    })();
  </script>
</body>
</html>`;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, {
      ok: false,
      error: "SUPABASE_CONFIG_MISSING",
      message: "Configuration Supabase absente.",
    });
  }

  const admin = createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  if (request.method === "GET") {
    const token =
      new URL(request.url)
        .searchParams
        .get("token")
        ?.trim()
        .toLowerCase() ?? "";

    return htmlResponse(
      token ? 200 : 400,
      pageHtml(token),
    );
  }

  if (request.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Méthode non autorisée.",
    });
  }

  try {
    const body =
      await request.json().catch(() => ({}));
    const operation = String(
      body.operation ?? "checkin",
    ).trim();

    if (operation === "preview") {
      return jsonResponse(
        200,
        await preview(
          admin,
          String(body.token ?? ""),
        ),
      );
    }

    return jsonResponse(
      200,
      await checkin(admin, body),
    );
  } catch (error) {
    console.error(
      "waouh-presence-public-page-v8",
      error,
    );

    return jsonResponse(400, {
      ok: false,
      error: cleanError(error),
      message: publicMessage(error),
    });
  }
});
