// Espace de chat (web) : conversation au premier plan ; Échanges / Statuts / Radar dans un tiroir à la demande.
// Fonctions pures (testées) : mode d'affichage selon la largeur, épinglage mémorisé, pastille de non-lu.

export type ChatSpaceMode = "stack" | "drawer" | "pinned";

/** Sous ce seuil : parcours téléphone (liste puis conversation en plein écran). */
export const CHAT_SPACE_DESKTOP_MIN = 768;
/** À partir de ce seuil, le tiroir peut être épinglé à côté de la conversation. */
export const CHAT_SPACE_PIN_MIN = 1280;

/**
 * - < 768 px : `stack` (comportement mobile inchangé).
 * - 768 à 1279 px (tablette, portable 13") : `drawer` (tiroir par-dessus, chat pleine largeur).
 * - ≥ 1280 px : `drawer` par défaut, `pinned` si l'utilisateur a épinglé (colonne fixe à côté du chat).
 * Un épinglage mémorisé ne s'applique jamais sur un écran trop étroit.
 */
export function chatSpaceMode(width: number, pinned: boolean): ChatSpaceMode {
  if (!Number.isFinite(width) || width < CHAT_SPACE_DESKTOP_MIN) return "stack";
  return pinned && width >= CHAT_SPACE_PIN_MIN ? "pinned" : "drawer";
}

const PIN_KEY = "waouh_chat_drawer_pinned";

export function readDrawerPinned(storage: Pick<Storage, "getItem"> | null = safeStorage()): boolean {
  try { return storage?.getItem(PIN_KEY) === "1"; } catch { return false; }
}

export function writeDrawerPinned(value: boolean, storage: Pick<Storage, "setItem" | "removeItem"> | null = safeStorage()): void {
  try { if (value) storage?.setItem(PIN_KEY, "1"); else storage?.removeItem(PIN_KEY); } catch { /* stockage indisponible : le réglage reste pour la session */ }
}

function safeStorage(): Storage | null {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

/** Pastille de non-lu : rien à 0, le chiffre jusqu'à 9, « 9+ » au-delà (plus de « 99+ » qui ne dit plus rien). */
export function unreadBadge(count: number): string | null {
  const n = Number.isFinite(count) ? Math.floor(count) : 0;
  if (n <= 0) return null;
  return n > 9 ? "9+" : String(n);
}
