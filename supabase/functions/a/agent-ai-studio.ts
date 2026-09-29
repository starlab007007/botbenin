const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

export const STUDIO_AI_VERSION = "21.4.6.24";

export function geminiModel() {
  return (
    Deno.env.get("GEMINI_MODEL")?.trim() ||
    "gemini-3.1-flash-lite"
  );
}

export function geminiEmbeddingModel() {
  return (
    Deno.env.get("GEMINI_EMBEDDING_MODEL")?.trim() ||
    "gemini-embedding-2"
  );
}

export function hasGeminiKey() {
  return Boolean(
    Deno.env.get("GEMINI_API_KEY")?.trim() ||
    Deno.env.get("GOOGLE_API_KEY")?.trim(),
  );
}

export function geminiKey() {
  const key =
    Deno.env.get("GEMINI_API_KEY")?.trim() ||
    Deno.env.get("GOOGLE_API_KEY")?.trim();

  if (!key) {
    throw Object.assign(
      new Error("GEMINI_API_KEY manquante"),
      {
        code: "AI_KEY_MISSING",
        status: 503,
      },
    );
  }

  return key;
}

function clean(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function providerError(
  status: number,
  body: Record<string, any>,
  raw: string,
) {
  const message = clean(
    body?.error?.message ??
    body?.message ??
    raw ??
    `Gemini HTTP ${status}`,
  ).slice(0, 800);

  let code = "AI_PROVIDER_ERROR";

  if (
    status === 401 ||
    status === 403 ||
    /api key|permission|unauth/i.test(message)
  ) {
    code = "AI_KEY_INVALID";
  } else if (
    status === 429 ||
    /quota|rate limit|resource exhausted/i.test(message)
  ) {
    code = "AI_QUOTA_EXCEEDED";
  } else if (
    status === 404 ||
    /model.*not found|not supported/i.test(message)
  ) {
    code = "AI_MODEL_UNAVAILABLE";
  } else if (
    status >= 500
  ) {
    code = "AI_PROVIDER_UNAVAILABLE";
  }

  return Object.assign(
    new Error(`${code}: ${message}`),
    {
      code,
      status:
        code === "AI_QUOTA_EXCEEDED"
          ? 429
          : code === "AI_KEY_INVALID"
            ? 503
            : 502,
    },
  );
}

async function geminiRequest(
  endpoint: string,
  payload: Record<string, unknown>,
  timeoutMs = 45_000,
) {
  const retries = 3;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey(),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const raw = await response.text();
      let data: Record<string, any> = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (response.ok) {
        return data;
      }

      const error = providerError(
        response.status,
        data,
        raw,
      );

      if (
        response.status !== 429 &&
        response.status < 500
      ) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      lastError = error;

      const retryable =
        error instanceof DOMException ||
        /abort|timeout|fetch|network|429|5\d\d/i.test(
          error instanceof Error
            ? error.message
            : String(error),
        );

      if (!retryable || attempt >= retries - 1) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 800 * (attempt + 1))
    );
  }

  throw lastError ??
    new Error("AI_PROVIDER_UNAVAILABLE");
}

function inlinePartFromDataUrl(
  value: string,
): Record<string, unknown> | null {
  const match = value.match(
    /^data:([^;,]+);base64,([\s\S]+)$/i,
  );

  if (!match) return null;

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

function partsFromContent(
  value: unknown,
): Array<Record<string, unknown>> {
  if (typeof value === "string") {
    return value.trim()
      ? [{ text: value }]
      : [];
  }

  if (!Array.isArray(value)) {
    const object =
      value && typeof value === "object"
        ? value as Record<string, any>
        : {};

    const text = clean(object.text);
    return text ? [{ text }] : [];
  }

  const parts: Array<Record<string, unknown>> = [];

  for (const item of value) {
    if (typeof item === "string") {
      if (item.trim()) parts.push({ text: item });
      continue;
    }

    const object =
      item && typeof item === "object"
        ? item as Record<string, any>
        : {};

    if (
      object.type === "text" ||
      typeof object.text === "string"
    ) {
      const text = clean(object.text);
      if (text) parts.push({ text });
      continue;
    }

    if (object.type === "image_url") {
      const url = clean(
        object.image_url?.url ??
        object.imageUrl?.url,
      );
      const inline = inlinePartFromDataUrl(url);
      if (inline) parts.push(inline);
      continue;
    }

    if (object.type === "file_data") {
      const mimeType = clean(
        object.mime_type ?? object.mimeType,
      );
      const data = clean(object.data);
      if (mimeType && data) {
        parts.push({
          inlineData: {
            mimeType,
            data,
          },
        });
      }
    }
  }

  return parts;
}

function geminiContents(
  messages: Array<{
    role: string;
    content: unknown;
  }>,
) {
  const contents: Array<Record<string, unknown>> = [];

  for (const message of messages) {
    const parts = partsFromContent(message.content);
    if (!parts.length) continue;

    const role =
      message.role === "assistant" ||
      message.role === "model"
        ? "model"
        : "user";

    const previous =
      contents.length > 0
        ? contents[contents.length - 1]
        : null;

    if (previous?.role === role) {
      const existing = Array.isArray(previous.parts)
        ? previous.parts as Array<Record<string, unknown>>
        : [];
      previous.parts = [
        ...existing,
        ...parts,
      ];
    } else {
      contents.push({
        role,
        parts,
      });
    }
  }

  return contents;
}

export async function chatCompletion(options: {
  system?: string;
  messages: Array<{
    role: string;
    content: unknown;
  }>;
  temperature?: number;
  jsonMode?: boolean;
}) {
  const contents = geminiContents(options.messages);

  if (!contents.length) {
    throw Object.assign(
      new Error("AI_INPUT_EMPTY: message vide"),
      {
        code: "AI_INPUT_EMPTY",
        status: 400,
      },
    );
  }

  const model = geminiModel();
  const isGemini3 = /^gemini-3(?:\.|$)/i.test(model);
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 1200,
    thinkingConfig: isGemini3
      ? {
          thinkingLevel: "minimal",
        }
      : {
          thinkingBudget: 0,
        },
    ...(isGemini3
      ? {}
      : {
          temperature: options.temperature ?? 0.35,
        }),
  };

  if (options.jsonMode) {
    generationConfig.responseMimeType =
      "application/json";
  }

  const data = await geminiRequest(
    `/models/${encodeURIComponent(
      model,
    )}:generateContent`,
    {
      ...(options.system
        ? {
            systemInstruction: {
              parts: [
                {
                  text: options.system,
                },
              ],
            },
          }
        : {}),
      contents,
      generationConfig,
    },
    50_000,
  );

  const candidates = Array.isArray(data.candidates)
    ? data.candidates
    : [];

  const answer = candidates
    .flatMap((candidate: any) =>
      Array.isArray(candidate?.content?.parts)
        ? candidate.content.parts
        : []
    )
    .filter((part: any) => part?.thought !== true)
    .map((part: any) => clean(part?.text))
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!answer) {
    const blockReason = clean(
      data?.promptFeedback?.blockReason,
    );

    throw Object.assign(
      new Error(
        blockReason
          ? `AI_BLOCKED: ${blockReason}`
          : "AI_EMPTY_RESPONSE: Gemini a retourné une réponse vide.",
      ),
      {
        code: blockReason
          ? "AI_BLOCKED"
          : "AI_EMPTY_RESPONSE",
        status: 502,
      },
    );
  }

  return answer;
}

function normalizeEmbedding(
  values: number[],
) {
  const norm = Math.sqrt(
    values.reduce(
      (sum, value) =>
        sum + (Number(value) ** 2),
      0,
    ),
  );

  if (!Number.isFinite(norm) || norm === 0) {
    return values;
  }

  return values.map((value) =>
    Number(value) / norm
  );
}

export async function embedText(
  text: string,
  taskType:
    | "RETRIEVAL_QUERY"
    | "RETRIEVAL_DOCUMENT"
    | "SEMANTIC_SIMILARITY" =
      "SEMANTIC_SIMILARITY",
) {
  const content = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8_000);

  if (!content) {
    throw new Error("Embedding: texte vide");
  }

  const model = geminiEmbeddingModel();
  const data = await geminiRequest(
    `/models/${encodeURIComponent(
      model,
    )}:embedContent`,
    {
      model: `models/${model}`,
      content: {
        parts: [
          {
            text: content,
          },
        ],
      },
      taskType,
      outputDimensionality: 768,
    },
    35_000,
  );

  const values = Array.isArray(
    data?.embedding?.values,
  )
    ? data.embedding.values.map(Number)
    : [];

  if (values.length !== 768) {
    throw Object.assign(
      new Error(
        `AI_EMBEDDING_INVALID: dimension ${values.length}`,
      ),
      {
        code: "AI_EMBEDDING_INVALID",
        status: 502,
      },
    );
  }

  return normalizeEmbedding(values);
}

export function chunkText(
  text: string,
  size = 900,
  overlap = 120,
) {
  const cleanText = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) return [];

  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);

  for (
    let cursor = 0;
    cursor < cleanText.length;
    cursor += step
  ) {
    chunks.push(
      cleanText.slice(cursor, cursor + size),
    );
  }

  return chunks;
}

function price(product: any) {
  const min = product.price_fcfa ?? product.prix_min;
  const max = product.price_max ?? product.prix_max;

  if (min == null) return "sur demande";

  if (max != null && max !== min) {
    return `${Number(min).toLocaleString("fr-FR")}–${Number(max).toLocaleString("fr-FR")} FCFA`;
  }

  return `${Number(min).toLocaleString("fr-FR")} FCFA`;
}

function catalogKind(product: any) {
  const value = clean(product.kind || product.item_kind || "product");
  return ["product", "training", "presentation"].includes(value)
    ? value
    : "product";
}

function catalogKindLabel(kind: string) {
  if (kind === "training") return "FORMATION";
  if (kind === "presentation") return "PRÉSENTATION";
  return "PRODUIT";
}


export function normalizeProfessionalReply(value: unknown) {
  let text = clean(value)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Keep a compact, readable answer even when the model returns excessive spacing.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();

  return text;
}

export function toWhatsAppText(value: unknown) {
  return normalizeProfessionalReply(value)
    .replace(/^###\s+(.+)$/gm, "*$1*")
    .replace(/^##\s+(.+)$/gm, "*$1*")
    .replace(/^#\s+(.+)$/gm, "*$1*")
    .replace(/\*\*([^*\n]+)\*\*/g, "*$1*")
    .replace(/__([^_\n]+)__/g, "_$1_")
    .replace(/~~([^~\n]+)~~/g, "~$1~")
    .replace(/<u>([\s\S]*?)<\/u>/gi, "_$1_")
    .replace(/\[color=[^\]]+\]([\s\S]*?)\[\/color\]/gi, "*$1*")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildSystemPrompt(
  agent: any,
  products: any[],
  facts: string,
) {
  const persona = agent.persona || {};
  const caps = agent.capabilities || {};
  const name = persona.name || agent.name || "Assistant";
  const tone = persona.tone || "professionnel";
  const emoji = persona.emojis === false
    ? "sans emojis"
    : "avec quelques emojis discrets";

  const catalog = products
    .filter((item) => item.active !== false && item.disponible !== false)
    .slice(0, 60)
    .map((item) => {
      const kind = catalogKind(item);
      const details = [
        kind === "product" ? price(item) : "",
        clean(item.catalog_title) ? `catalogue: ${clean(item.catalog_title)}` : "",
        clean(item.category || item.categorie) ? `catégorie: ${clean(item.category || item.categorie)}` : "",
        kind === "training" && clean(item.duration) ? `durée: ${clean(item.duration)}` : "",
        kind === "training" && clean(item.audience) ? `public: ${clean(item.audience)}` : "",
        clean(item.format) ? `format: ${clean(item.format)}` : "",
        clean(item.level) ? `niveau: ${clean(item.level)}` : "",
        clean(item.unit) ? `unité: ${clean(item.unit)}` : "",
        clean(item.start_date) ? `début: ${clean(item.start_date)}` : "",
        clean(item.end_date) ? `fin: ${clean(item.end_date)}` : "",
        Array.isArray(item.media) && item.media.length > 0
          ? `${item.media.length} média(s) disponible(s)`
          : "",
      ].filter(Boolean).join(" · ");

      return `- [${catalogKindLabel(kind)}] ${item.name || item.nom}` +
        `${details ? ` — ${details}` : ""}` +
        `${item.description ? ` — ${item.description}` : ""}`;
    })
    .join("\n") || "Catalogue vide";

  const tasks = [
    caps.qa !== false ? "répondre aux questions" : "",
    caps.sell ? "présenter et vendre" : "",
    caps.appointments ? "proposer un rendez-vous" : "",
    caps.qualify ? "qualifier le besoin" : "",
    caps.handoff !== false ? "passer à un humain sur demande" : "",
  ].filter(Boolean).join(", ");

  const grounding = agent.agent_type === "docs"
    ? "Utilise prioritairement les faits documentaires."
    : agent.agent_type === "website"
      ? "Utilise prioritairement les faits du site."
      : "Utilise le catalogue et les connaissances disponibles.";

  return `Tu es ${name}, assistant WhatsApp de « ${agent.name} ».
Réponds toujours en français, avec un ton ${tone}, ${emoji}.
Tu peux : ${tasks}.
${grounding}
Rédige une réponse professionnelle, structurée et facile à lire.
Utilise au besoin :
- un titre Markdown commençant par # ;
- **texte important en gras** ;
- __texte à souligner dans l’application__ ;
- des listes courtes avec - ;
- des paragraphes aérés.
N’utilise jamais de tableau complexe ni de balises HTML.
Reste concis : 1 à 5 courts paragraphes.
N’invente jamais un prix, une disponibilité, une durée, une photo, une vidéo ou un document.
Quand l’utilisateur demande à voir, découvrir ou comparer un produit, une formation ou une présentation, sélectionne les éléments les plus pertinents et mets les visuels en avant dès le début de la réponse.
Quand des médias sont disponibles, privilégie d'abord les photos liées au produit, puis les photos de catalogue ou de formation, puis les vidéos de présentation ou de formation, et indique brièvement qu'ils sont joints à la réponse.
Si l’utilisateur demande « voir plus », « plus de photos », « galerie » ou « catalogue », propose naturellement plusieurs photos quand elles existent.
Quand l’utilisateur joint une photo, une vidéo, un audio ou un PDF, analyse réellement son contenu avant de répondre.
Quand une information manque, dis-le et propose une prise en charge humaine.

CATALOGUES PRIVÉS DE CET UTILISATEUR :
${catalog}

CONNAISSANCES :
${facts || "Aucune connaissance complémentaire retrouvée."}`;
}


function partnerPhotoUrls(row: any) {
  const urls: string[] = [];
  const push = (raw: unknown) => {
    const url = clean(raw);
    if (url && !urls.includes(url)) urls.push(url);
  };

  if (Array.isArray(row?.photos)) {
    for (const raw of row.photos) {
      if (typeof raw === "string") {
        push(raw);
      } else if (raw && typeof raw === "object") {
        push(raw.url || raw.signed_url || raw.photo_url || raw.image_url);
      }
      if (urls.length >= 3) break;
    }
  }

  if (urls.length === 0) push(row?.photo_url || row?.image_url);
  return urls.slice(0, 3);
}

async function partnerProductsStillOwned(
  supabase: any,
  userId: string,
  ids: string[],
) {
  if (!ids.length) return [];

  const partners = await supabase
    .from("waouh_partners")
    .select("id")
    .eq("user_id", userId);
  if (partners.error) throw partners.error;

  const partnerIds = (partners.data || [])
    .map((row: any) => String(row.id || ""))
    .filter(Boolean);
  if (!partnerIds.length) return [];

  const owned = await supabase
    .from("waouh_partner_products")
    .select("*")
    .in("id", ids)
    .in("partner_id", partnerIds);
  if (owned.error) throw owned.error;

  const byId = new Map<string, any>();
  for (const row of owned.data || []) {
    byId.set(String(row.id || ""), row);
  }

  return ids.map((id) => byId.get(id)).filter(Boolean);
}

async function productsForAgent(
  supabase: any,
  agent: any,
) {
  const agentId = String(agent.id || "");
  const userId = String(agent.user_id || "");
  const [manualResult, linksResult] = await Promise.all([
    supabase
      .from("waouh_ai_agent_products")
      .select("*")
      .eq("agent_id", agentId)
      .eq("user_id", userId),
    supabase
      .from("waouh_ai_agent_partner_products")
      .select("product_id")
      .eq("agent_id", agentId)
      .eq("user_id", userId),
  ]);

  if (manualResult.error) throw manualResult.error;
  if (linksResult.error) throw linksResult.error;

  const metadata = new Map<string, any>();
  for (const raw of Array.isArray(agent.capabilities?.studio_catalog)
    ? agent.capabilities.studio_catalog
    : []) {
    const item = raw && typeof raw === "object" ? raw : {};
    metadata.set(String(item.id || ""), item);
  }

  const manual = (manualResult.data || []).map((row: any) => ({
    ...row,
    ...(metadata.get(String(row.id || "")) || {}),
    source: metadata.get(String(row.id || ""))?.source || "manual",
  }));

  const ids = (linksResult.data || [])
    .map((item: any) => item.product_id)
    .filter(Boolean);

  let partner: any[] = [];
  if (ids.length) {
    const ownedRows = await partnerProductsStillOwned(
      supabase,
      userId,
      ids.map(String),
    );
    partner = ownedRows.map((row: any) => {
      const photos = partnerPhotoUrls(row);
      return {
        ...row,
        id: `partner:${row.id}`,
        name: row.nom || row.name,
        kind: "product",
        source: "partner",
        partner_product_id: row.id,
        active: row.disponible !== false,
        photos,
        photo_url: photos[0] || null,
        media: photos.map((url, index) => ({
          type: "image",
          filename: `photo-partenaire-${index + 1}.jpg`,
          mime_type: "image/jpeg",
          url,
          caption: clean(row.nom || row.name) || "Produit Partenaire",
        })),
      };
    });
  }

  return [...partner, ...manual]
    .filter((item) => item.active !== false && item.disponible !== false);
}

function normalizedSearch(value: unknown) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function selectCatalogItems(products: any[], message: string) {
  const query = normalizedSearch(message);
  const tokens = query.split(/\s+/).filter((token) => token.length >= 3);
  const visualIntent = /\b(voir|montre|montrer|photo|photos|image|images|video|vidéo|vidéos|catalogue|catalogues|présente|presentation|présentation|formation|formations|produit|produits|modele|modèle|galerie|visuel)\b/i
    .test(message);
  const wantsMorePhotos = /\b(plus de photos|voir plus|galerie|plus d'images|autres photos|d'autres photos)\b/i
    .test(message);

  const scored = products.map((item) => {
    const name = normalizedSearch(item.name || item.nom);
    const category = normalizedSearch(item.category || item.categorie);
    const description = normalizedSearch(item.description);
    const catalogTitle = normalizedSearch(item.catalog_title);
    let score = 0;

    for (const token of tokens) {
      if (name.includes(token)) score += 8;
      if (category.includes(token)) score += 4;
      if (catalogTitle.includes(token)) score += 4;
      if (description.includes(token)) score += 2;
    }

    const mediaCount = Array.isArray(item.media) ? item.media.length : 0;
    const imageCount = Array.isArray(item.media)
      ? item.media.filter((media: any) => {
          const mime = clean(media?.mime_type || media?.mimetype);
          const type = clean(media?.type);
          return type === "image" || mime.startsWith("image/");
        }).length
      : 0;
    const hasVideo = Array.isArray(item.media)
      ? item.media.some((media: any) => {
          const mime = clean(media?.mime_type || media?.mimetype);
          const type = clean(media?.type);
          return type === "video" || mime.startsWith("video/");
        })
      : false;

    if (/formation/i.test(message) && catalogKind(item) === "training") score += 6;
    if (/présentation|presentation|portfolio/i.test(message) && catalogKind(item) === "presentation") score += 7;
    if (/produit|prix|acheter|disponible/i.test(message) && catalogKind(item) === "product") score += 4;
    if (visualIntent) score += Math.min(5, mediaCount);
    if (/photo|photos|image|images/i.test(message)) score += imageCount * 2;
    if (/video|vidéo|vidéos/i.test(message) && hasVideo) score += 6;
    if (wantsMorePhotos && imageCount >= 2) score += 8;

    return { item, score };
  }).sort((a, b) => b.score - a.score);

  const matched = scored.filter((entry) => entry.score > 0).slice(0, wantsMorePhotos ? 4 : 3);
  if (matched.length > 0) return matched.map((entry) => entry.item);
  return visualIntent ? scored.slice(0, wantsMorePhotos ? 4 : 3).map((entry) => entry.item) : [];
}

async function attachmentsForMessage(
  supabase: any,
  products: any[],
  message: string,
) {
  const selected = selectCatalogItems(products, message);
  const attachments: any[] = [];
  const wantsMorePhotos = /\b(plus de photos|voir plus|galerie|plus d'images|autres photos|d'autres photos)\b/i.test(message);

  for (const item of selected) {
    if (attachments.length >= 8) break;
    const media = Array.isArray(item.media) ? item.media : [];
    const kind = catalogKind(item);
    const prepared: any[] = [];

    for (const raw of media) {
      const entry = raw && typeof raw === "object" ? raw : {};
      const path = clean(entry.storage_path);
      let url = clean(entry.url);

      if (path) {
        const signed = await supabase.storage
          .from("agent-catalog-media")
          .createSignedUrl(path, 900);
        if (!signed.error) url = clean(signed.data?.signedUrl);
      }

      if (!url) continue;
      const mimeType = clean(entry.mime_type) || "application/octet-stream";
      const mediaType = clean(entry.type) ||
        (mimeType.startsWith("video/") ? "video" :
          mimeType.startsWith("audio/") ? "audio" :
          mimeType.startsWith("image/") ? "image" : "document");
      prepared.push({
        type: mediaType,
        filename: clean(entry.filename) ||
          (mediaType === "video" ? "presentation.mp4" :
            mediaType === "audio" ? "audio.mp3" :
            mediaType === "document" ? "document" : "photo.jpg"),
        mime_type: mimeType,
        url,
        caption: clean(entry.caption) || clean(item.name || item.nom),
        item_id: clean(item.id),
        kind,
      });
    }

    const images = prepared.filter((entry) => entry.type === "image");
    const videos = prepared.filter((entry) => entry.type === "video");
    const others = prepared.filter((entry) => entry.type !== "image" && entry.type !== "video");

    const maxImages = kind === "product"
      ? (wantsMorePhotos ? 4 : 3)
      : kind === "training"
        ? 2
        : kind === "presentation"
          ? 3
          : 2;
    const maxVideos = kind === "presentation" || kind === "training" ? 1 : 0;

    const prioritized = [
      ...images.slice(0, maxImages),
      ...videos.slice(0, maxVideos),
      ...others.slice(0, 1),
    ];

    for (const attachment of prioritized) {
      if (attachments.length >= 8) break;
      attachments.push(attachment);
    }
  }

  return attachments;
}

function usefulTokens(value: string) {
  const ignored = new Set([
    "avec",
    "dans",
    "pour",
    "quel",
    "quelle",
    "quels",
    "quelles",
    "cest",
    "est",
    "les",
    "des",
    "une",
    "un",
    "du",
    "de",
    "la",
    "le",
    "qui",
    "que",
    "quoi",
    "comment",
    "document",
  ]);

  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 3 &&
        !ignored.has(token),
    );
}

async function lexicalFacts(
  supabase: any,
  agentId: string,
  message: string,
) {
  const { data } = await supabase
    .from("waouh_ai_agent_chunks")
    .select("content,created_at")
    .eq("agent_id", agentId)
    .order("created_at", {
      ascending: false,
    })
    .limit(80);

  const rows = Array.isArray(data)
    ? data
    : [];

  if (!rows.length) return "";

  const tokens = usefulTokens(message);

  const scored = rows
    .map((item: any) => {
      const content = clean(item?.content);
      const normalized = content
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

      const score = tokens.reduce(
        (total, token) =>
          total +
          (
            normalized.includes(token)
              ? 1
              : 0
          ),
        0,
      );

      return {
        content,
        score,
      };
    })
    .filter((item) => item.content)
    .sort(
      (left, right) =>
        right.score - left.score,
    );

  const selected = scored
    .filter((item, index) =>
      item.score > 0 || index < 3
    )
    .slice(0, 5);

  return selected
    .map((item) => `• ${item.content}`)
    .join("\n");
}

async function factsForAgent(
  supabase: any,
  agentId: string,
  message: string,
) {
  let vectorFacts = "";

  try {
    const embedding = await embedText(
      message,
      "RETRIEVAL_QUERY",
    );

    const { data, error } = await supabase.rpc(
      "match_agent_chunks",
      {
        _agent_id: agentId,
        _query_embedding: embedding,
        _match_count: 4,
      },
    );

    if (!error) {
      vectorFacts = (data || [])
        .map((item: any) => clean(item.content))
        .filter(Boolean)
        .join("\n---\n");
    }
  } catch (error) {
    console.error(
      "Gemini RAG vector lookup failed",
      error,
    );
  }

  // Existing agents may contain chunks embedded by the historical
  // provider. Lexical retrieval is therefore always combined with the
  // new vector retrieval until documents are re-indexed.
  const lexical = await lexicalFacts(
    supabase,
    agentId,
    message,
  );

  const unique = new Map<string, string>();

  for (const block of [vectorFacts, lexical]) {
    for (const raw of String(block || "")
      .split(/\n(?:---)?\n|\n•\s*/g)) {
      const content = clean(raw.replace(/^•\s*/, ""));
      if (!content) continue;

      const key = content
        .toLowerCase()
        .replace(/\s+/g, " ")
        .slice(0, 240);

      if (!unique.has(key)) {
        unique.set(key, content);
      }
    }
  }

  return [...unique.values()]
    .slice(0, 7)
    .map((content) => `• ${content}`)
    .join("\n");
}

export async function runAgentTurn(
  supabase: any,
  agentId: string,
  message: string,
  options: {
    history?: Array<{
      role: string;
      content: string;
    }>;
    contact_phone?: string;
    contact_name?: string;
    persist?: boolean;
    input_attachments?: Array<{
      mime_type?: string;
      data?: string;
      filename?: string;
      type?: string;
    }>;
  },
) {
  const { data: agent, error: agentError } =
    await supabase
      .from("waouh_ai_agents")
      .select("*")
      .eq("id", agentId)
      .maybeSingle();

  if (agentError) throw agentError;
  if (!agent) throw new Error("Agent introuvable");

  const phone = options.contact_phone;
  const paused = Array.isArray(
    agent.paused_contacts,
  )
    ? agent.paused_contacts
    : [];

  if (
    options.persist &&
    phone &&
    paused.includes(phone)
  ) {
    return {
      reply: "",
      needs_handoff: false,
      skipped: true,
      reason: "contact_paused",
    };
  }

  let existing: any = null;

  if (options.persist && phone) {
    const { data } = await supabase
      .from("waouh_ai_agent_conversations")
      .select(
        "id,messages,human_takeover,needs_handoff",
      )
      .eq("agent_id", agentId)
      .eq("wa_contact_phone", phone)
      .maybeSingle();

    existing = data;

    if (existing?.human_takeover) {
      const messages = [
        ...(existing.messages || []),
        {
          role: "user",
          content: message,
          ts: Date.now(),
        },
      ].slice(-40);

      await supabase
        .from("waouh_ai_agent_conversations")
        .update({
          messages,
          last_activity:
            new Date().toISOString(),
        })
        .eq("id", existing.id);

      return {
        reply: "",
        needs_handoff: true,
        skipped: true,
        reason: "human_takeover",
      };
    }
  }

  const [
    facts,
    products,
  ] = await Promise.all([
    factsForAgent(
      supabase,
      agentId,
      message,
    ),
    productsForAgent(
      supabase,
      agent,
    ),
  ]);

  const reply = normalizeProfessionalReply(await chatCompletion({
    system: buildSystemPrompt(
      agent,
      products,
      facts,
    ),
    messages: [
      ...(options.history || []).slice(-6),
      {
        role: "user",
        content: [
          ...(message ? [{ type: "text", text: message }] : []),
          ...((options.input_attachments || [])
            .filter((item) => clean(item?.mime_type) && clean(item?.data))
            .slice(0, 3)
            .map((item) => ({
              type: "file_data",
              mime_type: clean(item.mime_type),
              data: clean(item.data),
            }))),
        ],
      },
    ],
    temperature: 0.2,
  }));

  const attachments = await attachmentsForMessage(
    supabase,
    products,
    message,
  );

  const needsHandoff =
    /\b(humain|human|patron|urgent|responsable|manager|parler à quelqu)\b/i
      .test(message);

  if (options.persist && phone) {
    const messages = [
      ...(existing?.messages || []),
      {
        role: "user",
        content: message,
        ts: Date.now(),
      },
      {
        role: "assistant",
        content: reply,
        ts: Date.now(),
      },
    ].slice(-40);

    if (existing) {
      await supabase
        .from("waouh_ai_agent_conversations")
        .update({
          messages,
          last_activity:
            new Date().toISOString(),
          needs_handoff:
            existing.needs_handoff ||
            needsHandoff,
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("waouh_ai_agent_conversations")
        .insert({
          agent_id: agentId,
          user_id: agent.user_id,
          wa_contact_phone: phone,
          wa_contact_name:
            options.contact_name || null,
          messages,
          needs_handoff: needsHandoff,
        });
    }

    await supabase
      .from("waouh_ai_agents")
      .update({
        stats: {
          ...(agent.stats || {}),
          messages_handled:
            Number(
              agent.stats?.messages_handled || 0,
            ) + 1,
          handoffs:
            Number(
              agent.stats?.handoffs || 0,
            ) + (needsHandoff ? 1 : 0),
        },
      })
      .eq("id", agentId);
  }

  return {
    reply,
    attachments,
    needs_handoff: needsHandoff,
    provider: "gemini",
    model: geminiModel(),
  };
}
