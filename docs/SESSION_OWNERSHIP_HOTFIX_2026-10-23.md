# Session ownership hotfix — rollout order
This SQL + Edge change has been validated on the isolated E2E project. It has not been applied to production by this audit.

1. Apply migration `supabase/migrations/20261023122055_waouh_session_ownership_guard.sql`.
2. Verify the internal RPC is executable only by `service_role`; both public client roles must be denied.
3. Deploy all five endpoints that use the ownership guard:
   - `waouh-history`
   - `waouh-match-history`
   - `waouh-channel-in-secure`
   - `waouh-buyer-interest`
   - `waouh-commerce-action`
4. Deploy the Web bundle with account-cache cleanup, then build/release Flutter from the reviewed source.
5. Verify legitimate owner access, legitimate unclaimed guest access, rejection of a foreign or logged-out claimed session, rejection of direct REST reads using a foreign session header, and prevention of identity reassignment.
6. Recheck chat history separation, retries, sign-out and sign-in. Do not send real WhatsApp messages in this recipe.

The private RLS helper checks both identity ownership and message ownership. This covers Avatar briefing sessions that have messages but no identity row with the same session id. Existing permissive policies remain in place; a restrictive guard is added to users, messages, notifications and outbound queue. A claimed identity also gets a row-owner condition on its session-link UPDATE policy.

The Edge guard uses a service-only SECURITY INVOKER RPC. Apply SQL first: deploying the new guard before its RPC would fail closed with a 503 response. Do not remove the SQL guard while the Edge guard is deployed. An application rollback must preserve the security restrictions.

For isolated regression only:
```text
SB_URL=https://ljzwqyzaovnandpyfpgc.supabase.co
SB_ANON_KEY=<publishable test-project key>
node scripts/waouh-chat/recette/verify-session-ownership.mjs
```

The synthetic fixtures used by this test are recorded in the audit deliverables. This script refuses production.
