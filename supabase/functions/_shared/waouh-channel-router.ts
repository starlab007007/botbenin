import { rankChannels, type ChannelCandidate } from "./waouh-opportunity-os.ts";

export type OpportunityRouteMode =
  | "integrated"
  | "automated"
  | "approval"
  | "manual"
  | "unavailable";

export type OpportunityChannelRoute = {
  primary_channel: string | null;
  mode: OpportunityRouteMode;
  can_dispatch: boolean;
  reason: string;
  fallback_channels: string[];
  candidates: Array<ChannelCandidate & { score: number }>;
};

export function routeOpportunityChannel(input: {
  channels: ChannelCandidate[];
  internal?: boolean;
  contactability?: string | null;
  allowWaouh?: boolean;
  allowWhatsapp?: boolean;
  allowPublicBusiness?: boolean;
  allowEmail?: boolean;
  allowSmsRcs?: boolean;
}) : OpportunityChannelRoute {
  const ranked = rankChannels(input.channels ?? []);
  const level = String(input.contactability ?? "C0").toUpperCase();
  const allowed = (row: ChannelCandidate & { score: number }) => {
    const channel = String(row.channel || "").toLowerCase();
    if (channel === "waouh") return input.allowWaouh !== false;
    if (channel === "whatsapp") {
      if (input.allowWhatsapp === false || row.reachable === false) return false;
      if (level === "C1") {
        return input.allowPublicBusiness !== false &&
          (row.public_business === true || row.consent_state === "public_business");
      }
      return ["C2","C3","C4","C5"].includes(level);
    }
    if (channel === "email") return input.allowEmail === true;
    if (channel === "sms" || channel === "rcs" || channel === "sms_rcs") {
      return input.allowSmsRcs === true;
    }
    if (channel === "phone") {
      if (row.reachable === false) return false;
      return level === "C1" && input.allowPublicBusiness !== false && row.public_business === true;
    }
    return false;
  };
  const eligible = ranked.filter(allowed);
  const fallback = eligible.slice(1).map((row) => String(row.channel));

  if (input.internal && input.allowWaouh !== false) {
    return {
      primary_channel: "waouh",
      mode: "integrated",
      can_dispatch: true,
      reason: "internal_waouh_path",
      fallback_channels: fallback,
      candidates: ranked,
    };
  }
  if (level === "C0") {
    return {
      primary_channel: null,
      mode: "unavailable",
      can_dispatch: false,
      reason: "enrichment_required",
      fallback_channels: [],
      candidates: ranked,
    };
  }
  const primary = eligible[0];
  if (!primary) {
    return {
      primary_channel: null,
      mode: "unavailable",
      can_dispatch: false,
      reason: "no_allowed_channel",
      fallback_channels: [],
      candidates: ranked,
    };
  }
  const channel = String(primary.channel).toLowerCase();
  if (channel === "whatsapp") {
    if (level === "C3") {
      return {
        primary_channel: channel,
        mode: "approval",
        can_dispatch: false,
        reason: "c3_approval_required",
        fallback_channels: fallback,
        candidates: ranked,
      };
    }
    return {
      primary_channel: channel,
      mode: "automated",
      can_dispatch: true,
      reason: level === "C1" ? "public_business_confirmed_by_mandate" : "authorized_whatsapp",
      fallback_channels: fallback,
      candidates: ranked,
    };
  }
  if (channel === "phone" && level === "C1" && primary.public_business === true) {
    return {
      primary_channel: channel,
      mode: "automated",
      can_dispatch: true,
      reason: "public_business_phone_with_whatsapp_preflight",
      fallback_channels: fallback,
      candidates: ranked,
    };
  }
  if (channel === "email" || channel === "sms" || channel === "rcs" || channel === "sms_rcs") {
    return {
      primary_channel: channel,
      mode: "approval",
      can_dispatch: false,
      reason: "provider_not_yet_bound",
      fallback_channels: fallback,
      candidates: ranked,
    };
  }
  return {
    primary_channel: channel,
    mode: "manual",
    can_dispatch: false,
    reason: "manual_public_channel",
    fallback_channels: fallback,
    candidates: ranked,
  };
}
