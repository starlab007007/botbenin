export const GEMINI_MODEL = "gemini-3.1-flash-lite";

function geminiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY")?.trim();
  if (!key) throw new Error("GEMINI_API_KEY manquant");
  return key;
}

function textFromGemini(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim();
}

function cleanJsonText(value: string): string {
  return value
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

export async function geminiText(options: {
  system?: string;
  user: string;
  json?: boolean;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey(),
        },
        body: JSON.stringify({
          ...(options.system
            ? { systemInstruction: { parts: [{ text: options.system }] } }
            : {}),
          contents: [{ role: "user", parts: [{ text: options.user }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            ...(options.json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    return cleanJsonText(textFromGemini(await response.json()));
  } finally {
    clearTimeout(timeout);
  }
}

export async function geminiJson<T extends Record<string, unknown> = Record<string, unknown>>(
  system: string,
  user: string,
  fallback: T,
): Promise<T> {
  try {
    const text = await geminiText({ system, user, json: true });
    const parsed = JSON.parse(text || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as T
      : fallback;
  } catch (error) {
    console.warn("[gemini] fallback", String(error));
    return fallback;
  }
}

export async function geminiEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey(),
      },
      body: JSON.stringify({
        content: { parts: [{ text: text.slice(0, 6000) }] },
        outputDimensionality: 768,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini embedding ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const data = await response.json();
  if (!Array.isArray(data?.embedding?.values)) throw new Error("Embedding Gemini invalide");
  return data.embedding.values as number[];
}
