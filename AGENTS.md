
- Search fallback per journey lives in `supabase/functions/_shared/waouh-track-sources.ts` (min results, neighbor cities, live sources); `nexus.global_discovery` returns `fallback` so Web and Flutter never show a bare zero. Why: one rule set for every journey and both clients.
