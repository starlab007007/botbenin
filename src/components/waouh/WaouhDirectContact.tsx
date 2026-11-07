import { useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { directChannels, directMessage, openDirectContact, type OfferChannel } from "@/lib/waouh/offerChannels";
import type { NexusDiscoveryResult } from "@/lib/waouh/nexus";

type Direct = Exclude<OfferChannel, "waouh">;

/** Contact direct : WhatsApp (message déjà rédigé), e-mail (message déjà rédigé) ou appel. */
export function WaouhDirectContact({ result, requireAuth, className = "" }: {
  result: NexusDiscoveryResult;
  requireAuth?: (next?: string) => boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState<Direct | null>(null);
  const channels = directChannels(result);
  // Un numéro de téléphone peut aussi recevoir WhatsApp.
  const buttons: Direct[] = [...(channels.includes("whatsapp") || channels.includes("phone") ? ["whatsapp" as const] : []), ...(channels.includes("email") ? ["email" as const] : []), ...(channels.includes("phone") ? ["phone" as const] : [])];
  if (!buttons.length) return null;
  const run = async (channel: Direct) => {
    if (requireAuth && !requireAuth()) return;
    setBusy(channel);
    try {
      const price = result.price_min ?? result.price_max ?? null;
      const outcome = await openDirectContact(result, channel, directMessage(result.subject || "", price));
      if (outcome === "masked") toast({ title: "Contact protégé", description: "Ce vendeur n’a pas rendu son contact public. Confiez la prise de contact à l’avatar : il le joint pour vous." });
    } catch {
      toast({ title: "Contact indisponible", description: "Réessayez dans un instant.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  const meta: Record<Direct, { label: string; icon: typeof Mail }> = {
    whatsapp: { label: "WhatsApp", icon: MessageCircle },
    email: { label: "E-mail", icon: Mail },
    phone: { label: "Appeler", icon: Phone },
  };
  return (
    <div className={`wmk-direct ${className}`} role="group" aria-label="Contacter directement">
      {buttons.map((channel) => {
        const Icon = meta[channel].icon;
        return <button key={channel} type="button" className="wmk-direct-btn" data-channel={channel} disabled={busy !== null} onClick={() => void run(channel)}><Icon size={15} aria-hidden="true" />{busy === channel ? "Ouverture…" : meta[channel].label}</button>;
      })}
    </div>
  );
}

export default WaouhDirectContact;
