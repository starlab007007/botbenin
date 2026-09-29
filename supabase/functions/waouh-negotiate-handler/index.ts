// Retiré (E8) : voir _shared/waouh-legacy-handler.ts. Utiliser waouh-channel-in.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { legacyHandlerResponse } from '../_shared/waouh-legacy-handler.ts';

Deno.serve((req) => req.method === 'OPTIONS'
  ? new Response('ok', { headers: corsHeaders })
  : legacyHandlerResponse('waouh-negotiate-handler', corsHeaders));
