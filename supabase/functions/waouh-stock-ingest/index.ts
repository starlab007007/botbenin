import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import postgres from "npm:postgres@3.4.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_ROWS = 5000;
const CHUNK_SIZE = 400;

type JsonMap = Record<string, unknown>;
type SourceType = "csv" | "excel" | "google_sheet" | "postgres" | "supabase";

type RequestBody = {
  action?: "preview" | "import" | "sync" | "delete";
  datasource_id?: string;
  source_name?: string;
  source_type?: SourceType;
  rows?: JsonMap[];
  mapping?: Record<string, string | null>;
  configuration?: JsonMap;
  credentials?: JsonMap;
  remember_connection?: boolean;
};

function json(status: number, body: JsonMap) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || "Erreur interne du connecteur Stock.",
      code: null,
      details: error.stack ?? null,
      hint: null,
    };
  }
  if (error && typeof error === "object") {
    const value = error as JsonMap;
    const text = (key: string) => {
      const raw = value[key];
      if (raw === null || raw === undefined) return null;
      if (typeof raw === "string") return raw.trim() || null;
      try {
        return JSON.stringify(raw);
      } catch {
        return String(raw);
      }
    };
    return {
      message:
        text("message") ??
        text("error") ??
        "Erreur PostgreSQL, Supabase ou Google Sheets.",
      code: text("code"),
      details: text("details"),
      hint: text("hint"),
    };
  }
  return {
    message: String(error || "Erreur interne du connecteur Stock."),
    code: null,
    details: null,
    hint: null,
  };
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" ? text : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  let text = String(value)
    .replace(/ /g, " ")
    .replace(/[^\d,.\-]/g, "")
    .trim();
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOrNull(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  const match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (!match) return null;
  const parsed = new Date(
    `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}${
      match[4] || ""
    }`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function movementType(value: unknown): string | null {
  const text = normalize(value);
  if (!text) return null;
  if (
    text.includes("entree") ||
    text === "in" ||
    text.includes("approvisionnement") ||
    text.includes("achat")
  ) return "in";
  if (
    text.includes("sortie") ||
    text === "out" ||
    text.includes("vente") ||
    text.includes("consommation")
  ) return "out";
  if (text.includes("ajust") || text.includes("correction")) {
    return "adjustment";
  }
  return text;
}

const synonyms: Record<string, string[]> = {
  name: [
    "nom",
    "name",
    "produit",
    "product",
    "article",
    "designation",
    "libelle",
  ],
  sku: ["sku", "reference", "ref", "code", "id produit", "product id"],
  category: ["categorie", "category", "famille", "type produit"],
  quantity: [
    "stock",
    "quantite",
    "quantity",
    "qte",
    "stock actuel",
    "stock disponible",
    "solde",
  ],
  threshold_low: [
    "seuil",
    "minimum",
    "stock minimum",
    "seuil alerte",
    "threshold",
    "threshold low",
  ],
  target_stock: [
    "objectif",
    "cible",
    "stock cible",
    "target",
    "target stock",
  ],
  unit_price_fcfa: [
    "prix",
    "prix vente",
    "prix unitaire",
    "unit price",
    "price",
    "montant",
  ],
  cost_price_fcfa: [
    "prix achat",
    "cout",
    "cost",
    "cost price",
    "prix revient",
  ],
  supplier: ["fournisseur", "supplier", "vendeur"],
  unit: ["unite", "unit", "conditionnement"],
  location: ["emplacement", "location", "magasin", "depot", "entrepot"],
  movement_type: [
    "type mouvement",
    "movement type",
    "operation",
    "sens",
    "entree sortie",
  ],
  movement_quantity: [
    "quantite mouvement",
    "movement quantity",
    "qte mouvement",
    "volume mouvement",
  ],
  movement_date: [
    "date mouvement",
    "movement date",
    "date operation",
    "date",
    "created at",
  ],
};

function columnsOf(rows: JsonMap[]): string[] {
  const seen = new Set<string>();
  for (const row of rows.slice(0, 100)) {
    Object.keys(row).forEach((key) => seen.add(key));
  }
  return [...seen];
}

function suggestMapping(columns: string[]) {
  const normalizedColumns = new Map(
    columns.map((column) => [normalize(column), column]),
  );
  const result: Record<string, string | null> = {};
  for (const [canonical, candidates] of Object.entries(synonyms)) {
    let match: string | null = null;
    for (const candidate of candidates) {
      const target = normalize(candidate);
      match = normalizedColumns.get(target) ?? null;
      if (!match) {
        const approximate = [...normalizedColumns.entries()].find(
          ([column]) => column.includes(target) || target.includes(column),
        );
        match = approximate?.[1] ?? null;
      }
      if (match) break;
    }
    result[canonical] = match;
  }
  return result;
}

function mapped(
  row: JsonMap,
  mapping: Record<string, string | null>,
  canonical: string,
) {
  const source = mapping[canonical];
  return source ? row[source] : null;
}

function safeIdentifier(value: unknown, label: string): string {
  const text = String(value ?? "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(text)) {
    throw new Error(`${label} invalide : ${text || "vide"}.`);
  }
  return text;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function googleCsvUrl(raw: string): string {
  const url = new URL(raw);
  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) throw new Error("Lien Google Sheets invalide.");
  const gid = url.searchParams.get("gid") ?? "0";
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

function parseCsv(content: string): JsonMap[] {
  if (content.startsWith("﻿")) content = content.slice(1);
  const firstLine = content.split(/\r?\n/)[0] ?? "";
  const candidates = [",", ";", "\t", "|"];
  const delimiter = candidates
    .map((value) => ({ value, count: firstLine.split(value).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.value ?? ",";

  const matrix: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    matrix.push(row);
    row = [];
  };

  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && char === delimiter) {
      pushField();
      continue;
    }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && content[index + 1] === "\n") index++;
      pushRow();
      continue;
    }
    field += char;
  }
  if (field || row.length) pushRow();

  const useful = matrix.filter((line) => line.some((cell) => cell.trim()));
  if (useful.length < 2) {
    throw new Error("La source ne contient pas de données tabulaires.");
  }
  const headers = useful[0].map((value, index) =>
    value.trim() || `colonne_${index + 1}`
  );
  return useful.slice(1, MAX_ROWS + 1).map((line) => {
    const item: JsonMap = {};
    headers.forEach((header, index) => {
      item[header] = String(line[index] ?? "").trim();
    });
    return item;
  });
}

async function fetchGoogleRows(configuration: JsonMap): Promise<JsonMap[]> {
  const raw = cleanText(configuration.url);
  if (!raw) throw new Error("URL Google Sheets obligatoire.");
  const response = await fetch(googleCsvUrl(raw));
  if (!response.ok) {
    throw new Error(
      `Google Sheets inaccessible (${response.status}). Partagez la feuille en lecture par lien.`,
    );
  }
  return parseCsv(await response.text());
}

async function fetchPostgresRows(
  configuration: JsonMap,
  credentials: JsonMap,
): Promise<JsonMap[]> {
  const host = cleanText(configuration.host);
  const database = cleanText(configuration.database);
  const username = cleanText(configuration.username);
  const password = cleanText(credentials.password);
  if (!host || !database || !username || !password) {
    throw new Error("Paramètres PostgreSQL incomplets.");
  }
  const port = Math.max(1, Math.min(65535, Number(configuration.port ?? 5432)));
  const schema = safeIdentifier(configuration.schema ?? "public", "Schéma");
  const table = safeIdentifier(configuration.table, "Table");
  const sslMode = String(configuration.ssl_mode ?? "require");

  const sql = postgres({
    host,
    port,
    database,
    username,
    password,
    ssl: sslMode === "disable" ? false : "require",
    max: 1,
    connect_timeout: 12,
    idle_timeout: 2,
    prepare: false,
  });
  try {
    const statement = `select * from ${quoteIdentifier(schema)}.${quoteIdentifier(table)} limit ${MAX_ROWS}`;
    const values = await sql.unsafe(statement);
    return values.map((row) => ({ ...row })) as JsonMap[];
  } finally {
    await sql.end({ timeout: 2 });
  }
}

async function fetchSupabaseRows(
  configuration: JsonMap,
  credentials: JsonMap,
): Promise<JsonMap[]> {
  const baseUrl = cleanText(configuration.url)?.replace(/\/+$/, "");
  const apiKey = cleanText(credentials.api_key);
  const schema = safeIdentifier(configuration.schema ?? "public", "Schéma");
  const table = safeIdentifier(configuration.table, "Table");
  if (!baseUrl || !apiKey) {
    throw new Error("URL et clé API Supabase obligatoires.");
  }
  const response = await fetch(
    `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*&limit=${MAX_ROWS}`,
    {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Accept-Profile": schema,
      },
    },
  );
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(
      `Lecture Supabase impossible (${response.status}) : ${raw.slice(0, 500)}`,
    );
  }
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Réponse Supabase invalide.");
  return data as JsonMap[];
}

async function fetchRemoteRows(
  sourceType: SourceType,
  configuration: JsonMap,
  credentials: JsonMap,
): Promise<JsonMap[]> {
  if (sourceType === "google_sheet") return await fetchGoogleRows(configuration);
  if (sourceType === "postgres") {
    return await fetchPostgresRows(configuration, credentials);
  }
  if (sourceType === "supabase") {
    return await fetchSupabaseRows(configuration, credentials);
  }
  throw new Error(`La source ${sourceType} doit être envoyée depuis le fichier.`);
}

function hexBytes(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return new Uint8Array(
    value.match(/.{2}/g)!.map((pair) => Number.parseInt(pair, 16)),
  );
}

async function masterKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("STOCK_CONNECTOR_MASTER_KEY") ?? "";
  if (!secret) {
    throw new Error(
      "Secret STOCK_CONNECTOR_MASTER_KEY absent. Exécutez le script de configuration.",
    );
  }
  const raw = hexBytes(secret) ?? new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  );
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return new Uint8Array([...binary].map((char) => char.charCodeAt(0)));
}

async function encryptCredentials(value: JsonMap): Promise<string> {
  const key = await masterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  return `v1:${encodeBase64(iv)}:${encodeBase64(encrypted)}`;
}

async function decryptCredentials(value: string | null): Promise<JsonMap> {
  if (!value) return {};
  const [version, ivText, encryptedText] = value.split(":");
  if (version !== "v1" || !ivText || !encryptedText) {
    throw new Error("Format du secret de connexion invalide.");
  }
  const key = await masterKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(ivText) },
    key,
    decodeBase64(encryptedText),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as JsonMap;
}

function safeConfiguration(sourceType: SourceType, value: JsonMap): JsonMap {
  const pick = (...keys: string[]) => Object.fromEntries(
    keys
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, value[key]]),
  );
  if (sourceType === "google_sheet") return pick("url");
  if (sourceType === "postgres") {
    return pick(
      "host",
      "port",
      "database",
      "username",
      "schema",
      "table",
      "ssl_mode",
    );
  }
  if (sourceType === "supabase") return pick("url", "schema", "table");
  return pick("file_name");
}

function externalKey(
  row: JsonMap,
  mapping: Record<string, string | null>,
  index: number,
  recordType: string,
): string {
  const sku = cleanText(mapped(row, mapping, "sku"));
  const name = cleanText(mapped(row, mapping, "name")) ?? "produit";
  const location = cleanText(mapped(row, mapping, "location")) ?? "";
  const date = cleanText(mapped(row, mapping, "movement_date")) ?? "";
  const raw = recordType === "movement"
    ? `${sku || name}|${date}|${index}`
    : `${sku || name}|${location}`;
  return normalize(raw).replace(/\s+/g, "-").slice(0, 220) || `ligne-${index}`;
}

function normalizeRows(
  rows: JsonMap[],
  mapping: Record<string, string | null>,
  datasourceId: string,
  userId: string,
  version: string,
) {
  const records: JsonMap[] = [];
  let inventoryRows = 0;
  let movementRows = 0;

  rows.slice(0, MAX_ROWS).forEach((row, index) => {
    const name = cleanText(mapped(row, mapping, "name"));
    if (!name) return;

    const explicitMovementType = movementType(
      mapped(row, mapping, "movement_type"),
    );
    const movementQuantity = numberOrNull(
      mapped(row, mapping, "movement_quantity"),
    );
    const isMovement = explicitMovementType !== null || movementQuantity !== null;
    const recordType = isMovement ? "movement" : "inventory";
    if (isMovement) movementRows++;
    else inventoryRows++;

    records.push({
      datasource_id: datasourceId,
      user_id: userId,
      import_version: version,
      external_key: externalKey(row, mapping, index, recordType),
      record_type: recordType,
      name,
      sku: cleanText(mapped(row, mapping, "sku")),
      category: cleanText(mapped(row, mapping, "category")),
      quantity: numberOrNull(mapped(row, mapping, "quantity")),
      threshold_low: numberOrNull(mapped(row, mapping, "threshold_low")),
      target_stock: numberOrNull(mapped(row, mapping, "target_stock")),
      unit_price_fcfa: numberOrNull(mapped(row, mapping, "unit_price_fcfa")),
      cost_price_fcfa: numberOrNull(mapped(row, mapping, "cost_price_fcfa")),
      supplier: cleanText(mapped(row, mapping, "supplier")),
      unit: cleanText(mapped(row, mapping, "unit")),
      location: cleanText(mapped(row, mapping, "location")),
      movement_type: explicitMovementType,
      movement_quantity: movementQuantity,
      movement_date: dateOrNull(mapped(row, mapping, "movement_date")),
      raw_data: row,
      synced_at: new Date().toISOString(),
    });
  });

  return { records, inventoryRows, movementRows };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  let datasourceId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("Configuration Supabase incomplète.");
    }

    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      return json(401, { error: "AUTH_REQUIRED" });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      return json(401, { error: "SESSION_INVALID" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const action = body.action ?? "import";

    if (action === "delete") {
      datasourceId = cleanText(body.datasource_id);
      if (!datasourceId) throw new Error("Identifiant de source obligatoire.");
      const { error } = await admin
        .from("waouh_stock_data_sources")
        .delete()
        .eq("id", datasourceId)
        .eq("user_id", authData.user.id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    let sourceType = body.source_type as SourceType | undefined;
    let sourceName = cleanText(body.source_name);
    let configuration = body.configuration ?? {};
    let credentials = body.credentials ?? {};
    let mapping = body.mapping ?? {};
    let rows = body.rows ?? [];
    let rememberConnection = body.remember_connection === true;
    let currentSource: JsonMap | null = null;

    if (action === "sync") {
      datasourceId = cleanText(body.datasource_id);
      if (!datasourceId) throw new Error("Identifiant de source obligatoire.");
      const { data, error } = await admin
        .from("waouh_stock_data_sources")
        .select("*")
        .eq("id", datasourceId)
        .eq("user_id", authData.user.id)
        .single();
      if (error) throw error;
      currentSource = data as JsonMap;
      sourceType = String(currentSource.source_type) as SourceType;
      sourceName = cleanText(currentSource.name);
      configuration = (currentSource.configuration as JsonMap) ?? {};
      mapping = (currentSource.mapping as Record<string, string | null>) ?? {};
      credentials = await decryptCredentials(
        cleanText(currentSource.credential_ciphertext),
      );
      rememberConnection = currentSource.can_sync === true;
      if (!rememberConnection) {
        throw new Error(
          "Cette source n’a pas de connexion mémorisée. Réimportez-la.",
        );
      }
    }

    if (!sourceType) throw new Error("Type de source obligatoire.");
    if (![
      "csv",
      "excel",
      "google_sheet",
      "postgres",
      "supabase",
    ].includes(sourceType)) {
      throw new Error(`Type de source non pris en charge : ${sourceType}.`);
    }

    if (rows.length === 0) {
      rows = await fetchRemoteRows(sourceType, configuration, credentials);
    }
    if (rows.length === 0) throw new Error("La source ne contient aucune ligne.");
    if (rows.length > MAX_ROWS) {
      throw new Error(
        `La source dépasse ${MAX_ROWS} lignes. Réduisez la table ou le fichier.`,
      );
    }

    const columns = columnsOf(rows);
    const suggested = suggestMapping(columns);
    if (action === "preview") {
      return json(200, {
        columns,
        preview: rows.slice(0, 20),
        suggested_mapping: suggested,
      });
    }

    mapping = { ...suggested, ...mapping };
    if (!mapping.name) {
      throw new Error(
        `Colonne produit introuvable. Colonnes détectées : ${columns.join(", ")}.`,
      );
    }
    const hasInventory = Boolean(mapping.quantity);
    const hasMovement = Boolean(mapping.movement_type && mapping.movement_quantity);
    if (!hasInventory && !hasMovement) {
      throw new Error(
        "Associez soit Stock actuel, soit Type et Quantité du mouvement.",
      );
    }

    const canSync = sourceType === "google_sheet" ||
      ((sourceType === "postgres" || sourceType === "supabase") &&
        rememberConnection);
    const safeConfig = safeConfiguration(sourceType, configuration);
    const encrypted = canSync && sourceType !== "google_sheet"
      ? await encryptCredentials(credentials)
      : null;

    if (!datasourceId) {
      const { data, error } = await admin
        .from("waouh_stock_data_sources")
        .insert({
          user_id: authData.user.id,
          name: sourceName || `Source ${sourceType}`,
          source_type: sourceType,
          configuration: safeConfig,
          credential_ciphertext: encrypted,
          mapping,
          status: "importing",
          can_sync: canSync,
        })
        .select("id")
        .single();
      if (error) throw error;
      datasourceId = String(data.id);
    } else {
      const { error } = await admin
        .from("waouh_stock_data_sources")
        .update({
          name: sourceName || currentSource?.name,
          configuration: safeConfig,
          credential_ciphertext:
            encrypted ?? currentSource?.credential_ciphertext ?? null,
          mapping,
          status: "importing",
          last_error: null,
          can_sync: canSync,
          updated_at: new Date().toISOString(),
        })
        .eq("id", datasourceId)
        .eq("user_id", authData.user.id);
      if (error) throw error;
    }

    const version = crypto.randomUUID();
    const { records, inventoryRows, movementRows } = normalizeRows(
      rows,
      mapping,
      datasourceId,
      authData.user.id,
      version,
    );
    if (records.length === 0) {
      throw new Error("Aucune ligne n’a pu être normalisée.");
    }

    for (let index = 0; index < records.length; index += CHUNK_SIZE) {
      const { error } = await admin
        .from("waouh_stock_external_records")
        .insert(records.slice(index, index + CHUNK_SIZE));
      if (error) throw error;
    }

    const now = new Date().toISOString();
    const { error: activateError } = await admin
      .from("waouh_stock_data_sources")
      .update({
        active_version: version,
        row_count: records.length,
        status: "ready",
        last_error: null,
        last_synced_at: now,
        updated_at: now,
      })
      .eq("id", datasourceId)
      .eq("user_id", authData.user.id);
    if (activateError) throw activateError;

    await admin
      .from("waouh_stock_external_records")
      .delete()
      .eq("datasource_id", datasourceId)
      .neq("import_version", version);

    return json(200, {
      ok: true,
      datasource_id: datasourceId,
      source_name: sourceName || `Source ${sourceType}`,
      row_count: records.length,
      inventory_rows: inventoryRows,
      movement_rows: movementRows,
      columns,
    });
  } catch (error) {
    const info = errorInfo(error);
    console.error("waouh-stock-ingest", info);
    if (datasourceId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const admin = createClient(supabaseUrl, serviceKey);
        await admin
          .from("waouh_stock_data_sources")
          .update({
            status: "error",
            last_error: info.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", datasourceId);
      } catch {
        // Ne pas masquer l'erreur principale.
      }
    }
    return json(500, {
      error: "STOCK_INGEST_FAILED",
      message: info.message,
      code: info.code,
      details: info.details,
      hint: info.hint,
    });
  }
});
