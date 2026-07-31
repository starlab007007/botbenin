// Après BAC IA — chat orientation with RAG over apresbac_program_records.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

const MODEL = "google/gemini-2.5-flash-lite";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function scoreProgram(p: any, keywords: string[]): number {
  const hay = [
    p.program_name, p.degree, p.university, p.institution,
    p.outcomes, Array.isArray(p.occupations) ? p.occupations.join(" ") : "",
  ].filter(Boolean).join(" ").toLowerCase();
  let s = 0;
  for (const k of keywords) if (hay.includes(k)) s += k.length;
  return s;
}

function extractKeywords(text: string): string[] {
  const stop = new Set(["le","la","les","un","une","des","de","du","et","ou","a","à","pour","dans","sur","par","je","tu","il","elle","on","nous","vous","ils","est","sont","que","qui","quoi","quel","quelle","quels","quelles","mon","ma","mes","ton","ta","tes","son","sa","ses","au","aux","en","avec","sans","plus","mais","apres","après","avant","c","d","l","s","t","n","m"]);
  return Array.from(new Set(
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !stop.has(w))
  ));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // identify caller
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json();
    const { session_id, message, bac_series } = body as { session_id?: string; message: string; bac_series?: string };
    if (!message || !message.trim()) throw new Error("message requis");

    // Ensure session
    let sid = session_id;
    if (!sid) {
      const { data: s, error } = await supabase.from("apresbac_chat_sessions").insert({
        user_id: user.id,
        bac_series: bac_series || null,
        title: message.slice(0, 60),
      }).select("id").single();
      if (error) throw error;
      sid = s.id;
    }

    // Persist user message
    await supabase.from("apresbac_chat_messages").insert({
      session_id: sid, user_id: user.id, role: "user", content: message,
    });

    // Load recent history (last 8)
    const { data: hist } = await supabase.from("apresbac_chat_messages")
      .select("role, content").eq("session_id", sid).order("created_at", { ascending: false }).limit(9);
    const history = (hist || []).reverse().slice(0, -1); // exclude current user msg (already added)

    // Load student profile + confirmed subject results
    const { data: profile } = await supabase.from("apresbac_student_profiles")
      .select("*").eq("user_id", user.id).maybeSingle();
    const { data: subjects } = await supabase.from("apresbac_student_subject_results")
      .select("subject_name, score").eq("user_id", user.id).eq("confirmed", true).limit(20);

    const series = bac_series || profile?.bac_series || null;

    // RAG: fetch candidate programs filtered by BAC series
    let q = supabase.from("apresbac_program_records")
      .select("id, program_name, university, institution, degree, source_page, document_id, bac_series, outcomes, occupations, admission_mode, quota_scholarship, subjects_by_series")
      .limit(120);
    if (series) {
      // bac_series JSONB either array or object with series keys
      q = q.or(`bac_series.cs.["${series}"],bac_series.cs.{"${series}":true}`);
    }
    const { data: candidates } = await q;
    const keywords = extractKeywords(message);
    const ranked = (candidates || [])
      .map(p => ({ p, s: scoreProgram(p, keywords) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map(x => x.p);

    // Build context
    const ctx = ranked.map((p, i) => {
      const filiere = [p.program_name, p.degree].filter(Boolean).join(" — ");
      return `[#${i + 1}] id=${p.id} | ${filiere}
Université: ${p.university || p.institution || "n/a"}
Séries acceptées: ${JSON.stringify(p.bac_series)}
Débouchés: ${p.outcomes || "n/a"}
Métiers: ${Array.isArray(p.occupations) ? p.occupations.slice(0, 6).join(", ") : ""}
Admission: ${p.admission_mode || "n/a"} | Quota bourses: ${p.quota_scholarship ?? "?"}
Source: page ${p.source_page ?? "?"}`;
    }).join("\n\n");

    const sys = `Tu es "Après BAC IA", un conseiller d'orientation post-bac du Bénin.
Réponds en français, ton chaleureux et concret. Utilise EXCLUSIVEMENT les filières listées ci-dessous (contexte RAG). Si aucune ne correspond, dis-le clairement.
Cite tes sources en fin de réponse au format: [id=XXXX] pour chaque filière évoquée.
Sois synthétique (5-10 lignes max).

PROFIL ÉTUDIANT:
- Série BAC: ${series || "non renseignée"}
- Moyenne: ${profile?.general_average ?? "n/a"} (${profile?.mention || "n/a"})
- Notes confirmées: ${subjects?.map((s: any) => `${s.subject_name}=${s.score}`).join(", ") || "aucune"}

CONTEXTE — FILIÈRES CANDIDATES:
${ctx || "(aucune filière trouvée pour cette série)"}`;

    const messages = [
      { role: "system", content: sys },
      ...history.map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY manquant");
    const aiRes = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.4 }),
    });
    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!aiRes.ok) throw new Error(`Gateway ${aiRes.status}: ${await aiRes.text()}`);
    const aiJson = await aiRes.json();
    const reply: string = aiJson?.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    // Persist assistant message
    const { data: asstMsg } = await supabase.from("apresbac_chat_messages").insert({
      session_id: sid, user_id: user.id, role: "assistant", content: reply,
      payload: { model: MODEL, candidates_shown: ranked.length },
    }).select("id").single();

    // Detect cited program IDs and persist sources
    const cited = new Set<string>();
    for (const m of reply.matchAll(/id=([A-Z0-9-]+)/g)) cited.add(m[1]);
    if (cited.size && asstMsg?.id) {
      const rows = ranked.filter(p => cited.has(p.id)).map(p => ({
        message_id: asstMsg.id,
        record_id: p.id,
        document_id: p.document_id,
        source_page: p.source_page,
        source_text: `${p.program_name} — ${p.university || p.institution || ""}`,
        confidence_score: 0.9,
      }));
      if (rows.length) await supabase.from("apresbac_chat_sources").insert(rows);
    }

    // Tool call trace (RAG selection)
    await supabase.from("apresbac_chat_tool_calls").insert({
      session_id: sid, user_id: user.id, tool_name: "rag_search",
      input_payload: { message, bac_series: series, keywords },
      output_payload: { candidates: ranked.map(p => ({ id: p.id, name: p.program_name })) },
    });

    return new Response(JSON.stringify({
      ok: true, session_id: sid, reply,
      sources: ranked.filter(p => cited.has(p.id)).map(p => ({
        id: p.id, name: p.program_name, university: p.university || p.institution,
        page: p.source_page, document_id: p.document_id,
      })),
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("apresbac-chat error", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
