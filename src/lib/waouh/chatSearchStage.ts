import type { ChatSearch } from "@/components/waouh/WaouhChatSearchWindow";

/** Étapes du parcours, de la demande à l'échange. */
export const SEARCH_STAGES = ["Demande", "Recherche", "Analyse", "Offres", "Échange"] as const;

/** Étape en cours : la recherche tourne, l'analyse se révèle, puis les offres sont prêtes. */
export function searchStage(search: Pick<ChatSearch, "status" | "results"> | null, revealed: boolean): number {
  if (!search) return 0;
  if (search.status === "running") return 1;
  if (!revealed) return 2;
  return search.results.length ? 3 : 2;
}
