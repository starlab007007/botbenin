// Mémoire très courte, propre à chaque instance de fonction : évite de refaire à chaque message
// les mêmes vérifications (identité, droits du module). Un changement d'administration
// s'applique au plus tard à l'expiration (quelques secondes).
type Entry<T> = { value: T; expires: number };

export function createTtlCache<T>(ttlMs: number, maxEntries = 500) {
  const store = new Map<string, Entry<T>>();
  return {
    get(key: string): T | undefined {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expires < Date.now()) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: T) {
      if (store.size >= maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, { value, expires: Date.now() + ttlMs });
    },
    clear() {
      store.clear();
    },
  };
}

/** Évite que deux requêtes simultanées identiques fassent deux appels : la seconde attend la première. */
export function dedupeInflight<T>(map: Map<string, Promise<T>>, key: string, run: () => Promise<T>): Promise<T> {
  const running = map.get(key);
  if (running) return running;
  const promise = run().finally(() => map.delete(key));
  map.set(key, promise);
  return promise;
}
