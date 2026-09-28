// WAOUH — wrapper canonique du point d'entrée Commerce V3.
// Le handler est partagé avec waouh-channel-in-secure afin de fonctionner
// même lorsque le quota Supabase empêche la création d'un nouveau slug.
import { handleCommerceAction } from "../_shared/waouh-commerce-action-handler.ts";

Deno.serve(handleCommerceAction);
