## Diagnostic

Les deux boutons appellent des edge functions qui ne se chargent jamais :

| UI | Edge function | Logs |
|---|---|---|
| Capture 1 — "Re-sync depuis signaux" (Contacts Radar) | `waouh-radar-api-config` (action `contacts_sync`) | Booted en 24ms puis Shutdown immédiat, **aucun log handler** |
| Capture 2 — boutons SerpAPI / Apify / Process queue (Radar IA admin) | `waouh-serpapi-scout`, `waouh-radar-apify`, `waouh-radar-process` | Mêmes Boot/Shutdown sans handler |

### Cause racine
Les 4 fonctions importent :

```ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
```

Ce sous-chemin **n'existe pas** dans le package `@supabase/supabase-js` (la doc Lovable l'évoque mais le package npm ne l'exporte pas). Deno edge-runtime échoue donc à charger le module avant même d'invoquer le handler → côté client, `supabase.functions.invoke` reçoit une erreur de connexion réseau et le toast affiche "Failed to send a request to the Edge Function".

Les autres fonctions du projet qui marchent (ex. `waouh-channel-in`, `waouh-historique`) **n'utilisent pas** cet import — elles définissent `corsHeaders` inline ou via `_shared/guestTicket.ts`.

## Correction proposée

Dans les 4 fichiers ci-dessous :
- `supabase/functions/waouh-radar-api-config/index.ts`
- `supabase/functions/waouh-radar-process/index.ts`
- `supabase/functions/waouh-serpapi-scout/index.ts`
- `supabase/functions/waouh-radar-apify/index.ts`

Remplacer l'import cassé par une constante locale :

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
```

Aucune autre logique modifiée. Pas de migration SQL. Pas de nouveau secret.

## Vérification
1. Déployer les 4 fonctions.
2. Tester `Re-sync depuis signaux` → réponse JSON (200/4xx structuré) au lieu de "Failed to send…".
3. Tester `Process queue` / `SerpAPI` / `Apify` → idem.
4. Confirmer dans les logs edge l'apparition de logs handler (et non plus seulement Boot/Shutdown).
