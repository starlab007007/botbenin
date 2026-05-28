# Isolation stricte des sessions WhatsApp IA par utilisateur

## Diagnostic

Les requêtes Supabase sont déjà strictement filtrées par `user_id = auth.uid()` (RLS + code) dans :
- `useWhatsAppAccounts.ts` (ligne 51)
- `WhatsAppScreen.tsx` `loadDb` (ligne 61) et realtime (ligne 75)
- `useDiffusionSessions.ts` (depuis la migration `wa_*_own_only`)

**Le vrai problème** : dans `WhatsAppScreen.tsx` (lignes 83–98), `merged` combine :
- `dbSessions` → propres au user ✅
- `sessions` → sessions live retournées par le serveur WAHA, qui liste **TOUTES les sessions de tous les utilisateurs** (le serveur WAHA ne connaît pas la notion de user Supabase).

Résultat : un utilisateur voit les sessions WhatsApp des autres comptes parce qu'elles remontent via WAHA.

## Correctif

### 1. `src/app-mobile/screens/WhatsAppScreen.tsx`
Filtrer les sessions WAHA live pour ne garder que celles dont le `name` existe dans `dbSessions` du user connecté.

```ts
const merged: WAHASession[] = useMemo(() => {
  const allowed = new Set(dbSessions.map(d => d.session_name));
  const map = new Map<string, WAHASession>();
  for (const db of dbSessions) {
    map.set(db.session_name, { name: db.session_name, status: ..., ... });
  }
  for (const live of sessions) {
    if (!allowed.has(live.name)) continue;   // <- ignore sessions d'autres users
    const prev = map.get(live.name);
    map.set(live.name, { ...prev, ...live, config: { ...prev?.config, ...live.config } });
  }
  return Array.from(map.values());
}, [dbSessions, sessions]);
```

### 2. `src/hooks/useDiffusionSessions.ts`
- Supprimer la branche `shared` (sessions admin partagées) — la migration RLS a déjà purgé `is_admin_shared`, mais le code expose encore `s.shared` consommé par `DiffusionScreen` (section "Partagées admin").
- Retourner uniquement `mine` (sessions du user), retirer `shared` du type retourné.
- Adapter `DiffusionScreen.tsx` (SessionsTab) pour retirer le bloc `s.shared.length > 0` et le badge "Partagée".

### 3. Vérification (lecture seule)
Confirmer qu'aucune autre vue ne contourne le filtre :
- `useWAHADashboard.ts` → utilisé seulement pour l'écran admin/diagnostic, à laisser tel quel mais ne PAS l'utiliser pour rendre des cartes côté user final.

## Fichiers touchés
- `src/app-mobile/screens/WhatsAppScreen.tsx` — filtre `merged` par `allowed`
- `src/hooks/useDiffusionSessions.ts` — suppression `shared`
- `src/app-mobile/screens/DiffusionScreen.tsx` — suppression UI "Partagées admin"

Aucune migration SQL nécessaire (les RLS sont déjà strictes).
