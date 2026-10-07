/**
 * Production web test rollout marker: Native SMS/RCS + WAOUH Muse.
 * Runtime endpoints used by the Web client.
 * Agentic Core still uses its validated production alias; Opportunity Worker
 * now has a dedicated production slug and must never fall back to an E2E stub.
 */
export const WAOUH_RUNTIME_ENDPOINTS = {
  agenticCore: "waouh-studio-e2e-v21465",
  opportunityWorker: "waouh-opportunity-worker",
  nativeMessagingSettings: "waouh-bots-backend-health-v1",
  nativeOpenMessages: "waouh-chat-health",
  nativeSimulator: "chat-webhook",
  adminE2ERunner: "setup-test-accounts",
} as const;