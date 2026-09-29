#!/usr/bin/env node
// Ré-indexe waouh_ai_agent_chunks avec gemini-embedding-2 (768 dimensions, normalisé L2).
// Par défaut : simulation (aucune écriture). Ajouter --apply pour écrire.
//
//   SUPABASE_URL=https://mvynepqulhflxtyymtzs.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... \
//   node scripts/supabase/reindex-agent-chunks.mjs [--apply] [--agent <uuid>]
//
// Ne jamais coller les clés dans un fichier du dépôt ni dans une conversation.
const MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
const DIMENSIONS = 768;
const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const apply = process.argv.includes("--apply");
const agentIndex = process.argv.indexOf("--agent");
const agentId = agentIndex > -1 ? process.argv[agentIndex + 1] : "";

if (!url || !serviceKey || !geminiKey) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et GEMINI_API_KEY sont requis.");
  process.exit(1);
}
if (agentId && !/^[0-9a-f-]{36}$/i.test(agentId)) {
  console.error("--agent attend un UUID.");
  process.exit(1);
}

const rest = (path, init = {}) =>
  fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

async function embed(text) {
  const response = await fetch(
    `${process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta"}/models/${MODEL}:embedContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text: String(text || "").slice(0, 12000) }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: DIMENSIONS,
      }),
    },
  );
  const raw = await response.text();
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${raw.slice(0, 300)}`);
  const values = JSON.parse(raw)?.embedding?.values;
  if (!Array.isArray(values) || values.length !== DIMENSIONS) {
    throw new Error(`Dimension inattendue : ${Array.isArray(values) ? values.length : "aucune"}`);
  }
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 ? values.map((value) => value / norm) : values;
}

const filter = agentId ? `&agent_id=eq.${agentId}` : "";
const listResponse = await rest(`waouh_ai_agent_chunks?select=id,agent_id,content&order=created_at.asc${filter}`);
if (!listResponse.ok) {
  console.error("Lecture impossible :", listResponse.status, (await listResponse.text()).slice(0, 300));
  process.exit(1);
}
const chunks = await listResponse.json();
console.log(`${chunks.length} fragment(s) à ré-indexer avec ${MODEL} (${apply ? "ÉCRITURE" : "simulation"}).`);

let done = 0;
let failed = 0;
for (const chunk of chunks) {
  try {
    const vector = await embed(chunk.content);
    if (apply) {
      const patch = await rest(`waouh_ai_agent_chunks?id=eq.${chunk.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ embedding: `[${vector.join(",")}]` }),
      });
      if (!patch.ok) throw new Error(`Écriture ${patch.status}: ${(await patch.text()).slice(0, 200)}`);
    }
    done++;
    console.log(`  ok ${chunk.id} (agent ${chunk.agent_id})`);
  } catch (error) {
    failed++;
    console.error(`  ÉCHEC ${chunk.id}: ${error.message}`);
  }
}
console.log(`Terminé : ${done} traité(s), ${failed} échec(s)${apply ? "" : " — simulation, rien n'a été écrit"}.`);
process.exit(failed ? 2 : 0);
