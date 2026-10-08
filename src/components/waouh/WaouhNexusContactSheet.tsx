import { userFacingErrorText } from "@/lib/userFacingError";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MessageCircle, RefreshCw, Search, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { buildWaouhAuthRedirect } from "@/lib/waouhAccessPolicy";
import { useToast } from "@/hooks/use-toast";
import {
  enrichNexusOpportunity,
  getNexusOpportunityStatus,
  prepareNexusContact,
  sendNexusDiscoveryContact,
  startNexusOpportunity,
  listNexusConversationBus,
  type NexusConversationBusEvent,
  type NexusOpportunityJourney,
} from "@/lib/waouh/nexus";
import { WaouhContactabilityBadge } from "./WaouhCommerceAgentBar";
import { contactabilityActionLabel, findChannelLabel, interestMessage, SEND_OFFER_LABEL } from "@/lib/waouh/hotLabels";

type Prepared = Awaited<ReturnType<typeof prepareNexusContact>>;

const errorText = (error: unknown) => userFacingErrorText(error, "send");

const stageLabels = [
  ["Trouvé", 10],
  ["Vérifié", 25],
  ["Contact", 40],
  ["Réponse", 55],
  ["Négociation", 70],
  ["Accord", 80],
  ["Exécution", 90],
  ["Terminé", 100],
] as const;

export function WaouhNexusContactSheet({
  fabricId,
  title,
  sourceUrl,
  contactabilityLevel,
  mode = "buy",
}: {
  fabricId: string;
  title: string;
  sourceUrl?: string | null;
  contactabilityLevel?: string | null;
  mode?: "buy" | "sell" | "ask";
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [journey, setJourney] = useState<NexusOpportunityJourney | null>(null);
  const [message, setMessage] = useState("");
  const [busEvents, setBusEvents] = useState<NexusConversationBusEvent[]>([]);

  const load = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let started = (await startNexusOpportunity(fabricId, mode)).journey;
      let contact = await prepareNexusContact(fabricId);
      if (contact.contact_policy.level === "C0" ||
          (contact.contact_policy.level === "C1" && !contact.contact_policy.can_user_confirm_contact)) {
        started = (await enrichNexusOpportunity(fabricId, mode)).journey;
        contact = await prepareNexusContact(fabricId);
      }
      setJourney(started);
      setPrepared(contact);
      setMessage(interestMessage(title));
      try {
        const bus = await listNexusConversationBus({ fabric_id: fabricId, limit: 12 });
        setBusEvents(bus.events || []);
      } catch {
        setBusEvents([]);
      }
    } catch (error) {
      toast({ title: "Avatar poursuit la démarche", description: errorText(error) });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open || !user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fabricId, user?.id]);

  const enrich = async () => {
    setEnriching(true);
    try {
      const result = await enrichNexusOpportunity(fabricId, mode);
      setJourney(result.journey);
      setPrepared(await prepareNexusContact(fabricId));
    } catch (error) {
      toast({ title: "Recherche de contact active", description: errorText(error) });
    } finally {
      setEnriching(false);
    }
  };

  const refresh = async () => {
    if (!journey) return;
    setBusy(true);
    try {
      const result = await getNexusOpportunityStatus({ journey_id: journey.id });
      setJourney(result.journey);
      try {
        const bus = await listNexusConversationBus({ fabric_id: fabricId, limit: 12 });
        setBusEvents(bus.events || []);
      } catch {}
    } finally {
      setBusy(false);
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
      if (result.journey) setJourney(result.journey as NexusOpportunityJourney);
      else if (journey) setJourney((await getNexusOpportunityStatus({ journey_id: journey.id })).journey);
      try {
        const bus = await listNexusConversationBus({ fabric_id: fabricId, limit: 12 });
        setBusEvents(bus.events || []);
      } catch {}
      toast({
        title: "Avatar a pris le relais",
        description: "Le contact est suivi dans WAOUH. Vous serez guidé dès la réponse.",
      });
    } catch (error) {
      toast({
        title: "La démarche reste active",
        description: errorText(error),
      });
    } finally {
      setBusy(false);
    }
  };

  const level = journey?.contactability_level ?? prepared?.contact_policy.level ?? contactabilityLevel ?? "C0";
  const progress = Math.max(0, Math.min(100, journey?.progress ?? 10));
  const waiting = journey?.stage === "waiting_reply" || journey?.stage === "contacting" || level === "C4";
  const negotiating = journey?.stage === "negotiating" || level === "C5";
  const canSend = !!prepared && (
    prepared.contact_policy.can_blind_message ||
    prepared.contact_policy.can_auto_contact ||
    prepared.contact_policy.can_user_confirm_contact
  );
  const contactPack = prepared?.contact_pack ?? (journey?.contact_pack as any) ?? null;
  const readiness = String(prepared?.readiness_level ?? journey?.readiness_level ?? contactPack?.readiness_level ?? "");
  const actionability = Number(prepared?.actionability_score ?? journey?.actionability_score ?? contactPack?.actionability_score ?? 0);
  const nextBestAction = String(prepared?.next_best_action ?? journey?.next_best_action ?? contactPack?.next_best_action ?? "");

  const masked = useMemo(() => {
    const values: string[] = [];
    for (const contact of prepared?.contacts ?? []) {
      if (prepared?.contact_policy?.can_reveal && contact.value) {
        values.push(`${contact.channel} · ${contact.value}`);
      } else if (contact.value_last4) {
        values.push(`${contact.channel === "whatsapp" ? "WhatsApp" : contact.channel} · •••• ${contact.value_last4}`);
      }
    }
    const phones = journey?.masked_contact?.phones;
    if (Array.isArray(phones)) {
      for (const row of phones) {
        if (!row || typeof row !== "object") continue;
        const phone = row as Record<string, unknown>;
        const last4 = String(phone.last4 ?? "");
        if (last4) values.push(`${String(phone.country_code ?? "")} •••• ${last4}`.trim());
      }
    }
    return [...new Set(values)];
  }, [journey?.masked_contact, prepared?.contacts]);

  const label = contactabilityActionLabel(level);

  return (
    <Sheet open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) {
        setPrepared(null);
        setJourney(null);
      }
    }}>
      <SheetTrigger asChild>
        <Button size="sm" className="h-8 rounded-xl px-2.5 text-[11px]">
          <MessageCircle className="mr-1 h-3.5 w-3.5" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] max-w-2xl overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex flex-wrap items-center gap-2">
            Votre Avatar conduit la démarche
            <WaouhContactabilityBadge level={level} showCode />
          </SheetTitle>
          <SheetDescription>
            Découverte → contact C0–C5 → réponse → négociation → accord. Aucun clic ne termine le parcours sans prochaine étape.
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="mt-5 rounded-2xl border bg-muted/20 p-4 text-sm">
            <div className="font-semibold">Connexion requise</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Connectez-vous pour que votre Avatar conserve et poursuive cette démarche.
            </p>
            <Button asChild className="mt-3" size="sm"><Link to={buildWaouhAuthRedirect("/app/nexus", "/auth")}>Se connecter</Link></Button>
          </div>
        ) : busy && !prepared ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Avatar vérifie le meilleur chemin de contact…
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{journey?.last_message ?? "Opportunité prise en charge par Avatar"}</div>
                <div className="font-bold text-blue-600">{progress}%</div>
              </div>
              <Progress value={progress} className="mt-2 h-2" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stageLabels.map(([stage, threshold]) => (
                  <span key={stage} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${progress >= threshold ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}`}>
                    {stage}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Prochaine étape : <strong className="text-slate-800">{journey?.next_action ?? "Avatar analyse la prochaine action"}</strong>
              </div>
            </div>

            {(readiness || actionability > 0 || nextBestAction) && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3">
                  <div className="text-[9px] font-black uppercase text-cyan-700">Préparation</div>
                  <div className="mt-1 text-lg font-black text-cyan-950">{readiness || "R0"}</div>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                  <div className="text-[9px] font-black uppercase text-violet-700">Actionnable</div>
                  <div className="mt-1 text-lg font-black text-violet-950">{Math.round(actionability)}%</div>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                  <div className="text-[9px] font-black uppercase text-blue-700">Prochaine action</div>
                  <div className="mt-1 text-[11px] font-black leading-tight text-blue-950">
                    {nextBestAction === "CONTACT_NOW" ? "Contacter" :
                     nextBestAction === "OPEN_DEAL_ROOM" ? "Deal Room" :
                     nextBestAction === "REQUEST_APPROVAL" ? "Valider" :
                     nextBestAction === "WAIT_REPLY" ? "Attendre" :
                     nextBestAction === "NEGOTIATE" ? "Négocier" :
                     nextBestAction === "ENRICH" ? "Enrichir" : nextBestAction || "Poursuivre"}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border bg-gradient-to-br from-emerald-50/70 to-cyan-50/60 p-4">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
                <div className="min-w-0">
                  <div className="font-semibold">{prepared?.actor_name ?? title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {prepared?.note ?? "WAOUH protège les coordonnées et conserve la continuité de la démarche."}
                  </p>
                  {(prepared?.source_url || sourceUrl) && (
                    <p className="mt-1 text-[10px] text-muted-foreground">Source originale vérifiée par NEXUS.</p>
                  )}
                </div>
              </div>
            </div>

            {busEvents.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-black text-slate-900">Activité multicanale</div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  WAOUH regroupe ici les événements du Chat, WhatsApp, NEXUS et du Deal Room.
                </p>
                <div className="mt-2 space-y-2">
                  {busEvents.slice(0, 6).map((event) => (
                    <div key={event.id} className="flex items-start gap-2 text-[10px]">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        event.direction === "in" ? "bg-emerald-500" :
                        event.direction === "out" ? "bg-blue-500" : "bg-slate-400"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800">
                          {event.event_type.replaceAll(".", " ")}
                          <span className="ml-1 font-medium text-slate-400">· {event.channel}</span>
                        </div>
                        <div className="text-slate-400">
                          {new Date(event.created_at).toLocaleString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {masked.length > 0 && (
              <div className="rounded-2xl border p-3">
                <div className="text-xs font-semibold">Contact autorisé / masqué</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {masked.map((value) => <span key={value} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{value}</span>)}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Seules les coordonnées publiques, professionnelles ou autorisées sont utilisées.
                </p>
              </div>
            )}

            {(level === "C0" || (level === "C1" && !canSend)) && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3">
                <div className="text-sm font-semibold">Avatar enrichit le signal</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {level === "C0"
                    ? "C0 n’est plus une erreur. WAOUH cherche un canal public ou autorisé et garde cette démarche active."
                    : "Avatar complète les canaux disponibles pour sécuriser la prise de contact."}
                </p>
                <Button className="mt-3" size="sm" disabled={enriching} onClick={() => void enrich()}>
                  {enriching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
                  {findChannelLabel(level)}
                </Button>
              </div>
            )}

            {canSend && !waiting && !negotiating && (
              <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3">
                <div className="text-xs font-semibold">
                  {level === "C1" ? "Contact professionnel public trouvé · Bot peut agir maintenant" : "Message proposé par votre Avatar"}
                </div>
                {level === "C1" && (
                  <p className="text-[10px] text-muted-foreground">
                    Votre confirmation autorise uniquement ce message vers ce contact professionnel public. WAOUH conserve la traçabilité.
                  </p>
                )}
                <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} />
                <Button size="sm" disabled={busy || !message.trim()} onClick={() => void send()}>
                  {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                  {level === "C1" ? "Bot contacte pour moi" : SEND_OFFER_LABEL}
                </Button>
              </div>
            )}

            {waiting && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="font-semibold text-emerald-900">Message envoyé · réponse en attente</div>
                <p className="mt-1 text-xs text-emerald-800">
                  Avatar suit la réponse et vous guidera automatiquement vers la négociation.
                </p>
                <Button variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => void refresh()}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Actualiser le suivi
                </Button>
              </div>
            )}

            {negotiating && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="font-semibold">La contrepartie est prête à négocier</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  WAOUH doit maintenant ouvrir le Deal Room et conserver les propositions, contre-offres et l’accord.
                </p>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
