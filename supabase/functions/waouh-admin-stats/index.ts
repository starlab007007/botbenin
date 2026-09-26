import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function countBy(rows: any[], key: string) {
  return rows.reduce((acc: Record<string, number>, row: any) => {
    const value = String(row?.[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function isAvatarMessage(message: any) {
  const meta = message?.meta || {};
  const origin = String(meta.origin_surface || meta.source || meta.surface || "").toLowerCase();
  return origin.includes("avatar");
}

function isMuseMessage(message: any) {
  const meta = message?.meta || {};
  const origin = String(meta.origin_surface || meta.source || meta.surface || "").toLowerCase();
  return origin.includes("muse") || origin.includes("mission");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "authentication_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "invalid_session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [adminRole, superAdminRole] = await Promise.all([
      sb.rpc("has_role", { _user_id: user.id, _role_name: "admin" }),
      sb.rpc("has_role", { _user_id: user.id, _role_name: "super_admin" }),
    ]);
    if (!adminRole.data && !superAdminRole.data) {
      return new Response(JSON.stringify({ error: "admin_required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = req.method === "POST"
      ? await req.json().catch(() => ({})) as Record<string, unknown>
      : {};
    const action = String(requestBody.action ?? "stats");

    if (action === "contact_layer_get") {
      const [sources, contacts, fabric] = await Promise.all([
        sb.from("waouh_discovery_sources")
          .select("source_key,label,family,connector_mode,operational_state,supports_contact,default_contactability,trust_weight,updated_at")
          .order("label"),
        sb.from("waouh_entity_contacts").select("contactability_level,consent_state").limit(10000),
        sb.from("waouh_signal_fabric").select("contactability_level,source_key").limit(10000),
      ]);
      if (sources.error) throw sources.error;
      if (contacts.error) throw contacts.error;
      if (fabric.error) throw fabric.error;
      const byLevel = (rows: any[] | null) => {
        const out: Record<string, number> = { C0: 0, C1: 0, C2: 0, C3: 0, C4: 0, C5: 0 };
        for (const row of rows ?? []) {
          const key = String(row?.contactability_level ?? "C0");
          out[key] = (out[key] ?? 0) + 1;
        }
        return out;
      };
      const policy = [
        { level: "C0", label: "Découverte uniquement", can_reveal: false, can_auto_contact: false, requires_approval: false },
        { level: "C1", label: "Contact professionnel public", can_reveal: true, can_auto_contact: false, requires_approval: false },
        { level: "C2", label: "Conversation privée / blind matching", can_reveal: false, can_auto_contact: false, requires_approval: true },
        { level: "C3", label: "Opt-in commercial", can_reveal: true, can_auto_contact: true, requires_approval: true },
        { level: "C4", label: "Contact établi / Agent ↔ Agent", can_reveal: true, can_auto_contact: true, requires_approval: false },
        { level: "C5", label: "Conversation établie · prêt à négocier", can_reveal: false, can_auto_contact: true, requires_approval: false },
      ];
      return new Response(JSON.stringify({
        ok: true,
        sources: sources.data ?? [],
        counts: { contacts: byLevel(contacts.data), fabric: byLevel(fabric.data) },
        policy,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    }

    if (action === "contact_layer_update_source") {
      const sourceKey = String(requestBody.source_key ?? "");
      const level = String(requestBody.default_contactability ?? "");
      const trust = Number(requestBody.trust_weight);
      const allowedLevels = new Set(["C0", "C1", "C2", "C3", "C4", "C5"]);
      if (!allowedLevels.has(level)) throw new Error("Niveau de contactabilité invalide.");
      if (!Number.isFinite(trust) || trust < 0 || trust > 1) throw new Error("Le poids de confiance doit être compris entre 0 et 1.");
      const { data: source, error: sourceError } = await sb.from("waouh_discovery_sources")
        .select("*").eq("source_key", sourceKey).maybeSingle();
      if (sourceError) throw sourceError;
      if (!source) throw new Error("Source inconnue.");
      const permitted =
        level === "C5" ? false :
        level === "C4" ? (source.source_key === "partner" || source.family === "partner") :
        level === "C3" ? (source.supports_contact === true && ["partner","telephony","messaging","internal"].includes(source.family)) :
        level === "C2" ? source.supports_contact === true :
        true;
      if (!permitted) throw new Error("Le niveau " + level + " n’est pas autorisé pour cette source.");
      const { data: updated, error: updateError } = await sb.from("waouh_discovery_sources")
        .update({ default_contactability: level, trust_weight: trust, updated_at: new Date().toISOString() })
        .eq("source_key", sourceKey)
        .select("source_key,label,family,connector_mode,operational_state,supports_contact,default_contactability,trust_weight,updated_at")
        .single();
      if (updateError) throw updateError;
      const audit = await sb.from("waouh_admin_control_audit").insert({
        module_key: "contact_layer",
        actor_id: user.id,
        action: "update_source_policy",
        before_state: { default_contactability: source.default_contactability, trust_weight: source.trust_weight },
        after_state: { default_contactability: level, trust_weight: trust },
      });
      if (audit.error) console.warn("[waouh-admin-stats] contact-layer audit:", audit.error.message);
      return new Response(JSON.stringify({ ok: true, data: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const now = Date.now();
    const since24h = new Date(now - 24 * 3600_000).toISOString();
    const stale15m = new Date(now - 15 * 60_000).toISOString();
    const stale48h = new Date(now - 48 * 3600_000).toISOString();

    const [
      arts, txs, users,
      controls, controlAudit,
      messages24, threads,
      external24, fabricRows, nexusMatches24,
      negotiations, deals,
      queue24, queuePending, queueStale,
      traceErrors24,
      agentMissions, agentSteps, agentApprovals, agentOutbox,
      diffusionPending,
      connectors, radarSources, radarAuto,
      telSettings, whatsappAccounts,
    ] = await Promise.all([
      sb.from("waouh_articles").select("status,category,city,created_at"),
      sb.from("waouh_transactions").select("amount,commission,status,created_at"),
      sb.from("waouh_users").select("id"),

      sb.from("waouh_admin_module_controls").select("*").order("module_key"),
      sb.from("waouh_admin_control_audit").select("id,module_key,actor_id,action,before_state,after_state,created_at")
        .order("created_at", { ascending: false }).limit(30),

      sb.from("waouh_messages").select("id,channel,direction,meta,created_at")
        .gte("created_at", since24h).order("created_at", { ascending: false }).limit(10000),
      sb.from("waouh_chat_threads").select("id,thread_type,source,status,last_message_at,metadata")
        .order("last_message_at", { ascending: false }).limit(5000),

      sb.from("waouh_external_commerce_signals")
        .select("id,source_key,intent,has_whatsapp,primary_photo_url,created_at")
        .gte("created_at", since24h).limit(10000),
      sb.from("waouh_signal_fabric").select("fabric_id,source_key,contactability_level,intent").limit(10000),
      sb.from("waouh_nexus_matches").select("id,status,total_score,source,created_at")
        .gte("created_at", since24h).limit(10000),

      sb.from("waouh_negotiations").select("id,state,created_at,updated_at,thread_id").limit(10000),
      sb.from("waouh_deals").select("id,status,payment_status,commission_status,created_at,updated_at").limit(10000),

      sb.from("waouh_outbound_queue").select("id,status,channel,last_error,attempts,created_at,next_attempt_at")
        .gte("created_at", since24h).limit(10000),
      sb.from("waouh_outbound_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("waouh_outbound_queue").select("id", { count: "exact", head: true })
        .eq("status", "pending").lt("created_at", stale15m),

      sb.from("waouh_trace_events").select("id,stage,status,error,created_at")
        .gte("created_at", since24h).or("status.eq.error,error.not.is.null").limit(2000),

      sb.from("waouh_agent_missions").select("id,status,last_error,created_at,updated_at").limit(5000),
      sb.from("waouh_agent_steps").select("id,status,last_error,requires_approval,created_at,updated_at").limit(10000),
      sb.from("waouh_agent_approvals").select("id,status,action_type,created_at,expires_at").limit(5000),
      sb.from("waouh_agent_outbox").select("id,status,last_error,attempt_count,created_at,updated_at").limit(5000),

      sb.from("waouh_diffusion_approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),

      sb.from("waouh_radar_api_configs")
        .select("provider,source_key,label,auth_mode,active,daily_quota,usage_today,last_test_at,last_test_status,last_test_message,last_sync_at,last_sync_status,last_sync_message,api_key"),
      sb.from("waouh_radar_sources").select("id,type,label,identifier,active,scan_freq_min,last_scan_at,last_signal_count")
        .order("created_at", { ascending: false }).limit(1000),
      sb.from("waouh_radar_auto_settings").select("*").eq("id", 1).maybeSingle(),

      sb.from("waouh_tel_settings").select("enabled,provider,sms_enabled,rcs_enabled,fallback_to_sms,virtual_groups_enabled,updated_at")
        .eq("key", "default").maybeSingle(),
      sb.from("whatsapp_accounts").select("id,session_name,status,last_activity,waha_authenticated,dashboard_authenticated,is_admin_shared")
        .order("last_activity", { ascending: false }).limit(100),
    ]);

    const required = [
      arts, txs, users, controls, controlAudit, messages24, threads, external24, fabricRows,
      nexusMatches24, negotiations, deals, queue24, agentMissions, agentSteps,
      agentApprovals, agentOutbox, connectors, radarSources, whatsappAccounts,
    ];
    for (const result of required) {
      if ((result as any).error) throw (result as any).error;
    }

    const articles = arts.data ?? [];
    const transactions = txs.data ?? [];
    const messages = messages24.data ?? [];
    const threadRows = threads.data ?? [];
    const externalSignals = external24.data ?? [];
    const fabric = fabricRows.data ?? [];
    const matchRows = nexusMatches24.data ?? [];
    const negotiationRows = negotiations.data ?? [];
    const dealRows = deals.data ?? [];
    const queueRows = queue24.data ?? [];
    const missionRows = agentMissions.data ?? [];
    const stepRows = agentSteps.data ?? [];
    const approvalRows = agentApprovals.data ?? [];
    const outboxRows = agentOutbox.data ?? [];
    const connectorRows = connectors.data ?? [];
    const sourceRows = radarSources.data ?? [];
    const waAccounts = whatsappAccounts.data ?? [];

    const total_articles = articles.length;
    const active_articles = articles.filter((a: any) => a.status === "active").length;
    const sold_articles = articles.filter((a: any) => a.status === "sold").length;
    const expired_articles = articles.filter((a: any) => a.status === "expired").length;
    const total_volume = transactions.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const total_commission = transactions.reduce((s: number, t: any) => s + Number(t.commission || 0), 0);

    const catMap: Record<string, number> = {};
    articles.forEach((a: any) => { catMap[a.category] = (catMap[a.category] || 0) + 1; });
    const top_categories = Object.entries(catMap).map(([category, count]) => ({ category, count }))
      .sort((a: any, b: any) => b.count - a.count).slice(0, 5);

    const cityMap: Record<string, number> = {};
    articles.forEach((a: any) => { if (a.city) cityMap[a.city] = (cityMap[a.city] || 0) + 1; });
    const city_density = Object.entries(cityMap).map(([city, count]) => ({ city, count }));

    const days: Record<string, { date: string; published: number; sold: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days[d] = { date: d.slice(5), published: 0, sold: 0 };
    }
    articles.forEach((a: any) => {
      const d = new Date(a.created_at).toISOString().slice(0, 10);
      if (days[d]) days[d].published++;
    });
    transactions.forEach((t: any) => {
      if (t.status === "completed") {
        const d = new Date(t.created_at).toISOString().slice(0, 10);
        if (days[d]) days[d].sold++;
      }
    });

    const messageByChannel = countBy(messages, "channel");
    const messageByDirection = countBy(messages, "direction");
    const activeThreads = threadRows.filter((row: any) => row.status !== "closed").length;
    const avatar24 = messages.filter(isAvatarMessage).length;
    const museSurface24 = messages.filter(isMuseMessage).length;

    const externalWithPhoto = externalSignals.filter((row: any) => !!row.primary_photo_url).length;
    const externalWithWhatsapp = externalSignals.filter((row: any) => row.has_whatsapp === true).length;

    const staleNegotiations = negotiationRows.filter((row: any) =>
      ["proposed", "countered"].includes(String(row.state)) &&
      new Date(row.updated_at || row.created_at).getTime() < new Date(stale48h).getTime()
    ).length;
    const negotiationByState = countBy(negotiationRows, "state");

    const activeDealStatuses = new Set(["pending", "pending_assignment", "assigned", "picked_up", "delivered", "payment_review", "cod_confirmed"]);
    const activeDeals = dealRows.filter((row: any) => activeDealStatuses.has(String(row.status))).length;
    const dealByStatus = countBy(dealRows, "status");
    const dealIssues = dealRows.filter((row: any) => ["disputed", "payment_review"].includes(String(row.status))).length;

    const queueByStatus24 = countBy(queueRows, "status");
    const queueFailed24 = queueRows.filter((row: any) => row.status === "failed").length;
    const queueSent24 = queueRows.filter((row: any) => row.status === "sent").length;

    const traceErrorRows = traceErrors24.data ?? [];
    const missionByStatus = countBy(missionRows, "status");
    const stepByStatus = countBy(stepRows, "status");
    const missionErrors = missionRows.filter((row: any) => !!row.last_error || row.status === "failed").length;
    const stepErrors = stepRows.filter((row: any) => !!row.last_error || row.status === "failed").length;
    const pendingAgentApprovals = approvalRows.filter((row: any) => row.status === "pending").length;
    const agentOutboxFailed = outboxRows.filter((row: any) => row.status === "failed" || !!row.last_error).length;

    const safeConnectors = connectorRows.map((row: any) => ({
      provider: row.provider,
      source_key: row.source_key,
      label: row.label,
      auth_mode: row.auth_mode,
      active: row.active,
      configured: !!String(row.api_key || "").trim() || ["native", "native_settings", "none", "share"].includes(String(row.auth_mode || "")),
      daily_quota: row.daily_quota,
      usage_today: row.usage_today,
      last_test_at: row.last_test_at,
      last_test_status: row.last_test_status,
      last_test_message: row.last_test_message,
      last_sync_at: row.last_sync_at,
      last_sync_status: row.last_sync_status,
      last_sync_message: row.last_sync_message,
    }));

    const connectorProblems = safeConnectors.filter((row: any) =>
      row.active && (!row.configured || row.last_test_status === "ko" || row.last_sync_status === "ko")
    );
    const connectorQuotaRisks = safeConnectors
      .filter((row: any) => row.active && Number(row.daily_quota || 0) > 0)
      .map((row: any) => ({
        ...row,
        quota_pct: Math.round((Number(row.usage_today || 0) / Math.max(1, Number(row.daily_quota || 1))) * 100),
      }))
      .filter((row: any) => row.quota_pct >= 80);
    const sourceNeverScanned = sourceRows.filter((row: any) => row.active && !row.last_scan_at).length;
    const sourceOverdue = sourceRows.filter((row: any) => {
      if (!row.active || !row.last_scan_at) return false;
      const intervalMs = Math.max(5, Number(row.scan_freq_min || 60)) * 60_000;
      const last = new Date(row.last_scan_at).getTime();
      return Number.isFinite(last) && now - last > intervalMs * 2;
    }).length;
    const activeWhatsAppAccounts = waAccounts.filter((row: any) =>
      ["WORKING", "connected"].includes(String(row.status)) || row.waha_authenticated === true
    ).length;

    const alerts: any[] = [];
    const addAlert = (severity: "critical"|"warning"|"info", code: string, title: string, detail: string, target?: string) =>
      alerts.push({ severity, code, title, detail, target: target ?? null });

    if (queueFailed24 > 0) addAlert("critical", "outbound_failed", "Échecs de sortie", `${queueFailed24} envoi(s) ont échoué sur les dernières 24 h.`, "/admin/waouh/historique");
    if ((queueStale.count ?? 0) > 0) addAlert("warning", "outbound_stale", "Queue en retard", `${queueStale.count ?? 0} élément(s) pending depuis plus de 15 min.`, "/admin/waouh/historique");
    if (traceErrorRows.length > 0) addAlert("critical", "trace_errors", "Erreurs de chaîne", `${traceErrorRows.length} trace(s) en erreur sur 24 h.`, "/admin/waouh/health-check");
    if (dealIssues > 0) addAlert("critical", "deal_issues", "Deals à arbitrer", `${dealIssues} deal(s) en litige ou revue paiement.`, "/admin/waouh/deals");
    if (staleNegotiations > 0) addAlert("warning", "stale_negotiations", "Négociations stagnantes", `${staleNegotiations} négociation(s) ouvertes depuis plus de 48 h.`, "/admin/waouh/historique");
    if (missionErrors + stepErrors + agentOutboxFailed > 0) addAlert("warning", "agent_errors", "Agents IA à contrôler", `${missionErrors} mission(s), ${stepErrors} étape(s), ${agentOutboxFailed} sortie(s) en anomalie.`, "/app/missions");
    if (pendingAgentApprovals > 0) addAlert("info", "agent_approvals", "Approbations Agents IA", `${pendingAgentApprovals} action(s) attendent une décision humaine.`, "/app/missions");
    if ((diffusionPending.count ?? 0) > 0) addAlert("info", "diffusion_approvals", "Diffusions à valider", `${diffusionPending.count ?? 0} campagne(s) en attente.`, "/admin/waouh/diffusion-approvals");
    if (connectorProblems.length > 0) addAlert("warning", "connector_problems", "Connecteurs NEXUS", `${connectorProblems.length} connecteur(s) actif(s) nécessitent une action.`, "/admin/waouh?tab=radar");
    if (connectorQuotaRisks.length > 0) {
      const maxRisk = Math.max(...connectorQuotaRisks.map((row: any) => Number(row.quota_pct || 0)));
      addAlert(maxRisk >= 95 ? "critical" : "warning", "connector_quota", "Quotas API NEXUS", `${connectorQuotaRisks.length} connecteur(s) ont consommé au moins 80 % de leur quota journalier.`, "/admin/waouh?tab=radar");
    }
    if (sourceNeverScanned > 0) addAlert("info", "sources_never_scanned", "Sources jamais collectées", `${sourceNeverScanned} source(s) actives n'ont encore jamais été scannées.`, "/admin/waouh?tab=radar");
    if (sourceOverdue > 0) addAlert("warning", "sources_overdue", "Collectes NEXUS en retard", `${sourceOverdue} source(s) dépassent deux fois leur fréquence de scan configurée.`, "/admin/waouh?tab=radar");
    const whatsappControl = (controls.data ?? []).find((row: any) => row.module_key === "chat_whatsapp");
    if (whatsappControl?.enabled && activeWhatsAppAccounts === 0) {
      addAlert("warning", "whatsapp_no_session", "WhatsApp sans session active", "Le module est activé mais aucune session WAHA opérationnelle n'est détectée.", "/admin/waouh/whatsapp-ops");
    }

    const criticalCount = alerts.filter((row) => row.severity === "critical").length;
    const warningCount = alerts.filter((row) => row.severity === "warning").length;
    const overallStatus = criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "healthy";

    return new Response(JSON.stringify({
      total_articles,
      active_articles,
      sold_articles,
      expired_articles,
      total_volume,
      total_commission,
      unique_users: (users.data ?? []).length,
      top_categories,
      city_density,
      growth_30d: Object.values(days),
      command_center: {
        generated_at: new Date().toISOString(),
        overall_status: overallStatus,
        alerts,
        modules: controls.data ?? [],
        recent_control_audit: controlAudit.data ?? [],
        chat: {
          messages_24h: messages.length,
          by_channel: messageByChannel,
          by_direction: messageByDirection,
          active_threads: activeThreads,
          avatar_messages_24h: avatar24,
          muse_messages_24h: museSurface24,
        },
        nexus: {
          signal_fabric_total: fabric.length,
          fabric_by_contactability: countBy(fabric, "contactability_level"),
          fabric_by_source: countBy(fabric, "source_key"),
          fabric_by_intent: countBy(fabric, "intent"),
          external_signals_24h: externalSignals.length,
          external_with_photo_24h: externalWithPhoto,
          external_with_whatsapp_24h: externalWithWhatsapp,
          matches_24h: matchRows.length,
          match_status_24h: countBy(matchRows, "status"),
          connectors: safeConnectors,
          connector_quota_risks: connectorQuotaRisks,
          sources_total: sourceRows.length,
          sources_active: sourceRows.filter((row: any) => row.active).length,
          sources_never_scanned: sourceNeverScanned,
          sources_overdue: sourceOverdue,
          radar_auto: radarAuto.data ?? null,
        },
        negotiation: {
          total: negotiationRows.length,
          by_state: negotiationByState,
          stale_48h: staleNegotiations,
        },
        deals: {
          total: dealRows.length,
          active: activeDeals,
          by_status: dealByStatus,
          issues: dealIssues,
        },
        outbound: {
          pending_total: queuePending.count ?? 0,
          pending_stale_15m: queueStale.count ?? 0,
          sent_24h: queueSent24,
          failed_24h: queueFailed24,
          by_status_24h: queueByStatus24,
        },
        agents: {
          missions_total: missionRows.length,
          missions_by_status: missionByStatus,
          mission_errors: missionErrors,
          steps_by_status: stepByStatus,
          step_errors: stepErrors,
          approvals_pending: pendingAgentApprovals,
          outbox_failed: agentOutboxFailed,
        },
        approvals: {
          diffusion_pending: diffusionPending.count ?? 0,
          agent_pending: pendingAgentApprovals,
        },
        integrations: {
          whatsapp_active_sessions: activeWhatsAppAccounts,
          whatsapp_accounts: waAccounts,
          native_messaging: telSettings.data ?? null,
        },
        traces: {
          errors_24h: traceErrorRows.length,
        },
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[waouh-admin-stats]", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
