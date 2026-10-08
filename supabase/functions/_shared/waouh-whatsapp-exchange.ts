import {
  createExchangeInvite,
  handleExternalExchange,
} from "./waouh-external-exchange.ts";
import { journeyReplyToken } from "./waouh-avatar-lifecycle.ts";
import { sha256Hex } from "./waouh-tel/crypto.ts";

export function parseWhatsAppExchangeCommand(text: string) {
  const match = text.trim().match(
    /^(SUIVI|STOP|PROPOSER|ACCEPTER|EXPEDIE|RECU|PAYE|PAIEMENT RECU|MESSAGE)\s+(WA-[a-f0-9]{8})(?:\s+([\s\S]+))?$/i,
  );
  if (!match) return null;
  const name = match[1].toUpperCase();
  const reference = match[2].toUpperCase();
  const rest = (match[3] || "").trim();
  if (name === "SUIVI") return { operation: "read", reference };
  if (name === "STOP") return { operation: "stop", reference };
  if (name === "MESSAGE") {
    return { operation: "message", reference, text: rest };
  }
  if (name === "PROPOSER") {
    const terms = rest.match(
      /^(\d+)\s*(?:FCFA|XOF)?\s*\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)$/i,
    );
    if (!terms) {
      throw new Error(
        "Format : PROPOSER " + reference +
          " 25000 FCFA | 1 | Livraison à Cotonou | Paiement après réception",
      );
    }
    return {
      operation: "propose",
      reference,
      terms: {
        amount: Number(terms[1]),
        quantity: Number(terms[2]),
        delivery: terms[3].trim(),
        payment: terms[4].trim(),
      },
    };
  }
  const version = rest.match(/^VERSION-([a-f0-9]{8})$/i)?.[1]?.toLowerCase();
  if (!version) {
    throw new Error(
      "Précisez VERSION-xxxxxxxx affichée dans SUIVI " + reference +
        ". Un simple oui ne confirme aucun accord.",
    );
  }
  const operation = ({
    ACCEPTER: "accept",
    EXPEDIE: "shipment",
    RECU: "receipt",
    PAYE: "payment",
    "PAIEMENT RECU": "payment_received",
  } as Record<string, string>)[name];
  return { operation, reference, version };
}

export function whatsAppExchangeSummary(
  snapshot: any,
  role: "owner" | "counterparty",
) {
  const j = snapshot.journey;
  const reference = journeyReplyToken(j.id);
  const stages: Record<string, string> = {
    waiting_reply: "Réponse attendue",
    negotiating: "Négociation",
    agreed: "Accord confirmé",
    executing: "Exécution",
    completed: "Terminé",
    cancelled: "Arrêté",
  };
  const lines = [
    `*${reference} · ${j.subject || "Votre mission"}*`,
    stages[j.stage] || j.stage,
    `Prochaine étape : ${j.next_action || "Préciser les conditions"}`,
  ];
  const a = snapshot.agreement;
  if (a) {
    const version = "VERSION-" +
      a.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    lines.push(
      `*${a.terms.amount} FCFA · ${a.terms.quantity} unité(s)*`,
      `Livraison : ${a.terms.delivery}`,
      `Paiement : ${a.terms.payment}`,
      version,
    );
    if (j.stage === "negotiating") {
      lines.push(
        `Pour accepter ces conditions : ACCEPTER ${reference} ${version}`,
      );
    }
    if (["agreed", "executing"].includes(j.stage)) {
      const seller = j.mode === "sell"
        ? role === "owner"
        : role === "counterparty";
      lines.push(
        seller
          ? `EXPEDIE ${reference} ${version}\nPAIEMENT RECU ${reference} ${version}`
          : `RECU ${reference} ${version}\nPAYE ${reference} ${version}`,
      );
      lines.push(
        "Ces commandes enregistrent vos confirmations ; elles ne transfèrent aucun argent.",
      );
    }
  } else {lines.push(
      `Pour proposer : PROPOSER ${reference} 25000 FCFA | 1 | Livraison à Cotonou | Paiement après réception`,
    );}
  lines.push(`SUIVI ${reference} · STOP pour arrêter`);
  return lines.join("\n");
}

// Called only after a trusted WAHA event and an exact sender/journey association.
export async function handleWhatsAppExchangeCommand(
  sb: any,
  journey: any,
  role: "owner" | "counterparty",
  text: string,
  messageId: string,
) {
  const command = parseWhatsAppExchangeCommand(text);
  if (!command) return null;
  if (command.reference !== journeyReplyToken(journey.id)) {
    throw new Error("Référence de mission incorrecte.");
  }
  const digest = await sha256Hex(`whatsapp:${journey.id}:${role}:${messageId}`);
  const request_id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${
    digest.slice(13, 16)
  }-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  let agreement_id: string | undefined;
  if (command.version) {
    const { data, error } = await sb.from("waouh_external_agreements").select(
      "id",
    ).eq("journey_id", journey.id).is("superseded_at", null).maybeSingle();
    if (
      error || !data || !data.id.replace(/-/g, "").startsWith(command.version)
    ) {
      throw new Error(
        "Les conditions ont changé. Envoyez SUIVI " + command.reference +
          " avant de confirmer.",
      );
    }
    agreement_id = data.id;
  }
  const invitation = role === "counterparty"
    ? await createExchangeInvite(sb, journey)
    : null;
  const access = invitation
    ? { token: invitation.url.split("#")[1] }
    : { journey_id: journey.id };
  const snapshot = await handleExternalExchange(
    sb,
    `nexus.${role === "owner" ? "external" : "guest"}.${command.operation}`,
    {
      ...access,
      request_id,
      text: command.text || text,
      terms: command.terms,
      agreement_id,
      ...(role === "owner" && command.operation === "message"
        ? { channel: "whatsapp", confirmed: true }
        : {}),
    },
    role === "owner" ? journey.owner_id : undefined,
  );
  if (role === "counterparty" && command.operation !== "read") {
    const { error } = await sb.from("waouh_conversation_bus_events").update({
      channel: "whatsapp",
    })
      .eq("event_type", "nexus.external.message").eq(
        "external_ref",
        `exchange:${journey.id}:counterparty:${request_id}`,
      );
    if (error) throw new Error("whatsapp_exchange_trace_failed");
  }
  if ("stopped" in snapshot && snapshot.stopped) {
    return "Mission arrêtée. Les relances et les liens invités sont désactivés.";
  }
  let deliveryNote = "";
  if (
    role === "owner" && "journey" in snapshot && snapshot.journey.stage !== "completed" && !["read", "message", "stop"].includes(command.operation)
  ) {
    // The explicit WhatsApp command shares this update with the external participant.
    const relayDigest = await sha256Hex(`relay:${journey.id}:${messageId}`);
    const relayId = `${relayDigest.slice(0, 8)}-${relayDigest.slice(8, 12)}-4${
      relayDigest.slice(13, 16)
    }-8${relayDigest.slice(17, 20)}-${relayDigest.slice(20, 32)}`;
    try {
      await handleExternalExchange(sb, "nexus.external.message", {
        journey_id: journey.id,
        request_id: relayId,
        text: "Mise à jour de votre interlocuteur WAOUH :\n" +
          whatsAppExchangeSummary(snapshot, "counterparty"),
        channel: "whatsapp",
        confirmed: true,
      }, journey.owner_id);
      deliveryNote = "\nMise à jour placée dans la file WhatsApp du contact.";
    } catch {
      deliveryNote =
        "\nMise à jour enregistrée. La transmission WhatsApp doit être reprise depuis le chat Web.";
    }
  }
  return whatsAppExchangeSummary(snapshot, role) + deliveryNote;
}
