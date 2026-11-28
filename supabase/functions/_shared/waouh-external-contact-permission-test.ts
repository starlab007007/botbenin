import assert from "node:assert/strict";
import { consentAllows, contactPurposeFor, permitsExternalWhatsApp, purposeFromPayload, roomGuestBasisAllowed } from "./waouh-external-contact-permission.ts";

Deno.test("prospection stays strict: explicit consent and verified reachability only", () => {
  const ok = { channel: "whatsapp", consent_state: "opt_in", contactability_level: "C3" };
  assert.equal(permitsExternalWhatsApp(ok), true);
  for (const state of ["public_business", "initiated", "unknown", "revoked"]) assert.equal(permitsExternalWhatsApp({ ...ok, consent_state: state }), false, state);
  assert.equal(permitsExternalWhatsApp({ ...ok, contactability_level: "C1" }), false);
});

Deno.test("answering a published offer: consented contacts and public businesses, never unknown or revoked", () => {
  const pro = { channel: "whatsapp", consent_state: "public_business", contactability_level: "C1" };
  assert.equal(permitsExternalWhatsApp(pro, "offer_request"), true);
  assert.equal(permitsExternalWhatsApp({ ...pro, consent_state: "initiated" }, "offer_request"), true);
  assert.equal(permitsExternalWhatsApp({ ...pro, consent_state: "unknown" }, "offer_request"), false);
  assert.equal(permitsExternalWhatsApp({ ...pro, consent_state: "revoked" }, "offer_request"), false);
  assert.equal(permitsExternalWhatsApp({ ...pro, channel: "phone" }, "offer_request"), false);
  assert.equal(permitsExternalWhatsApp({ ...pro, contactability_level: "C0" }, "offer_request"), false);
});

Deno.test("purpose comes from the mandate and is strict when absent", () => {
  assert.equal(contactPurposeFor("buy"), "offer_request");
  assert.equal(contactPurposeFor("ask"), "offer_request");
  assert.equal(contactPurposeFor("sell"), "prospection");
  assert.equal(purposeFromPayload(undefined), "prospection");
  assert.equal(purposeFromPayload("anything"), "prospection");
  assert.equal(consentAllows("public_business"), false);
});

Deno.test("room first contact: a number merely published by a private seller is not consent", () => {
  for (const basis of ["partner", "listing_owner", "public_business", "initiated"]) assert.equal(roomGuestBasisAllowed(basis, "offer_request"), true, basis);
  assert.equal(roomGuestBasisAllowed("listing_contact", "offer_request"), false);
  assert.equal(roomGuestBasisAllowed(null, "offer_request"), false);
  assert.equal(roomGuestBasisAllowed("public_business", "prospection"), false);
  assert.equal(roomGuestBasisAllowed("partner", "prospection"), true);
});
