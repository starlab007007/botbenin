import { assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isPublicNexusRead, PUBLIC_NEXUS_SOURCES, publicNexusResult } from "./waouh-public-discovery.ts";
Deno.test("anonymous access permits only indexed discovery and source overview", () => {
  assertEquals(isPublicNexusRead("nexus.global_discovery"), true);
  assertEquals(isPublicNexusRead("nexus.sources"), true);
  for (const action of ["mission.list", "mission.create", "nexus.contact.send", "nexus.contact.enrich", "journey.list", "commerce.action", "", "unknown"]) assertFalse(isPublicNexusRead(action));
  for (const source of ["whatsapp", "chat", "shared_by_user", "tiktok_connected", "b2b_rfq"]) assertFalse(PUBLIC_NEXUS_SOURCES.includes(source));
});
Deno.test("public results omit private payloads and redact embedded coordinates", () => {
  const result = publicNexusResult({ fabric_id: "article:fan", subject: "Ventilateur vendeur@example.com +229 01 97 11 22 33", raw_text: "private-description", evidence: { seller_id: "private-owner" }, contact_pack: { phone: "private-phone" }, source_url: "https://example.com/product?token=private-token#private-fragment", scores: { total_score: 80 } });
  const serialized = JSON.stringify(result);
  for (const secret of ["vendeur@example.com", "97 11 22 33", "private-description", "private-owner", "private-phone", "private-token", "private-fragment"]) assertFalse(serialized.includes(secret));
  assertEquals(result.source_url, "https://example.com/product");
  assertEquals(result.contact_policy.can_reveal, false);
  assertEquals(result.contact_policy.can_auto_contact, false);
});
Deno.test("public URLs reject scripts and embedded credentials", () => {
  assertEquals(publicNexusResult({ source_url: "javascript:alert(1)" }).source_url, null);
  assertEquals(publicNexusResult({ source_url: "https://user:secret@example.com/product" }).source_url, null);
});
