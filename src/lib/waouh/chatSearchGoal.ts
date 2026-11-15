/** Une demande de recherche (achat, vente, demande) ouvre sa propre fenêtre « Recherche live ». */
const SEARCH_GOAL_RE = /\b(cherche|chercher|recherche|rechercher|acheter|achète|achete|trouve|trouver|trouvez|vends?|vendre|acheteurs?|vendeurs?|besoin\s+d)/i;
const NOT_A_SEARCH_RE = /^\s*(annuler|question\s*\d|je\s+propose|je\s+suis\s+int[ée]ress|oui\b|non\b|ok\b|merci)/i;
export function isChatSearchGoal(text: string, meta: Record<string, unknown> = {}, hasAttachments = false): boolean {
  if (meta.commerce_action || meta.button_payload || meta.action_id) return false;
  const t = text.trim();
  if (t.length < 4 || NOT_A_SEARCH_RE.test(t)) return false;
  return SEARCH_GOAL_RE.test(t) && !hasAttachments;
}
