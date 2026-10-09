/**
 * Règle produit : chaque nouvelle demande (recherche, conseil, aide, intention
 * lancée depuis un autre écran) ouvre une NOUVELLE fenêtre de chat, au lieu de
 * s'ajouter à l'historique de la conversation en cours. L'historique reste
 * conservé côté serveur ; seul l'affichage repart d'une page blanche.
 */
export const isDesktopViewport = () => typeof window !== "undefined" && window.innerWidth >= 1180;

/** Route du chat mobile/tablette ouvrant un fil neuf, avec le texte prérempli. */
export function newChatRoute(prompt?: string): string {
  const params = new URLSearchParams({ new: "1" });
  const text = prompt?.trim();
  if (text) params.set("prefill", text);
  return `/app/chat/waouh?${params.toString()}`;
}

/** Ouvre un nouveau chat avec une demande, selon le palier d'écran. */
export function openNewChat(navigate: (to: string) => void, prompt: string): void {
  if (isDesktopViewport()) {
    navigate("/");
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("waouh:avatar-ask", { detail: { prompt } }));
    }, 80);
    return;
  }
  navigate(newChatRoute(prompt));
}
