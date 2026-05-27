import { KnowledgeBaseTemplate } from '@/types/knowledge-base';

/**
 * Map a knowledge-base table id to its Google Sheet name.
 * Tries case-insensitive match on table.id, then table.name, then positional fallback.
 * Returns null when the table is not backed by a Google Sheet (e.g. local-only FAQ).
 */
export function getSheetNameForTable(
  template: KnowledgeBaseTemplate,
  tableId: string
): string | null {
  if (!template.googleSheetConfig?.sheets?.length) return null;
  const sheets = template.googleSheetConfig.sheets;
  const table = template.tables.find(t => t.id === tableId);
  if (!table) return null;

  const norm = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const tid = norm(table.id);
  const tname = norm(table.name);

  for (const s of sheets) {
    const ns = norm(s);
    if (ns === tid || ns === tname || ns.startsWith(tid) || ns.startsWith(tname)) return s;
  }

  // For whatsapp_diffusion single-table templates, return first sheet
  if (sheets.length === 1) return sheets[0];

  // Positional fallback
  const idx = template.tables.findIndex(t => t.id === tableId);
  if (idx >= 0 && idx < sheets.length) return sheets[idx];

  return null;
}

export function isGoogleSheetTemplate(template: KnowledgeBaseTemplate): boolean {
  return !!template.googleSheetConfig &&
    (template.id === 'ecommerce' || template.id === 'restaurant' || template.id === 'whatsapp_diffusion');
}
