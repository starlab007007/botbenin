// Tests de embedText (gemini-embedding-2) avec fetch simulé : aucun appel réseau réel.
// Assertions intégrées (node:assert) : aucun import distant, exécutable hors ligne.
import assert from "node:assert/strict";
const assertEquals = (actual: unknown, expected: unknown) => assert.deepStrictEqual(actual, expected);
const assertAlmostEquals = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (±${tolerance})`);
const assertRejects = async (fn: () => Promise<unknown>, _type: unknown, message: string) => {
  await assert.rejects(fn, (error: Error) => error.message.includes(message));
};
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, embedText } from "./agent-ai.ts";

type Captured = { url: string; body: Record<string, unknown>; key: string | null };

function withFakeGemini(values: number[] | null, status = 200) {
  const captured: Captured[] = [];
  const original = globalThis.fetch;
  Deno.env.set("GEMINI_API_KEY", "test-key");
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    captured.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")),
      key: new Headers(init?.headers).get("x-goog-api-key"),
    });
    const payload = status === 200 ? { embedding: { values } } : { error: { message: "boom" } };
    return Promise.resolve(new Response(JSON.stringify(payload), { status }));
  }) as typeof fetch;
  return { captured, restore: () => { globalThis.fetch = original; } };
}

Deno.test("le modèle d'embeddings est gemini-embedding-2 en 768 dimensions", () => {
  assertEquals(EMBEDDING_MODEL, "gemini-embedding-2");
  assertEquals(EMBEDDING_DIMENSIONS, 768);
});

Deno.test("embedText appelle gemini-embedding-2 avec RETRIEVAL_QUERY par défaut", async () => {
  const fake = withFakeGemini(Array.from({ length: 768 }, () => 2));
  try {
    await embedText("bonjour");
    const call = fake.captured[0];
    assertEquals(call.url.includes("/gemini-embedding-2:embedContent"), true);
    assertEquals(call.body.model, "models/gemini-embedding-2");
    assertEquals(call.body.taskType, "RETRIEVAL_QUERY");
    assertEquals(call.body.outputDimensionality, 768);
    assertEquals(call.key, "test-key");
  } finally {
    fake.restore();
  }
});

Deno.test("embedText transmet RETRIEVAL_DOCUMENT pour l'indexation", async () => {
  const fake = withFakeGemini(Array.from({ length: 768 }, () => 1));
  try {
    await embedText("fragment", "RETRIEVAL_DOCUMENT");
    assertEquals(fake.captured[0].body.taskType, "RETRIEVAL_DOCUMENT");
  } finally {
    fake.restore();
  }
});

Deno.test("embedText normalise le vecteur (norme L2 = 1)", async () => {
  const fake = withFakeGemini(Array.from({ length: 768 }, (_, index) => (index % 7) + 1));
  try {
    const vector = await embedText("x");
    assertEquals(vector.length, 768);
    assertAlmostEquals(Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)), 1, 1e-9);
  } finally {
    fake.restore();
  }
});

Deno.test("embedText refuse une mauvaise dimension et une erreur fournisseur", async () => {
  let fake = withFakeGemini(Array.from({ length: 3072 }, () => 1));
  try {
    await assertRejects(() => embedText("x"), Error, "3072 dimensions");
  } finally {
    fake.restore();
  }
  fake = withFakeGemini(null, 500);
  try {
    await assertRejects(() => embedText("x"), Error, "Gemini embedding 500");
  } finally {
    fake.restore();
  }
});

Deno.test("embedText tronque le texte à 12000 caractères", async () => {
  const fake = withFakeGemini(Array.from({ length: 768 }, () => 1));
  try {
    await embedText("a".repeat(20000));
    const parts = (fake.captured[0].body.content as { parts: { text: string }[] }).parts;
    assertEquals(parts[0].text.length, 12000);
  } finally {
    fake.restore();
  }
});
