/**
 * Temporary production aliases used while the Supabase project is at its
 * Edge Function quota. Each alias points to the newly validated WAOUH code
 * deployed over an unused legacy/test function slot.
 *
 * Remove these aliases once dedicated function slots are available again.
 */
export const WAOUH_RUNTIME_ENDPOINTS = {
  agenticCore: "waouh-studio-e2e-v21465",
  nativeMessagingSettings: "waouh-bots-backend-health-v1",
  nativeOpenMessages: "waouh-chat-health",
} as const;
