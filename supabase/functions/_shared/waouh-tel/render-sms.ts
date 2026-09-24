import type { TelOutboundPayload, WaouhEngineReply } from "./types.ts";

const GSM_BASIC =
  /^[\x0A\x0D\x20-\x7E£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉÄÖÑÜ§¿äöñüà€]*$/;
const GSM_EXTENDED = new Set([..."^{}\\[~]|€"]);

function money(value: number | null | undefined, currency = "XOF") {
  if (value == null || !Number.isFinite(Number(value))) {
    return "Prix à discuter";
  }
  return `${Number(value).toLocaleString("fr-FR")} ${
    currency === "XOF" ? "F CFA" : currency
  }`;
}

export function renderSmsFromEngine(
  reply: WaouhEngineReply,
): TelOutboundPayload {
  const lines = [reply.text.trim()];
  if (reply.products.length) {
    lines.push(
      "",
      ...reply.products.slice(0, 5).map((product, index) => {
        const city = product.city ? ` — ${product.city}` : "";
        return `${index + 1}. ${product.title || "Article"} — ${
          money(product.price, product.currency)
        }${city}`;
      }),
    );
    lines.push("", "Répondez avec le numéro de votre choix.");
  } else if (reply.actions.length) {
    lines.push(
      "",
      ...reply.actions.slice(0, 8).map((action, index) =>
        `${index + 1}. ${
          action.label || action.title || action.value || "Choisir"
        }`
      ),
    );
  }
  const mediaUrls = [
    ...reply.attachments.map((attachment) => attachment.url),
    ...reply.products.flatMap((product) =>
      product.photos || (product.image_url ? [product.image_url] : [])
    ),
  ].filter((url, index, all) =>
    /^https:\/\//i.test(url) && all.indexOf(url) === index
  ).slice(0, 3);
  if (mediaUrls.length) lines.push("", `Photos : ${mediaUrls.join(" ")}`);
  return {
    schema: "waouh.tel.outbound.v1",
    text: lines.filter((line, index, all) =>
      !(line === "" && all[index - 1] === "")
    ).join("\n").trim().slice(0, 1600),
    products: reply.products,
    actions: reply.actions,
    attachments: reply.attachments,
    metadata: { rendered_for: "sms" },
  };
}

export function ensureSmsPayload(payload: TelOutboundPayload) {
  if (
    payload.metadata?.rendered_for === "sms" ||
    (!payload.products?.length && !payload.actions?.length &&
      !payload.attachments?.length)
  ) return payload;
  return renderSmsFromEngine({
    schema: "waouh.message.v1",
    text: payload.text,
    products: payload.products || [],
    actions: payload.actions || [],
    attachments: payload.attachments || [],
  });
}

export function segmentSms(text: string) {
  const clean = text.replace(/\r\n/g, "\n").trim();
  const gsm = GSM_BASIC.test(clean);
  const singleLimit = gsm ? 160 : 70;
  const multipartLimit = gsm ? 153 : 67;
  const units = (value: string) =>
    [...value].reduce(
      (sum, char) => sum + (gsm && GSM_EXTENDED.has(char) ? 2 : 1),
      0,
    );
  if (units(clean) <= singleLimit) return [clean];

  const capSegments = (chunks: string[]) => {
    const maximum = 10;
    if (chunks.length <= maximum) return chunks;
    const kept = chunks.slice(0, maximum - 1).map((chunk, index) =>
      `(${index + 1}/${maximum}) ${chunk.replace(/^\(\d+\/\d+\)\s*/, "")}`
    );
    return [
      ...kept,
      `(${maximum}/${maximum}) Suite tronquée pour limiter le coût SMS.`,
    ];
  };

  const split = (expectedCount: number) => {
    const chunks: string[] = [];
    let remaining = clean;
    let index = 1;
    while (remaining) {
      const prefix = `(${index}/${expectedCount}) `;
      const capacity = multipartLimit - units(prefix);
      let consumedUnits = 0;
      let cut = 0;
      let lastBoundary = -1;
      for (const char of remaining) {
        const next = gsm && GSM_EXTENDED.has(char) ? 2 : 1;
        if (consumedUnits + next > capacity) break;
        consumedUnits += next;
        cut += char.length;
        if (/\s/.test(char)) lastBoundary = cut;
      }
      if (lastBoundary >= Math.floor(cut * 0.6) && cut < remaining.length) {
        cut = lastBoundary;
      }
      const chunk = remaining.slice(0, Math.max(1, cut)).trim();
      chunks.push(`${prefix}${chunk}`);
      remaining = remaining.slice(Math.max(1, cut)).trim();
      index += 1;
    }
    return chunks;
  };

  let expected = Math.max(2, Math.ceil(units(clean) / (multipartLimit - 8)));
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const chunks = split(expected);
    if (chunks.length === expected) return capSegments(chunks);
    expected = chunks.length;
  }
  return capSegments(split(expected));
}
