// WAOUH — mise en forme premium des messages WhatsApp.
// WhatsApp ne rend ni le Markdown (**gras**, # titres, tableaux) ni le HTML : seuls
// *gras*, _italique_, ~barré~, ```code```, "> citation" et les listes sont natifs.
// Ce module convertit n'importe quel texte de réponse vers cette syntaxe, sans changer le sens.
// Il est idempotent : richWhatsAppText(richWhatsAppText(x)) === richWhatsAppText(x).

const SEP = "━━━━━━━━━━━━━━━━━━";
const KEYCAPS = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const DEFAULT_TAGLINE = "WAOUH · bot.bj";

export interface RichWhatsAppOptions {
  /** false : aucune signature. Texte : signature personnalisée. Par défaut : signature sur les messages d'au moins 4 lignes. */
  footer?: boolean | string;
  /** Nombre minimal de lignes non vides pour ajouter la signature. */
  minLinesForFooter?: number;
}

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const AMOUNT = /(?<![\w*])(\d{1,3}(?:[   .]\d{3})+|\d+)\s?(FCFA|F\s?CFA|XOF|CFA)\b/gi;

function boldAmounts(line: string): string {
  // Ne touche ni au texte déjà en gras, ni au code, ni aux liens.
  return line
    .split(/(\*[^*\n]+\*|`[^`\n]+`|https?:\/\/\S+)/)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(AMOUNT, (match) => `*${match.trim()}*`)))
    .join("");
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()).filter(Boolean);
}

function convertLine(rawLine: string): string {
  let line = rawLine.replace(/[ \t]+$/, "");
  // Titres Markdown → ligne en gras.
  line = line.replace(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/, (_m, title) => `*${String(title).replace(/\*/g, "")}*`);
  // Gras / barré Markdown → syntaxe WhatsApp.
  line = line.replace(/\*\*(.+?)\*\*/g, "*$1*").replace(/__(.+?)__/g, "*$1*").replace(/~~(.+?)~~/g, "~$1~");
  // Liens Markdown → texte + URL cliquable.
  line = line.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 → $2");
  // Listes : tirets, étoiles, puces → puce uniforme (retrait conservé pour les sous-listes).
  line = line.replace(/^(\s*)[-*+•]\s+(.+)$/, (_m, indent: string, rest: string) => `${indent.length >= 2 ? "  ◦" : "•"} ${rest}`);
  // Listes numérotées → numéros emoji (1 à 10).
  line = line.replace(/^\s*(\d{1,2})[.)]\s+(.+)$/, (match, n: string, rest: string) => {
    const value = Number(n);
    return value >= 1 && value <= 10 ? `${KEYCAPS[value]} ${rest}` : match;
  });
  // « • Libellé : valeur » → libellé en gras.
  line = line.replace(/^(\s*[•◦]\s+)([^:*\n]{2,28}?)\s*:\s+(?!\/\/)(.+)$/, (match, bullet: string, label: string, value: string) =>
    /https?|\.\w{2,}/.test(label) ? match : `${bullet}*${label.trim()}* : ${value}`);
  return boldAmounts(line);
}

export function richWhatsAppText(input: string, options: RichWhatsAppOptions = {}): string {
  const source = String(input ?? "").replace(/\r\n?/g, "\n").trim();
  if (!source) return source;
  const lines = source.split("\n");
  const converted: string[] = [];
  let inFence = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      converted.push(line.trim());
      continue;
    }
    if (inFence) {
      converted.push(line);
      continue;
    }
    if (line.includes("|") && TABLE_SEPARATOR.test(line)) continue;
    if (TABLE_ROW.test(line)) {
      const cells = tableCells(line);
      const isHeader = index + 1 < lines.length && TABLE_SEPARATOR.test(lines[index + 1]);
      converted.push(isHeader ? `*${cells.join(" · ")}*` : boldAmounts(`• ${cells.join(" · ")}`));
      continue;
    }
    converted.push(convertLine(line));
  }
  let text = converted.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  const contentLines = text.split("\n").filter((line) => line.trim());
  const alreadyDesigned = text.includes(SEP);
  // Phrase d'introduction courte terminée par « : » → titre en gras (message structuré uniquement).
  if (!alreadyDesigned && contentLines.length >= 4) {
    const first = contentLines[0];
    if (first.length <= 80 && first.endsWith(":") && !first.startsWith("*") && !/^[•◦>]/.test(first)) {
      text = text.replace(first, `*${first.slice(0, -1).trim()}*`);
    }
  }

  const footer = options.footer;
  const wantsFooter = footer !== false && !alreadyDesigned && contentLines.length >= (options.minLinesForFooter ?? 4);
  if (wantsFooter) text += `\n\n${SEP}\n_✨ ${typeof footer === "string" && footer ? footer : DEFAULT_TAGLINE}_`;
  return text;
}
