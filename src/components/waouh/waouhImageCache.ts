/**
 * Cache mémoire léger pour les photos d'articles WAOUH.
 * Évite de re-télécharger/re-décoder une image déjà vue dans le fil de chat
 * et permet d'afficher un placeholder tant que la photo n'est pas prête.
 */
const loaded = new Set<string>();
const inflight = new Map<string, Promise<boolean>>();

export function isImageReady(url?: string | null): boolean {
  return !!url && loaded.has(url);
}

export function preloadImage(url?: string | null): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (loaded.has(url)) return Promise.resolve(true);
  const existing = inflight.get(url);
  if (existing) return existing;

  const p = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      loaded.add(url);
      inflight.delete(url);
      resolve(true);
    };
    img.onerror = () => {
      inflight.delete(url);
      resolve(false);
    };
    img.src = url;
  });
  inflight.set(url, p);
  return p;
}

/** Précharge la photo suivante/précédente d'un carrousel, sans bloquer le rendu. */
export function prefetchNeighbours(urls: string[], index: number) {
  if (!urls.length) return;
  const next = urls[(index + 1) % urls.length];
  const prev = urls[(index - 1 + urls.length) % urls.length];
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      preloadImage(next);
      preloadImage(prev);
    });
  } else {
    setTimeout(() => {
      preloadImage(next);
      preloadImage(prev);
    }, 200);
  }
}
