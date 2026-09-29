import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const VERSION = "2.14.0";
const MAX_CATALOG_ROWS = 1000;
const CACHE_TTL_MS = 2 * 60 * 1000;
const DB_TIMEOUT_MS = 9000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-region",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;
type SupabaseClientLike = ReturnType<typeof createClient>;

type NoteValue = {
  subject: string;
  normalizedSubject: string;
  score: number;
  confidence: number | null;
};

type CatalogCache = {
  loadedAt: number;
  rows: JsonRecord[];
  publicationMode: string;
};

let catalogCache: CatalogCache = {
  loadedAt: 0,
  rows: [],
  publicationMode: "UNKNOWN",
};

let publicationCheckedAt = 0;

function jsonResponse(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
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

function sanitizeText(value: unknown, maxLength = 800) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalized(value: unknown) {
  return sanitizeText(value, 4000)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function standardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      values.length,
  );
}

async function withTimeout<T>(
  operation: PromiseLike<T>,
  milliseconds: number,
  label: string,
): Promise<T> {
  let timer: number | undefined;

  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label}_TIMEOUT_${milliseconds}MS`)),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}

function detectSeries(message: string, explicit: unknown) {
  const fromBody = sanitizeText(explicit, 40).toUpperCase();
  if (fromBody && fromBody !== "TOUTES") return fromBody;

  const match = message.toUpperCase().match(
    /(?:BAC|SÉRIE|SERIE)\s*(A1|A2|B|C|D|E|F1|F2|F3|F4|G1|G2|G3|EA|DEAT|DT(?:\/[A-Z0-9]+)?)/,
  );

  return match?.[1] ?? null;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeText(item, 120))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const decoded = JSON.parse(value);
      if (Array.isArray(decoded)) return asStringArray(decoded);
    } catch (_) {
      return value
        .split(/[,;/]/)
        .map((item) => sanitizeText(item, 120))
        .filter(Boolean);
    }
  }

  return [] as string[];
}

function recordSeries(row: JsonRecord) {
  return asStringArray(row.bac_series).map((item) => item.toUpperCase());
}

function seriesMatches(row: JsonRecord, series: string | null) {
  if (!series) return true;

  const expected = series.toUpperCase();
  const accepted = recordSeries(row);

  return accepted.some((item) => {
    const candidate = item.replace(/\s+/g, "");

    if (candidate === expected) return true;
    if (expected === "DT" && candidate.startsWith("DT/")) return true;
    if (expected === "DEAT" && candidate.startsWith("DEAT")) return true;
    if (/^F[1-4]$/.test(expected) && candidate === "F") return true;
    if (expected === "F" && /^F[1-4]$/.test(candidate)) return true;

    return false;
  });
}

function parseKnownSubjects(value: unknown) {
  const source = normalized(value);
  const subjects = new Set<string>();

  const rules: Array<[RegExp, string]> = [
    [/\bmath/, "Mathématiques"],
    [/\b(spct|pct)\b|physique|chimie/, "PCT/SPCT"],
    [/\bsvt\b|vie et de la terre/, "SVT"],
    [/francais/, "Français"],
    [/anglais|lv1/, "Anglais"],
    [/histoire|geo/, "Histoire-Géographie"],
    [/philo/, "Philosophie"],
    [/economie/, "Économie"],
    [/comptabilite/, "Comptabilité"],
    [/dessin/, "Dessin"],
    [/informatique/, "Informatique"],
  ];

  for (const [pattern, label] of rules) {
    if (pattern.test(source)) subjects.add(label);
  }

  return [...subjects];
}

function subjectsForSeries(
  value: unknown,
  source: unknown,
  selectedSeries: string | null,
) {
  const found = new Set<string>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;

      const rule = item as JsonRecord;
      const series = asStringArray(rule.series).map((entry) =>
        entry.toUpperCase()
      );

      const applies = !selectedSeries || series.length === 0 ||
        series.some((entry) => {
          if (entry === selectedSeries) return true;
          if (selectedSeries === "DT" && entry.startsWith("DT/")) return true;
          if (selectedSeries === "DEAT" && entry.startsWith("DEAT")) return true;
          return false;
        });

      if (!applies) continue;

      for (const subject of asStringArray(rule.subjects)) {
        found.add(subject);
      }

      for (const subject of parseKnownSubjects(rule.raw_text)) {
        found.add(subject);
      }
    }
  }

  for (const subject of parseKnownSubjects(source)) {
    found.add(subject);
  }

  return [...found];
}

function anomalyCount(row: JsonRecord) {
  const raw = row.raw_record;
  if (raw && typeof raw === "object") {
    const ids = (raw as JsonRecord).anomaly_ids;
    if (Array.isArray(ids)) return ids.length;
  }

  return Number(row.anomaly_count ?? 0);
}

function publicationVisible(row: JsonRecord) {
  const status = sanitizeText(row.validation_status, 40).toUpperCase();
  return status !== "ARCHIVED";
}

async function ensurePublicCatalog(admin: SupabaseClientLike) {
  const now = Date.now();

  if (now - publicationCheckedAt < CACHE_TTL_MS) {
    return catalogCache.publicationMode;
  }

  publicationCheckedAt = now;

  try {
    const timestamp = new Date().toISOString();

    const [programsResult, documentsResult] = await Promise.all([
      withTimeout(
        admin
          .from("apresbac_program_records")
          .update({
            published: true,
            validation_status: "PUBLISHED",
            updated_at: timestamp,
          })
          .neq("validation_status", "ARCHIVED"),
        DB_TIMEOUT_MS,
        "PROGRAM_PUBLICATION",
      ),
      withTimeout(
        admin
          .from("apresbac_reference_documents")
          .update({
            published: true,
            validation_status: "PUBLISHED",
            updated_at: timestamp,
          })
          .neq("validation_status", "ARCHIVED"),
        DB_TIMEOUT_MS,
        "DOCUMENT_PUBLICATION",
      ),
    ]);

    if (
      (programsResult as JsonRecord).error ||
      (documentsResult as JsonRecord).error
    ) {
      catalogCache.publicationMode = "PUBLIC_EDGE_FALLBACK";
    } else {
      catalogCache.publicationMode = "PUBLISHED_DATABASE_AND_EDGE";
    }
  } catch (error) {
    console.warn("publication fallback", cleanError(error));
    catalogCache.publicationMode = "PUBLIC_EDGE_FALLBACK";
  }

  catalogCache.loadedAt = 0;
  return catalogCache.publicationMode;
}

async function loadCatalog(admin: SupabaseClientLike) {
  const now = Date.now();

  if (
    catalogCache.rows.length > 0 &&
    now - catalogCache.loadedAt < CACHE_TTL_MS
  ) {
    return catalogCache;
  }

  const publicationMode = await ensurePublicCatalog(admin);

  const result = await withTimeout(
    admin
      .from("apresbac_program_records")
      .select(
        [
          "id",
          "academic_year",
          "university",
          "institution",
          "campus",
          "program_name",
          "degree",
          "public_private_status",
          "private_program_status",
          "quota_scholarship",
          "quota_aid_fpp",
          "quota_fep",
          "admission_mode",
          "bac_series",
          "subjects_by_series",
          "subjects_source",
          "special_rules",
          "outcomes",
          "occupations",
          "source_page",
          "source_text",
          "confidence_score",
          "confidence_label",
          "validation_status",
          "published",
          "raw_record",
        ].join(","),
      )
      .range(0, MAX_CATALOG_ROWS - 1),
    DB_TIMEOUT_MS,
    "CATALOG_LOAD",
  ) as {
    data: JsonRecord[] | null;
    error: unknown;
  };

  if (result.error) throw result.error;

  const rows = (result.data ?? []).filter(publicationVisible);

  catalogCache = {
    loadedAt: now,
    rows,
    publicationMode,
  };

  return catalogCache;
}

function occupations(value: unknown) {
  return asStringArray(value).slice(0, 16);
}

function toProgram(
  row: JsonRecord,
  selectedSeries: string | null,
  relevanceScore = 0,
) {
  return {
    id: row.id,
    academic_year: row.academic_year,
    university: row.university,
    institution: row.institution,
    campus: row.campus,
    name: row.program_name,
    degree: row.degree,
    status: row.public_private_status,
    regulatory_status: row.private_program_status,
    admission_mode: row.admission_mode,
    scholarship_quota: row.quota_scholarship,
    aid_fpp_quota: row.quota_aid_fpp,
    fep_quota: row.quota_fep,
    bac_series: recordSeries(row),
    subjects: subjectsForSeries(
      row.subjects_by_series,
      row.subjects_source,
      selectedSeries,
    ),
    subjects_source: row.subjects_source,
    special_rules: row.special_rules,
    outcomes: row.outcomes,
    occupations: occupations(row.occupations),
    confidence_score: Number(row.confidence_score ?? 0),
    confidence_label: row.confidence_label,
    anomaly_count: anomalyCount(row),
    validation_status: row.validation_status,
    published: row.published,
    relevance_score: relevanceScore,
  };
}

function canonicalProgramTokens(value: unknown) {
  const ignored = new Set([
    "licence",
    "licences",
    "master",
    "masters",
    "doctorat",
    "bts",
    "dut",
    "deust",
    "ingenieur",
    "ingenierie",
    "professionnelle",
    "professionnel",
    "fondamentale",
    "formation",
    "filiere",
    "option",
    "parcours",
    "specialite",
    "science",
    "sciences",
  ]);

  return normalized(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !ignored.has(token));
}

function programSimilarity(left: unknown, right: unknown) {
  const a = new Set(canonicalProgramTokens(left));
  const b = new Set(canonicalProgramTokens(right));

  if (a.size === 0 || b.size === 0) return 0;

  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;

  return union === 0 ? 0 : intersection / union;
}

function offeringInstitutionsFor(
  program: JsonRecord,
  rows: JsonRecord[],
) {
  const targetName = sanitizeText(program.name, 240);
  const targetNormalized = normalized(targetName);
  const unique = new Map<string, JsonRecord>();

  for (const row of rows) {
    const candidateName = sanitizeText(row.program_name, 240);
    const candidateNormalized = normalized(candidateName);

    const sameFamily =
      candidateNormalized === targetNormalized ||
      candidateNormalized.includes(targetNormalized) ||
      targetNormalized.includes(candidateNormalized) ||
      programSimilarity(targetName, candidateName) >= 0.58;

    if (!sameFamily) continue;

    const university = sanitizeText(row.university, 180);
    const institution = sanitizeText(row.institution, 180);
    const campus = sanitizeText(row.campus, 120);
    const degree = sanitizeText(row.degree, 100);
    const key = normalized(
      [university, institution, campus, degree].join("|"),
    );

    if (!key || unique.has(key)) continue;

    unique.set(key, {
      university: university || null,
      institution: institution || null,
      campus: campus || null,
      degree: degree || null,
      status: row.public_private_status ?? null,
      admission_mode: row.admission_mode ?? null,
      scholarship_quota: row.quota_scholarship ?? null,
      aid_fpp_quota: row.quota_aid_fpp ?? null,
      fep_quota: row.quota_fep ?? null,
    });
  }

  return [...unique.values()]
    .sort((a, b) => {
      const left = normalized(
        [a.university, a.institution, a.campus].join(" "),
      );
      const right = normalized(
        [b.university, b.institution, b.campus].join(" "),
      );
      return left.localeCompare(right);
    })
    .slice(0, 20);
}

function enrichProgramsWithOfferings(
  programs: JsonRecord[],
  rows: JsonRecord[],
): JsonRecord[] {
  return programs.map((program) => {
    const offerings = offeringInstitutionsFor(program, rows);

    return {
      ...program,
      offering_institutions: offerings,
      offering_institutions_count: offerings.length,
    } as JsonRecord;
  });
}


const stopWords = new Set([
  "je",
  "tu",
  "nous",
  "vous",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "un",
  "une",
  "et",
  "ou",
  "pour",
  "avec",
  "dans",
  "sur",
  "mon",
  "ma",
  "mes",
  "ton",
  "ta",
  "tes",
  "quel",
  "quelle",
  "quels",
  "quelles",
  "filiere",
  "filieres",
  "formation",
  "formations",
  "bac",
  "serie",
  "orientation",
  "presente",
  "moi",
  "decouvrir",
  "metier",
  "metiers",
  "compatible",
  "compatibles",
  "verifie",
  "verifier",
  "recommande",
  "recommandation",
  "analyse",
  "analyser",
  "profil",
  "notes",
  "calcul",
  "moyenne",
  "possible",
  "peux",
  "veux",
  "cherche",
  "donne",
  "explique",
]);

function searchTerms(message: string) {
  return normalized(message)
    .split(" ")
    .filter((term) => term.length >= 2 && !stopWords.has(term))
    .slice(0, 8);
}

function searchableText(row: JsonRecord) {
  return normalized([
    row.program_name,
    row.institution,
    row.university,
    row.campus,
    row.degree,
    row.outcomes,
    JSON.stringify(row.occupations ?? []),
    row.subjects_source,
    row.source_text,
  ].join(" "));
}

function relevanceFor(row: JsonRecord, terms: string[], phrase: string) {
  if (terms.length === 0) return 1;

  const name = normalized(row.program_name);
  const institution = normalized(row.institution);
  const text = searchableText(row);

  let score = 0;

  if (phrase && name.includes(phrase)) score += 40;

  for (const term of terms) {
    if (name.includes(term)) score += 12;
    else if (institution.includes(term)) score += 7;
    else if (text.includes(term)) score += 3;
  }

  return score;
}

async function searchCatalog(
  admin: SupabaseClientLike,
  message: string,
  selectedSeries: string | null,
  limit: number,
) {
  const catalog = await loadCatalog(admin);
  const terms = searchTerms(message);
  const phrase = normalized(message);

  const matches = catalog.rows
    .filter((row) => seriesMatches(row, selectedSeries))
    .map((row) => ({
      row,
      relevance: relevanceFor(row, terms, phrase),
    }))
    .filter((item) => terms.length === 0 || item.relevance > 0)
    .sort((a, b) => {
      const confidenceA = Number(a.row.confidence_score ?? 0);
      const confidenceB = Number(b.row.confidence_score ?? 0);

      return b.relevance - a.relevance ||
        confidenceB - confidenceA ||
        anomalyCount(a.row) - anomalyCount(b.row) ||
        Number(a.row.source_page ?? 9999) -
          Number(b.row.source_page ?? 9999);
    })
    .slice(0, Math.max(1, Math.min(limit, 30)))
    .map((item) => toProgram(item.row, selectedSeries, item.relevance));

  const enrichedMatches = enrichProgramsWithOfferings(
    matches,
    catalog.rows,
  );

  return {
    programs: enrichedMatches,
    totalCatalog: catalog.rows.length,
    publicationMode: catalog.publicationMode,
  };
}

function normalizeSubject(value: unknown) {
  const text = normalized(value);

  if (/\bmath/.test(text)) return "MATHS";
  if (/\b(spct|pct)\b/.test(text)) return "PCT";
  if (text.includes("physique") || text.includes("chimie")) return "PCT";
  if (/\bsvt\b/.test(text) || text.includes("vie et de la terre")) return "SVT";
  if (text.includes("francais")) return "FRANCAIS";
  if (text.includes("anglais") || text.includes("lv1")) return "ANGLAIS";
  if (text.includes("histoire") || text.includes("geo")) return "HISTOIRE_GEO";
  if (text.includes("philo")) return "PHILOSOPHIE";
  if (text.includes("economie")) return "ECONOMIE";
  if (text.includes("comptabilite")) return "COMPTABILITE";
  if (text.includes("dessin")) return "DESSIN";
  if (text.includes("informatique")) return "INFORMATIQUE";

  return text.toUpperCase().replace(/\s+/g, "_");
}

function buildNotes(rawNotes: unknown) {
  if (!Array.isArray(rawNotes)) return [] as NoteValue[];

  const seen = new Map<string, NoteValue>();

  for (const item of rawNotes) {
    if (!item || typeof item !== "object") continue;

    const row = item as JsonRecord;
    const subject = sanitizeText(
      row.subject ?? row.subject_name,
      100,
    );
    const score = numberValue(row.score);
    const confidence = numberValue(row.confidence);

    if (!subject || score == null || score < 0 || score > 20) continue;

    const normalizedSubject = normalizeSubject(subject);

    seen.set(normalizedSubject, {
      subject,
      normalizedSubject,
      score,
      confidence:
        confidence != null && confidence >= 0 && confidence <= 1
          ? confidence
          : null,
    });
  }

  return [...seen.values()];
}

function noteIndex(notes: NoteValue[]) {
  const index = new Map<string, number[]>();

  for (const note of notes) {
    const values = index.get(note.normalizedSubject) ?? [];
    values.push(note.score);
    index.set(note.normalizedSubject, values);
  }

  return index;
}

function scoreForAlias(index: Map<string, number[]>, alias: string) {
  const values = index.get(alias);
  return values && values.length > 0 ? mean(values) : null;
}


type OfficialComponent = {
  subject: string;
  key: string;
  coefficient: number;
};

function buildOfficialCalculation(
  label: string,
  components: OfficialComponent[],
  index: Map<string, number[]>,
  verificationMode: string,
) {
  const calculated = components.map((component) => {
    const score = scoreForAlias(index, component.key);

    return {
      subject: component.subject,
      coefficient: component.coefficient,
      score: score == null ? null : round(score),
      weighted_score:
        score == null ? null : round(score * component.coefficient),
    };
  });

  const missingSubjects = calculated
    .filter((component) => component.score == null)
    .map((component) => component.subject);
  const totalCoefficients = components.reduce(
    (sum, component) => sum + component.coefficient,
    0,
  );
  const formula = components
    .map(
      (component) =>
        `${component.subject}×${component.coefficient}`,
    )
    .join(" + ");

  if (missingSubjects.length > 0 || totalCoefficients <= 0) {
    return {
      available: false,
      verified: true,
      ranking_possible: false,
      status: "OFFICIAL_INCOMPLETE",
      label: "Calcul officiel incomplet",
      verification_mode: verificationMode,
      general_formula:
        "M = (m₁×x + m₂×y + m₃×z) ÷ (x+y+z)",
      formula: `(${formula}) ÷ ${totalCoefficients}`,
      components: calculated,
      total_coefficients: totalCoefficients,
      missing_subjects: missingSubjects,
      ranking_rule:
        "Le classement par filière se fait de la moyenne la plus forte à la moyenne la plus faible, dans la limite des quotas disponibles.",
      message:
        "La formule de classement est disponible, mais certaines notes manquent.",
    };
  }

  const weightedSum = calculated.reduce(
    (sum, component) =>
      sum + Number(component.weighted_score ?? 0),
    0,
  );
  const value = weightedSum / totalCoefficients;

  return {
    available: true,
    verified: true,
    ranking_possible: true,
    status: "OFFICIAL_CALCULABLE",
    label,
    verification_mode: verificationMode,
    general_formula:
      "M = (m₁×x + m₂×y + m₃×z) ÷ (x+y+z)",
    formula: `(${formula}) ÷ ${totalCoefficients}`,
    components: calculated,
    total_coefficients: totalCoefficients,
    weighted_sum: round(weightedSum),
    value: round(value),
    calculation_expression:
      `(${calculated.map((component) => `${component.score}×${component.coefficient}=${component.weighted_score}`).join(" + ")}) ÷ ${totalCoefficients} = ${round(value)}/20`,
    ranking_rule:
      "Le classement par filière se fait de la moyenne la plus forte à la moyenne la plus faible, dans la limite des quotas disponibles.",
    message:
      "Le classement peut être estimé avec la formule disponible et les notes saisies.",
  };
}

function explicitCoefficientComponents(program: JsonRecord) {
  const source = sanitizeText(
    [
      program.special_rules,
      program.subjects_source,
    ].join(" "),
    6000,
  );

  if (!source) return [] as OfficialComponent[];

  const definitions: Array<{
    key: string;
    subject: string;
    pattern: string;
  }> = [
    {
      key: "MATHS",
      subject: "Mathématiques",
      pattern: "math(?:e|é)?matiques?|maths?",
    },
    {
      key: "PCT",
      subject: "PCT/SPCT",
      pattern:
        "(?:spct|pct|physique(?:\\s*[-–]\\s*|\\s+et\\s+)?chimie)",
    },
    {
      key: "SVT",
      subject: "SVT",
      pattern:
        "(?:svt|sciences?\\s+de\\s+la\\s+vie\\s+et\\s+de\\s+la\\s+terre)",
    },
    {
      key: "FRANCAIS",
      subject: "Français",
      pattern: "fran(?:c|ç)ais",
    },
    {
      key: "ANGLAIS",
      subject: "Anglais",
      pattern: "anglais|lv1",
    },
    {
      key: "HISTOIRE_GEO",
      subject: "Histoire-Géographie",
      pattern:
        "histoire(?:\\s*[-–]\\s*|\\s+et\\s+)?g(?:e|é)ographie",
    },
    {
      key: "PHILOSOPHIE",
      subject: "Philosophie",
      pattern: "philosophie|philo",
    },
    {
      key: "ECONOMIE",
      subject: "Économie",
      pattern: "(?:e|é)conomie",
    },
    {
      key: "COMPTABILITE",
      subject: "Comptabilité",
      pattern: "comptabilit(?:e|é)",
    },
    {
      key: "INFORMATIQUE",
      subject: "Informatique",
      pattern: "informatique",
    },
  ];

  const found = new Map<string, OfficialComponent>();

  for (const definition of definitions) {
    const direct = new RegExp(
      `(?:${definition.pattern})\\s*(?:[:=\\-–]?\\s*)` +
        `(?:x|×|coef(?:ficient)?\\s*)\\s*(\\d+(?:[.,]\\d+)?)`,
      "i",
    );
    const reverse = new RegExp(
      `(?:coef(?:ficient)?\\s*)(\\d+(?:[.,]\\d+)?)` +
        `\\s*(?:pour|en|:|=|-|–)?\\s*(?:${definition.pattern})`,
      "i",
    );
    const match = source.match(direct) ?? source.match(reverse);

    if (!match) continue;

    const coefficient = Number(match[1].replace(",", "."));

    if (!Number.isFinite(coefficient) || coefficient <= 0) continue;

    found.set(definition.key, {
      key: definition.key,
      subject: definition.subject,
      coefficient,
    });
  }

  return [...found.values()];
}

function exactClassification(
  program: JsonRecord,
  series: string | null,
  index: Map<string, number[]>,
) {
  const name = normalized(program.name);

  if (name.includes("medecine") && series === "D") {
    return buildOfficialCalculation(
      "Moyenne de classement Médecine — Bac D",
      [
        { key: "SVT", subject: "SVT", coefficient: 5 },
        { key: "MATHS", subject: "Mathématiques", coefficient: 4 },
        { key: "PCT", subject: "PCT/SPCT", coefficient: 4 },
      ],
      index,
      "OFFICIAL_RULE_AVAILABLE",
    );
  }

  if (name.includes("medecine") && series === "C") {
    return buildOfficialCalculation(
      "Moyenne de classement Médecine — Bac C",
      [
        { key: "SVT", subject: "SVT", coefficient: 2 },
        { key: "MATHS", subject: "Mathématiques", coefficient: 6 },
        { key: "PCT", subject: "PCT/SPCT", coefficient: 5 },
      ],
      index,
      "OFFICIAL_RULE_AVAILABLE",
    );
  }

  const explicitComponents = explicitCoefficientComponents(program);

  if (explicitComponents.length >= 2) {
    return buildOfficialCalculation(
      "Moyenne de classement calculable",
      explicitComponents,
      index,
      "EXPLICIT_RULE_IN_CATALOG",
    );
  }

  const expectedSubjects = Array.isArray(program.subjects)
    ? (program.subjects as unknown[])
      .map((subject) => sanitizeText(subject, 100))
      .filter(Boolean)
      .slice(0, 8)
    : [];

  return {
    available: false,
    verified: false,
    ranking_possible: false,
    status: "OFFICIAL_RULE_UNAVAILABLE",
    label: "Calcul officiel non disponible",
    verification_mode: "NO_EXPLICIT_COEFFICIENT_RULE",
    general_formula:
      "M = (m₁×x + m₂×y + m₃×z) ÷ (x+y+z)",
    required_subjects: expectedSubjects,
    missing_subjects: [],
    ranking_rule:
      "Le classement par filière se fait de la moyenne la plus forte à la moyenne la plus faible, dans la limite des quotas disponibles.",
    message:
      "La compatibilité et l’éligibilité indicative sont calculées, mais les coefficients officiels de cette filière ne sont pas disponibles.",
  };
}


function eligibilityFor(
  series: string | null,
  notesCount: number,
  overallAverage: number,
  relevantAverage: number | null,
  compatibility: number,
  exact: JsonRecord | null,
) {
  if (!series) {
    return {
      code: "SERIES_REQUIRED",
      label: "Série à sélectionner",
      tone: "NEUTRAL",
      eligible: null,
      message:
        "Sélectionne la série du Bac pour vérifier la compatibilité.",
    };
  }

  if (notesCount === 0) {
    return {
      code: "NOTES_REQUIRED",
      label: "Compatibilité de série",
      tone: "POTENTIAL",
      eligible: null,
      message:
        "La série est compatible. Ajoute les notes pour une vérification personnalisée.",
    };
  }

  const exactAvailable = exact?.available === true;
  const basis = exactAvailable
    ? Number(exact?.value ?? 0)
    : relevantAverage ?? overallAverage;

  if (compatibility >= 78 && basis >= 12) {
    return {
      code: "STRONG_INDICATIVE",
      label: "Éligibilité indicative forte",
      tone: "POSITIVE",
      eligible: true,
      score: Math.round(compatibility),
      basis: round(basis),
      message:
        "Le profil est fortement compatible avec les critères disponibles.",
    };
  }

  if (compatibility >= 62 && basis >= 10) {
    return {
      code: "INDICATIVE",
      label: "Éligibilité indicative",
      tone: "POSITIVE",
      eligible: true,
      score: Math.round(compatibility),
      basis: round(basis),
      message:
        "Le profil est compatible, sous réserve des règles et places officielles.",
    };
  }

  if (compatibility >= 48 || basis >= 9) {
    return {
      code: "POTENTIAL",
      label: "Potentiellement éligible",
      tone: "WARNING",
      eligible: null,
      score: Math.round(compatibility),
      basis: round(basis),
      message:
        "Le profil est proche des attentes. Certaines matières doivent être renforcées.",
    };
  }

  return {
    code: "TO_STRENGTHEN",
    label: "Profil à renforcer",
    tone: "CRITICAL",
    eligible: false,
    score: Math.round(compatibility),
    basis: round(basis),
    message:
      "La série peut convenir, mais les résultats actuels demandent un renforcement.",
  };
}

function analyzeProgram(
  program: JsonRecord,
  notes: NoteValue[],
  overallAverage: number,
  series: string | null,
) {
  const index = noteIndex(notes);
  const subjects = Array.isArray(program.subjects)
    ? (program.subjects as unknown[])
      .map((item) => sanitizeText(item, 100))
      .filter(Boolean)
    : [];

  const matched = subjects
    .map((subject) => {
      const score = scoreForAlias(index, normalizeSubject(subject));
      return score == null ? null : { subject, score: round(score) };
    })
    .filter((item): item is { subject: string; score: number } => item != null);

  const relevantAverage = matched.length > 0
    ? mean(matched.map((item) => item.score))
    : null;
  const coverage = subjects.length > 0 ? matched.length / subjects.length : 0;
  const confidence = Math.max(
    0,
    Math.min(1, Number(program.confidence_score ?? 0)),
  );
  const completeness = [
    program.name,
    program.institution,
    program.university,
    program.outcomes,
    Array.isArray(program.occupations) &&
      (program.occupations as unknown[]).length > 0,
    program.admission_mode,
  ].filter(Boolean).length / 6;

  let compatibility = series ? 30 : 20;
  compatibility += relevantAverage == null
    ? Math.min(25, (overallAverage / 20) * 25)
    : Math.min(42, (relevantAverage / 20) * 42);
  compatibility += Math.min(10, coverage * 10);
  compatibility += Math.min(10, confidence * 10);
  compatibility += Math.min(8, completeness * 8);
  compatibility -= Math.min(12, Number(program.anomaly_count ?? 0) * 1.5);

  compatibility = Math.max(0, Math.min(100, compatibility));

  const exact = exactClassification(program, series, index);
  const eligibility = eligibilityFor(
    series,
    notes.length,
    overallAverage,
    relevantAverage,
    compatibility,
    exact,
  );
  const reasons = [
    series ? `Série ${series} acceptée par la filière` : "Recherche sans filtre de série",
    relevantAverage == null
      ? `Moyenne générale indicative : ${round(overallAverage)}/20`
      : `Moyenne des matières pertinentes : ${round(relevantAverage)}/20`,
    `Couverture des matières : ${round(coverage * 100, 1)} %`,
    `Confiance du référentiel : ${sanitizeText(program.confidence_label, 30) || "à vérifier"}`,
  ];

  if (Number(program.anomaly_count ?? 0) > 0) {
    reasons.push(
      `${program.anomaly_count} anomalie(s) documentaire(s) conservée(s)`,
    );
  }

  return {
    ...program,
    match_score: Math.round(compatibility),
    relevant_average:
      relevantAverage == null ? null : round(relevantAverage),
    matched_subjects: matched,
    subject_coverage: round(coverage * 100, 1),
    official_calculation: exact,
    eligibility,
    reasons,
  };
}

function levelLabel(average: number) {
  if (average >= 16) return "Excellent";
  if (average >= 14) return "Très solide";
  if (average >= 12) return "Solide";
  if (average >= 10) return "Satisfaisant";
  return "À renforcer";
}

async function getStoredNotes(
  admin: SupabaseClientLike,
  userId: string | null,
) {
  if (!userId) return [] as NoteValue[];

  try {
    const result = await withTimeout(
      admin
        .from("apresbac_student_subject_results")
        .select("subject_name,score,extraction_confidence,updated_at")
        .eq("user_id", userId)
        .eq("confirmed", true)
        .order("subject_name"),
      DB_TIMEOUT_MS,
      "PROFILE_NOTES",
    ) as {
      data: JsonRecord[] | null;
      error: unknown;
    };

    if (result.error) {
      console.warn("profile notes unavailable", cleanError(result.error));
      return [];
    }

    return buildNotes(
      (result.data ?? []).map((row) => ({
        subject: row.subject_name,
        score: row.score,
        confidence: row.extraction_confidence,
      })),
    );
  } catch (error) {
    console.warn("profile notes fallback", cleanError(error));
    return [];
  }
}

async function saveNotesBestEffort(
  admin: SupabaseClientLike,
  userId: string | null,
  series: string | null,
  notes: NoteValue[],
  source: string,
) {
  if (!userId || !series || notes.length === 0) {
    return {
      synced_to_cloud: false,
      sync_reason: userId ? "SERIES_OR_NOTES_MISSING" : "ANONYMOUS_LOCAL_MODE",
    };
  }

  try {
    const now = new Date().toISOString();

    const profileResult = await withTimeout(
      admin
        .from("apresbac_student_profiles")
        .upsert(
          {
            user_id: userId,
            bac_series: series,
            academic_year: "2025-2026",
            updated_at: now,
          },
          { onConflict: "user_id" },
        ),
      DB_TIMEOUT_MS,
      "PROFILE_UPSERT",
    ) as JsonRecord;

    if (profileResult.error) throw profileResult.error;

    const rows = notes.map((note) => ({
      user_id: userId,
      academic_year: "2025-2026",
      bac_series: series,
      subject_name: note.subject,
      score: note.score,
      source: source === "OCR" ? "OCR" : "MANUAL",
      extraction_confidence: note.confidence,
      confirmed: true,
      updated_at: now,
    }));

    const result = await withTimeout(
      admin
        .from("apresbac_student_subject_results")
        .upsert(
          rows,
          {
            onConflict:
              "user_id,academic_year,bac_series,subject_name",
          },
        ),
      DB_TIMEOUT_MS,
      "NOTES_UPSERT",
    ) as JsonRecord;

    if (result.error) throw result.error;

    return {
      synced_to_cloud: true,
      saved_count: notes.length,
    };
  } catch (error) {
    console.warn("notes cloud sync unavailable", cleanError(error));
    return {
      synced_to_cloud: false,
      saved_count: notes.length,
      sync_reason: cleanError(error),
    };
  }
}



async function analyzeProfile(
  admin: SupabaseClientLike,
  userId: string | null,
  selectedSeries: string | null,
  payloadNotes: unknown,
  maxResults: number,
  mode = "ANALYSIS",
) {
  let notes = buildNotes(payloadNotes);

  if (notes.length === 0) {
    notes = await getStoredNotes(admin, userId);
  }

  const catalog = await searchCatalog(
    admin,
    "",
    selectedSeries,
    Math.max(maxResults, 30),
  );

  if (notes.length === 0) {
    return {
      answer:
        "Sélectionne ta série, puis scanne ton relevé ou saisis tes notes. Je pourrai ensuite analyser le profil, vérifier les calculs possibles, classer les recommandations et présenter les universités.",
      summary: "Notes nécessaires pour personnaliser l’analyse.",
      sections: [
        {
          title: "À faire",
          content:
            "Ajoute au moins trois notes, notamment les matières principales de ta série.",
        },
      ],
      programs: catalog.programs.slice(0, Math.min(maxResults, 3)),
      analysis: {
        notes_count: 0,
        recommendations_count: catalog.programs.length,
      },
      follow_up_suggestions: [
        "Quelles notes dois-je saisir ?",
        "Présente-moi les filières compatibles avec ma série",
      ],
      publication_mode: catalog.publicationMode,
    };
  }

  const scores = notes.map((note) => note.score);
  const overallAverage = mean(scores);

  let recommendations: any[] = catalog.programs
    .map((program) =>
      analyzeProgram(program, notes, overallAverage, selectedSeries)
    );

  if (mode === "OFFICIAL_RANKING") {
    recommendations = recommendations.sort((a, b) => {
      const officialA = a.official_calculation as JsonRecord | undefined;
      const officialB = b.official_calculation as JsonRecord | undefined;
      const possibleA = officialA?.ranking_possible === true ? 1 : 0;
      const possibleB = officialB?.ranking_possible === true ? 1 : 0;
      const valueA = Number(officialA?.value ?? -1);
      const valueB = Number(officialB?.value ?? -1);

      return possibleB - possibleA ||
        valueB - valueA ||
        b.match_score - a.match_score;
    });
  } else if (mode === "UNIVERSITIES") {
    recommendations = recommendations.sort((a, b) => {
      const institutionsA = Number(
        a.offering_institutions_count ?? 0,
      );
      const institutionsB = Number(
        b.offering_institutions_count ?? 0,
      );

      return institutionsB - institutionsA ||
        b.match_score - a.match_score;
    });
  } else {
    recommendations = recommendations.sort((a, b) => {
      const exactA = a.official_calculation &&
          (a.official_calculation as JsonRecord).available === true
        ? Number((a.official_calculation as JsonRecord).value ?? 0)
        : -1;
      const exactB = b.official_calculation &&
          (b.official_calculation as JsonRecord).available === true
        ? Number((b.official_calculation as JsonRecord).value ?? 0)
        : -1;

      return b.match_score - a.match_score || exactB - exactA;
    });
  }

  const sorted = [...notes].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, Math.min(3, sorted.length));
  const improvements = [...notes]
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.min(3, notes.length));

  const calculations = {
    notes_count: notes.length,
    average: round(overallAverage),
    median: round(median(scores)),
    standard_deviation: round(standardDeviation(scores)),
    minimum: round(Math.min(...scores)),
    maximum: round(Math.max(...scores)),
    level: levelLabel(overallAverage),
  };

  const visible = recommendations.slice(0, maxResults);
  const indicativeEligible = recommendations.filter((program) => {
    const eligibility = program.eligibility as JsonRecord | undefined;
    return eligibility?.eligible === true;
  }).length;
  const potential = recommendations.filter((program) => {
    const eligibility = program.eligibility as JsonRecord | undefined;
    return eligibility?.code === "POTENTIAL";
  }).length;
  const officialCalculable = recommendations.filter((program) => {
    const official =
      program.official_calculation as JsonRecord | undefined;
    return official?.ranking_possible === true;
  }).length;
  const officialIncomplete = recommendations.filter((program) => {
    const official =
      program.official_calculation as JsonRecord | undefined;
    return official?.status === "OFFICIAL_INCOMPLETE";
  }).length;

  const institutionKeys = new Set<string>();

  for (const program of visible) {
    const offerings = Array.isArray(program.offering_institutions)
      ? program.offering_institutions as JsonRecord[]
      : [];

    for (const offering of offerings) {
      institutionKeys.add(
        normalized(
          [
            offering.university,
            offering.institution,
            offering.campus,
          ].join("|"),
        ),
      );
    }
  }

  let title = "Analyse du profil";
  let lead =
    `Moyenne ${calculations.average}/20. ${strengths[0]?.subject ?? "Profil"} est un point fort.`;

  if (mode === "RECOMMENDATIONS") {
    title = "Recommandations";
    lead = visible.length > 0
      ? `${visible.length} recommandations prioritaires ont été classées selon la série et les notes.`
      : "Aucune recommandation n’a été trouvée.";
  } else if (mode === "ELIGIBILITY") {
    title = "Éligibilité indicative";
    lead =
      `${indicativeEligible} filière(s) présentent une compatibilité favorable et ${potential} restent potentielles.`;
  } else if (mode === "OFFICIAL_RANKING") {
    title = "Vérification du classement";
    lead = officialCalculable > 0
      ? `${officialCalculable} filière(s) permettent un calcul de classement avec une formule explicite et les notes disponibles.`
      : "Aucune formule officielle complète n’est actuellement calculable avec les données disponibles.";
  } else if (mode === "UNIVERSITIES") {
    title = "Universités et établissements";
    lead =
      `${institutionKeys.size} université(s) ou établissement(s) proposent les filières prioritaires de ce profil.`;
  }

  const sections: JsonRecord[] = [
    {
      title: "Profil",
      content:
        `Points forts : ${strengths.map((note) => `${note.subject} ${round(note.score)}/20`).join(", ")}.\nÀ renforcer : ${improvements.map((note) => `${note.subject} ${round(note.score)}/20`).join(", ")}.`,
    },
    {
      title: "Calculs",
      content:
        `Médiane ${calculations.median}/20 · régularité ${calculations.standard_deviation <= 2.5 ? "bonne" : "variable"} · minimum ${calculations.minimum}/20 · maximum ${calculations.maximum}/20.`,
    },
  ];

  if (mode === "OFFICIAL_RANKING") {
    sections.push({
      title: "Vérification des formules",
      content:
        `${officialCalculable} calcul(s) possible(s) · ${officialIncomplete} formule(s) incomplète(s). Lorsqu’aucune formule explicite n’est disponible, seul le score indicatif est affiché.`,
    });
  }

  if (mode === "UNIVERSITIES") {
    sections.push({
      title: "Offre de formation",
      content:
        `${institutionKeys.size} université(s) ou établissement(s) distinct(s) ont été regroupés pour les choix affichés.`,
    });
  }

  return {
    answer: `${title}\n\n${lead}`,
    summary:
      `${notes.length} note(s) · moyenne ${calculations.average}/20 · ${visible.length} résultat(s)`,
    sections,
    programs: visible,
    analysis: {
      ...calculations,
      strengths,
      improvements,
      recommendations_count: recommendations.length,
      indicative_eligible_count: indicativeEligible,
      potential_count: potential,
      official_calculable_count: officialCalculable,
      official_incomplete_count: officialIncomplete,
      institutions_count: institutionKeys.size,
    },
    follow_up_suggestions: [
      "Compare les trois premiers choix",
      "Vérifie les calculs de classement possibles",
      "Montre les universités qui proposent ces filières",
    ],
    publication_mode: catalog.publicationMode,
  };
}



function intentOf(message: string) {
  const text = normalized(message);

  if (/^(bonjour|bonsoir|salut|hello|coucou)\b/.test(text)) return "GREETING";
  if (/aide|comment utiliser|que peux tu faire/.test(text)) return "HELP";
  if (/classement|calcul officiel|moyenne de classement|coefficient/.test(text)) {
    return "OFFICIAL_RANKING";
  }
  if (/universit|etablissement|ecole|ou etudier|qui forme|formations? disponibles?/.test(text)) {
    return "UNIVERSITIES";
  }
  if (/eligib|admissib|puis je acceder|ai je le profil/.test(text)) {
    return "ELIGIBILITY";
  }
  if (/recommand|meilleur choix|orientation personnalisee/.test(text)) {
    return "RECOMMENDATIONS";
  }
  if (/analyse|profil|points forts|faiblesses|mes notes/.test(text)) {
    return "ANALYSIS";
  }
  if (/compare|difference|meilleur entre/.test(text)) return "COMPARE";
  if (/quota|bourse|aide|fpp|fep/.test(text)) return "QUOTA";
  if (/metier|debouche|carriere|emploi/.test(text)) return "OUTCOMES";
  if (/moyenne|formule|calcul/.test(text)) return "CALCULATION";
  if (/verifie|verifier/.test(text)) return "VERIFY";

  return "SEARCH";
}


function detailedSearchAnswer(
  programs: JsonRecord[],
  selectedSeries: string | null,
  intent: string,
) {
  if (programs.length === 0) {
    return {
      answer:
        "Je n’ai pas trouvé de résultat assez proche. Essaie un nom de filière, un métier ou un domaine plus court.",
      summary: "Aucun résultat.",
      sections: [
        {
          title: "Exemples",
          content:
            "Informatique Bac D · filières de santé · métiers de la géographie · Génie civil.",
        },
      ],
    };
  }

  const top = programs.slice(0, 3);
  const names = top
    .map((program) => sanitizeText(program.name, 150))
    .filter(Boolean);

  let answer =
    `${programs.length} filière(s) trouvée(s)${selectedSeries ? ` pour le Bac ${selectedSeries}` : ""}.`;

  if (names.length > 0) {
    answer += `\n\nEn priorité : ${names.join(" · ")}.`;
  }

  if (intent === "QUOTA") {
    answer += "\n\nLes quotas disponibles sont visibles dans chaque carte.";
  } else if (intent === "OUTCOMES") {
    answer += "\n\nOuvre une carte pour voir les métiers et débouchés.";
  }

  return {
    answer,
    summary:
      `${programs.length} résultat(s) · ${top.length} choix prioritaires`,
    sections: [],
  };
}

async function safeLogConversation(
  admin: SupabaseClientLike,
  userId: string | null,
  sessionId: string,
  message: string,
  answer: string,
  payload: JsonRecord,
) {
  if (!userId) return;

  try {
    await withTimeout(
      admin.from("apresbac_chat_sessions").upsert({
        id: sessionId,
        user_id: userId,
        title: "Conversation AprèsBac IA",
        bac_series: payload.bac_series,
        preview_mode: false,
        updated_at: new Date().toISOString(),
      }),
      4000,
      "SESSION_LOG",
    );

    await withTimeout(
      admin.from("apresbac_chat_messages").insert([
        {
          session_id: sessionId,
          user_id: userId,
          role: "user",
          content: message,
          payload,
        },
        {
          session_id: sessionId,
          user_id: userId,
          role: "assistant",
          content: answer,
          payload,
        },
      ]),
      4000,
      "MESSAGE_LOG",
    );
  } catch (error) {
    console.warn("non-blocking chat log", cleanError(error));
  }
}


async function deleteRowsBestEffort(
  admin: SupabaseClientLike,
  table: string,
  column: string,
  value: string,
) {
  try {
    const result = await withTimeout(
      admin.from(table).delete().eq(column, value),
      5000,
      `RESET_${table.toUpperCase()}`,
    ) as JsonRecord;

    return {
      table,
      ok: !result.error,
      error: result.error ? cleanError(result.error) : null,
    };
  } catch (error) {
    return {
      table,
      ok: false,
      error: cleanError(error),
    };
  }
}

async function resetUserData(
  admin: SupabaseClientLike,
  userId: string | null,
  includeProfile: boolean,
) {
  if (!userId) {
    return {
      cloud_reset: false,
      anonymous_mode: true,
      results: [],
    };
  }

  const results: JsonRecord[] = [];

  results.push(
    await deleteRowsBestEffort(
      admin,
      "apresbac_chat_messages",
      "user_id",
      userId,
    ),
  );
  results.push(
    await deleteRowsBestEffort(
      admin,
      "apresbac_chat_sessions",
      "user_id",
      userId,
    ),
  );

  if (includeProfile) {
    results.push(
      await deleteRowsBestEffort(
        admin,
        "apresbac_student_subject_results",
        "user_id",
        userId,
      ),
    );
    results.push(
      await deleteRowsBestEffort(
        admin,
        "apresbac_ocr_extractions",
        "user_id",
        userId,
      ),
    );
    results.push(
      await deleteRowsBestEffort(
        admin,
        "apresbac_student_profiles",
        "user_id",
        userId,
      ),
    );
  }

  return {
    cloud_reset: results.some((item) => item.ok === true),
    anonymous_mode: false,
    results,
  };
}

Deno.serve(async (request) => {
  const startedAt = Date.now();
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      request_id: requestId,
      error: "METHOD_NOT_ALLOWED",
      message: "Méthode non autorisée.",
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(200, {
      ok: false,
      request_id: requestId,
      error: "SUPABASE_CONFIG_MISSING",
      message:
        "Le service AprèsBac IA n’est pas correctement configuré sur Supabase.",
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let stage = "INITIALIZATION";

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    let userId: string | null = null;

    if (authorization.startsWith("Bearer ")) {
      const token = authorization.slice("Bearer ".length);

      try {
        const authResult = await withTimeout(
          admin.auth.getUser(token),
          5000,
          "AUTH_USER",
        ) as {
          data: { user: { id: string } | null };
          error: unknown;
        };

        if (!authResult.error && authResult.data.user) {
          userId = authResult.data.user.id;
        }
      } catch (error) {
        console.warn("anonymous fallback", cleanError(error));
      }
    }

    const body = await request.json().catch(() => ({} as JsonRecord));
    const action = sanitizeText(body.action || "chat", 40).toLowerCase();
    const clientRequestId = sanitizeText(body.request_id, 100) || requestId;
    const context =
      body.context && typeof body.context === "object"
        ? body.context as JsonRecord
        : {};
    const maxResults = Math.max(
      3,
      Math.min(
        Number(context.max_results ?? body.max_results ?? 12) || 12,
        20,
      ),
    );

    const finish = (payload: JsonRecord) =>
      jsonResponse(200, {
        request_id: clientRequestId,
        function_version: VERSION,
        duration_ms: Date.now() - startedAt,
        ...payload,
      });

    if (action === "health") {
      stage = "HEALTH";
      const catalog = await loadCatalog(admin);

      return finish({
        ok: true,
        action,
        status: "ONLINE",
        message: "AprèsBac IA est opérationnel.",
        catalog: {
          programs: catalog.rows.length,
          publication_mode: catalog.publicationMode,
          cache_age_ms: Date.now() - catalog.loadedAt,
        },
        capabilities: [
          "PUBLIC_SEARCH",
          "DETAILED_RESPONSES",
          "LOCAL_NOTES",
          "CLOUD_SYNC_BEST_EFFORT",
          "PROFILE_ANALYSIS",
          "QUOTAS",
          "OUTCOMES",
          "CALCULATIONS",
          "RECOMMENDATIONS",
          "INDICATIVE_ELIGIBILITY",
          "OFFICIAL_RANKING_VERIFICATION",
          "OFFERING_UNIVERSITIES",
          "RESET_CHAT",
          "FOLLOW_UP_SUGGESTIONS",
        ],
      });
    }

    if (action === "catalog_stats") {
      stage = "CATALOG_STATS";
      const catalog = await loadCatalog(admin);
      const series = new Set<string>();

      for (const row of catalog.rows) {
        for (const item of recordSeries(row)) series.add(item);
      }

      return finish({
        ok: true,
        action,
        stats: {
          published_programs: catalog.rows.length,
          series_count: series.size,
          academic_year: "2025-2026",
          publication_mode: catalog.publicationMode,
        },
      });
    }

    if (action === "subject_suggestions") {
      stage = "SUBJECT_SUGGESTIONS";
      const selectedSeries = detectSeries(
        "",
        body.bac_series,
      );
      const catalog = await loadCatalog(admin);
      const suggestions = new Set<string>();

      for (const row of catalog.rows) {
        if (!seriesMatches(row, selectedSeries)) continue;

        for (
          const subject of subjectsForSeries(
            row.subjects_by_series,
            row.subjects_source,
            selectedSeries,
          )
        ) {
          suggestions.add(subject);
        }
      }

      return finish({
        ok: true,
        action,
        suggestions: [...suggestions].sort().slice(0, 50),
      });
    }

    if (action === "get_profile") {
      stage = "GET_PROFILE";
      const notes = await getStoredNotes(admin, userId);

      return finish({
        ok: true,
        action,
        profile: {
          notes: notes.map((note) => ({
            subject: note.subject,
            score: note.score,
            confidence: note.confidence,
          })),
          synced_to_cloud: userId != null,
          anonymous_mode: userId == null,
        },
      });
    }


    if (action === "reset_chat" || action === "reset_all") {
      stage = "RESET";
      const includeProfile = action === "reset_all";
      const result = await resetUserData(
        admin,
        userId,
        includeProfile,
      );

      return finish({
        ok: true,
        action,
        result,
        message: includeProfile
          ? "Les recherches, le chat et les notes ont été réinitialisés."
          : "Les recherches et le chat ont été réinitialisés.",
      });
    }

    if (action === "save_notes") {
      stage = "SAVE_NOTES";
      const selectedSeries = detectSeries("", body.bac_series);
      const notes = buildNotes(body.notes);

      if (!selectedSeries) {
        return finish({
          ok: false,
          action,
          error: "BAC_SERIES_REQUIRED",
          message: "Sélectionne d’abord la série du Bac.",
          stage,
        });
      }

      if (notes.length === 0) {
        return finish({
          ok: false,
          action,
          error: "INVALID_NOTES",
          message: "Aucune note valide sur 20 n’a été reçue.",
          stage,
        });
      }

      const sync = await saveNotesBestEffort(
        admin,
        userId,
        selectedSeries,
        notes,
        sanitizeText(body.source || "MANUAL", 20).toUpperCase(),
      );

      return finish({
        ok: true,
        action,
        result: {
          saved_count: notes.length,
          local_storage_expected: true,
          ...sync,
        },
        message: sync.synced_to_cloud === true
          ? "Notes enregistrées localement et synchronisées avec Supabase."
          : "Notes enregistrées localement. L’analyse fonctionne même sans synchronisation cloud.",
      });
    }

    if (
      action === "analyze_profile" ||
      action === "recommendations" ||
      action === "eligibility" ||
      action === "official_ranking" ||
      action === "universities"
    ) {
      stage = "PROFILE_ANALYSIS";
      const selectedSeries = detectSeries("", body.bac_series);
      const result = await analyzeProfile(
        admin,
        userId,
        selectedSeries,
        body.notes,
        maxResults,
        action === "recommendations"
          ? "RECOMMENDATIONS"
          : action === "eligibility"
          ? "ELIGIBILITY"
          : action === "official_ranking"
          ? "OFFICIAL_RANKING"
          : action === "universities"
          ? "UNIVERSITIES"
          : "ANALYSIS",
      );

      return finish({
        ok: true,
        action,
        bac_series: selectedSeries,
        ...result,
        disclaimer:
          "Les calculs sont vérifiés lorsqu’une formule explicite est disponible. La décision finale dépend des critères et places officiels.",
      });
    }

    stage = "CHAT_INPUT";
    const message = sanitizeText(body.message, 1000);

    if (!message) {
      return finish({
        ok: false,
        action,
        error: "MESSAGE_REQUIRED",
        message: "Écris une question avant d’envoyer.",
        stage,
      });
    }

    const selectedSeries = detectSeries(message, body.bac_series);
    const sessionId =
      sanitizeText(body.session_id, 80) || crypto.randomUUID();
    const intent = intentOf(message);

    if (intent === "GREETING" || intent === "HELP") {
      const answer = [
        "Bonjour, je suis AprèsBac IA.",
        "Je peux rechercher les filières, analyser les notes, classer les recommandations, vérifier les calculs de classement possibles et présenter les universités qui proposent chaque formation.",
        "Exemples : « filières de santé Bac D », « métiers après Géographie », « quota Génie civil » ou « analyse mon profil ».",
      ].join("\n\n");

      return finish({
        ok: true,
        action: "chat",
        session_id: sessionId,
        intent,
        answer,
        summary: "Présentation des capacités d’AprèsBac IA.",
        sections: [
          {
            title: "Recherche",
            content:
              "Filières, universités, établissements, séries, métiers, débouchés et quotas.",
          },
          {
            title: "Analyse",
            content:
              "Moyenne, médiane, régularité, classement calculable, points forts, matières à renforcer et recommandations classées.",
          },
        ],
        programs: [],
        follow_up_suggestions: [
          "Présente-moi les filières compatibles avec ma série",
          "Quels métiers puis-je exercer après une filière de santé ?",
          "Analyse mon profil à partir de mes notes",
        ],
      });
    }

    if (
      intent === "ANALYSIS" ||
      intent === "RECOMMENDATIONS" ||
      intent === "ELIGIBILITY" ||
      intent === "OFFICIAL_RANKING" ||
      intent === "UNIVERSITIES"
    ) {
      stage = "CHAT_ANALYSIS";
      const result = await analyzeProfile(
        admin,
        userId,
        selectedSeries,
        body.notes,
        maxResults,
        intent,
      );

      return finish({
        ok: true,
        action: "chat",
        session_id: sessionId,
        intent,
        bac_series: selectedSeries,
        ...result,
        disclaimer:
          "Les calculs sont vérifiés lorsqu’une formule explicite est disponible. La décision finale dépend des critères et places officiels.",
      });
    }

    stage = "CATALOG_SEARCH";
    const search = await searchCatalog(
      admin,
      message,
      selectedSeries,
      maxResults,
    );
    const response = detailedSearchAnswer(
      search.programs,
      selectedSeries,
      intent,
    );

    const followUps = search.programs.length > 0
      ? [
        "Compare les trois premiers résultats",
        "Explique les matières de classement",
        "Présente les débouchés et les métiers",
        "Montre les filières avec les meilleurs quotas de bourse",
      ]
      : [
        "Présente-moi toutes les filières compatibles avec ma série",
        "Recherche les filières de santé",
        "Recherche les filières d’informatique",
      ];

    void safeLogConversation(
      admin,
      userId,
      sessionId,
      message,
      response.answer,
      {
        bac_series: selectedSeries,
        intent,
        program_ids: search.programs.map((program) => program.id),
        request_id: clientRequestId,
      },
    );

    return finish({
      ok: true,
      action: "chat",
      session_id: sessionId,
      intent,
      bac_series: selectedSeries,
      ...response,
      programs: search.programs,
      follow_up_suggestions: followUps,
      meta: {
        catalog_count: search.totalCatalog,
        result_count: search.programs.length,
        publication_mode: search.publicationMode,
        response_profile:
          context.response_profile ?? "PROFESSIONAL_DETAILED",
        logging_mode: "BEST_EFFORT_NON_BLOCKING",
      },
      disclaimer:
        "Vérifie toujours le choix final dans le processus officiel.",
    });
  } catch (error) {
    console.error("waouh-apresbac-chat", {
      requestId,
      stage,
      error: cleanError(error),
    });

    return jsonResponse(200, {
      ok: false,
      request_id: requestId,
      function_version: VERSION,
      duration_ms: Date.now() - startedAt,
      error: "APRESBAC_OPERATION_FAILED",
      message:
        "AprèsBac IA n’a pas pu terminer cette opération. La requête a été libérée : tu peux immédiatement réessayer.",
      technical_message: cleanError(error),
      stage,
      retryable: true,
    });
  }
});
