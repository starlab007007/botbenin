import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { prepareNexusContact, sendNexusDiscoveryContact } from "@/lib/waouh/nexus";
import { WaouhContactabilityBadge } from "./WaouhCommerceAgentBar";

type Prepared = Awaited<ReturnType<typeof prepareNexusContact>>;

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "Action indisponible.";

export function WaouhNexusContactSheet({
  fabricId,
  title,
  sourceUrl,
  contactabilityLevel,
}: {
  fabricId: string;
  title: string;
  sourceUrl?: string | null;
  contactabilityLevel?: string | null;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !user || prepared?.fabric_id === fabricId) return;
    let alive = true;
    setBusy(true);
    prepareNexusContact(fabricId)
      .then((value) => {
        if (!alive) return;
        setPrepared(value);
        setMessage(
          `Bonjour, je vous contacte via WAOUH au sujet de « ${title} ». Est-ce toujours disponible / pertinent pour vous ?`,
        );
      })
      .catch((error) => {
        if (!alive) return;
        toast({
          title: "Contact indisponible",
          description: errorText(error),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [fabricId, open, prepared?.fabric_id, title, toast, user]);

  const openContact = (channel: string, value: string) => {
    if (channel === "whatsapp") {
      const digits = value.replace(/\D/g, "");
      window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (channel === "phone") {
      window.location.href = `tel:${value}`;
      return;
    }
    if (channel === "email") {
      window.location.href = `mailto:${value}`;
      return;
    }
    if (/^https?:/i.test(value)) {
      window.open(value, "_blank", "noopener,noreferrer");
    }
  };

  const send = async () => {
    if (!prepared || !message.trim()) return;
    setBusy(true);
    try {
      const result = await sendNexusDiscoveryContact({
        fabric_id: prepared.fabric_id,
        message: message.trim(),
        confirmed: true,
      });
      toast({
        title: result.blind ? "Proposition transmise" : "Contact WAOUH envoyé",
        description: result.blind
          ? "WAOUH a transmis votre message sans révéler les coordonnées privées."
          : `${result.channel}${result.phone_last4 ? ` · …${result.phone_last4}` : ""}`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Envoi non autorisé ou indisponible",
        description: errorText(error),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const label =
    contactabilityLevel === "C2"
      ? "Transmettre via WAOUH"
      : contactabilityLevel === "C3" || contactabilityLevel === "C4"
        ? "Laisser l’Avatar poursuivre"
        : contactabilityLevel === "C1"
          ? "Contacter"
          : "Voir le contact";

  return (
    <Sheet open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) setPrepared(null);
    }}>
      <SheetTrigger asChild>
        <Button size="sm" className="h-8 rounded-xl px-2.5 text-[11px]">
          <MessageCircle className="mr-1 h-3.5 w-3.5" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[82dvh] max-w-2xl overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            Contact intelligent WAOUH
            <WaouhContactabilityBadge level={prepared?.contact_policy.level ?? contactabilityLevel} showCode />
          </SheetTitle>
          <SheetDescription>
            Le Contact Layer applique les permissions avant toute révélation ou prise de contact.
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="mt-5 rounded-2xl border bg-muted/20 p-4 text-sm">
            <div className="font-semibold">Connexion requise</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Connectez-vous pour préparer un contact NEXUS. WAOUH ne révèle jamais un contact privé sans autorisation.
            </p>
            <Button asChild className="mt-3" size="sm">
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        ) : busy && !prepared ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> L’Avatar vérifie la politique de contact…
          </div>
        ) : prepared ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border bg-gradient-to-br from-emerald-50/70 to-cyan-50/60 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div className="min-w-0">
                  <div className="font-semibold">{prepared.actor_name ?? title}</div>
                  {prepared.note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{prepared.note}</p>}
                </div>
              </div>
              {(prepared.source_url || sourceUrl) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => window.open(prepared.source_url || sourceUrl!, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> Voir la source
                </Button>
              )}
            </div>

            {prepared.contacts.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">Contacts autorisés</div>
                <div className="flex flex-wrap gap-2">
                  {prepared.contacts.map((contact) => (
                    <Button
                      key={contact.id}
                      size="sm"
                      variant="outline"
                      onClick={() => openContact(contact.channel, contact.value)}
                    >
                      {contact.channel === "whatsapp" ? "WhatsApp" : contact.channel === "email" ? "Email" : contact.channel === "phone" ? "Appeler" : contact.channel}
                      {contact.value_last4 ? ` · …${contact.value_last4}` : ""}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {(prepared.contact_policy.can_blind_message || prepared.contact_policy.can_auto_contact) && (
              <div className="space-y-2 rounded-2xl border p-3">
                <div className="text-xs font-semibold">
                  {prepared.contact_policy.can_blind_message
                    ? "WAOUH transmet votre proposition sans révéler les coordonnées"
                    : "Message que Muse peut transmettre"}
                </div>
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} />
                <Button size="sm" disabled={busy || !message.trim()} onClick={() => void send()}>
                  {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                  {prepared.contact_policy.can_blind_message ? "Transmettre via WAOUH" : "Confirmer et envoyer"}
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
