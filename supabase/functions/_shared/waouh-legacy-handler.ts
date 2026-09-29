// WAOUH — Anciens gestionnaires d'intention (sell/buy/negotiate) retirés (E8).
// Ils dépendaient de LOVABLE_API_KEY et de la colonne waouh_users.phone (devenue phone_number) : tout appel échouait.
// Le chemin canonique est waouh-channel-in (Web et Flutter). 410 explicite plutôt qu'une erreur 500 opaque.

export const LEGACY_HANDLER_REPLACEMENT = "waouh-channel-in";

export function legacyHandlerResponse(name: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ ok: false, code: "handler_retired", handler: name, use: LEGACY_HANDLER_REPLACEMENT }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
