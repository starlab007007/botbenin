import type { TelOutboundPayload, WaouhEngineReply } from "./types.ts";

export function renderRcsFromEngine(
  reply: WaouhEngineReply,
): TelOutboundPayload {
  const products = reply.products.slice(0, 10).map((product) => ({
    ...product,
    photos: (product.photos || (product.image_url ? [product.image_url] : []))
      .filter((url) => /^https:\/\//i.test(url)).slice(0, 3),
  }));
  const actions = reply.actions.slice(0, 11).map((action, index) => ({
    ...action,
    id: action.id || action.value || `action_${index + 1}`,
    label:
      (action.label || action.title || action.value || `Choix ${index + 1}`)
        .slice(0, 25),
  }));
  return {
    schema: "waouh.tel.outbound.v1",
    text: reply.text.trim().slice(0, 3072),
    products,
    actions,
    attachments: reply.attachments.filter((attachment) =>
      /^https:\/\//i.test(attachment.url)
    ).slice(0, 10),
    metadata: { rendered_for: "rcs" },
  };
}
