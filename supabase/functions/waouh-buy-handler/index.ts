// Retiré (E8) : voir _shared/waouh-legacy-handler.ts. Utiliser waouh-channel-in.
import { legacyHandlerResponse } from '../_shared/waouh-legacy-handler.ts';

// En-têtes CORS locaux : aucun import de paquet npm (le `deno check` de la CI ne résout pas le sous-chemin /cors seul).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-waouh-session',
};

Deno.serve((req) => req.method === 'OPTIONS'
  ? new Response('ok', { headers: corsHeaders })
  : legacyHandlerResponse('waouh-buy-handler', corsHeaders));
