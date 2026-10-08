import { WaouhMessageText } from "./WaouhMessageText";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  exchangeCall,
  exchangeDeliveryLabel,
  exchangeNextStep,
  type ExchangeAccess,
  type ExchangeSnapshot,
} from "@/lib/waouh/externalExchange";
import { moneyXof } from "@/lib/waouh/agenticClient";

export function WaouhExternalExchange({ access }: { access: ExchangeAccess }) {
  const guest = "token" in access;
  const accessKey = guest ? access.token : access.journey_id;
  const stableAccess = useRef(access);
  stableAccess.current = access;
  const [snapshot, setSnapshot] = useState<ExchangeSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef<number | null>(null);
  const reading = useRef<number | null>(null);
  const revision = useRef(0);
  const [text, setText] = useState("");
  const [channel, setChannel] = useState("guest");
  const [link, setLink] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [delivery, setDelivery] = useState("");
  const [payment, setPayment] = useState("");
  const [stopped, setStopped] = useState(false);
  const sync = useCallback(async () => {
    if (
      document.visibilityState === "hidden" ||
      sending.current !== null ||
      reading.current !== null
    )
      return;
    const version = revision.current;
    reading.current = version;
    try {
      const result = await exchangeCall<ExchangeSnapshot>(
        stableAccess.current,
        "read",
      );
      if (version === revision.current) {
        setSnapshot(result);
        setError("");
      }
    } catch {
      if (version === revision.current)
        setError(
          guest
            ? "Ce lien est expiré, révoqué ou temporairement indisponible."
            : "Impossible de charger l’échange. Réessayez.",
        );
    } finally {
      if (reading.current === version) reading.current = null;
    }
  }, [accessKey, guest]);
  useEffect(() => {
    revision.current++;
    sending.current = null;
    reading.current = null;
    setBusy(false);
    setChannel("guest");
    setAmount("");
    setQuantity("1");
    setDelivery("");
    setPayment("");
    setSnapshot(null);
    setLink("");
    setText("");
    setStopped(false);
    void sync();
    const timer = window.setInterval(() => void sync(), 10000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      revision.current++;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [sync]);
  const run = async (
    operation: string,
    payload: Record<string, unknown> = {},
  ) => {
    if (sending.current !== null) return;
    const version = ++revision.current;
    sending.current = version;
    setBusy(true);
    setError("");
    try {
      const result = await exchangeCall<
        ExchangeSnapshot & { url?: string; stopped?: boolean }
      >(stableAccess.current, operation, {
        ...payload,
        request_id: crypto.randomUUID(),
      });
      if (version !== revision.current) return;
      if (result.url) setLink(result.url);
      if (result.stopped) {
        setStopped(true);
        return;
      }
      if (result.journey) setSnapshot(result);
      if (operation === "message") setText("");
      if (operation === "revoke") setLink("");
    } catch {
      if (version === revision.current)
        setError(
          "Action non confirmée. Actualisez le suivi avant de réessayer. Le canal peut être indisponible ou les conditions avoir changé.",
        );
    } finally {
      if (sending.current === version) {
        sending.current = null;
        if (version === revision.current) setBusy(false);
      }
    }
  };
  if (stopped)
    return (
      <p className="rounded-xl bg-slate-100 p-3 text-sm">
        Échange arrêté. Votre lien est révoqué.
      </p>
    );
  const closed =
    !!snapshot && ["completed", "cancelled"].includes(snapshot.journey.stage);
  const role = guest ? "counterparty" : "owner";
  const buyer = snapshot?.journey.mode === "sell" ? guest : !guest;
  const agreement = snapshot?.agreement;
  const accepted =
    !!agreement?.owner_accepted_at && !!agreement.counterparty_accepted_at;
  const ownAccepted = guest
    ? agreement?.counterparty_accepted_at
    : agreement?.owner_accepted_at;
  const prepare = () => {
    if (agreement) {
      setAmount(String(agreement.terms.amount));
      setQuantity(String(agreement.terms.quantity));
      setDelivery(agreement.terms.delivery);
      setPayment(agreement.terms.payment);
    }
    setText(
      agreement
        ? "Merci pour votre proposition. Pouvez-vous confirmer la disponibilité et les conditions de livraison ?"
        : `Bonjour, concernant « ${snapshot?.journey.subject || "votre offre"} », pouvez-vous préciser la disponibilité, le prix et la livraison ?`,
    );
  };
  return (
    <section
      className="min-w-0 space-y-3 rounded-2xl border bg-white p-3 text-sm"
      aria-label="Discussion externe"
    >
      <div>
        <h3 className="font-semibold">
          {guest
            ? snapshot?.journey.subject || "Votre échange WAOUH"
            : "Discussion avec le contact externe"}
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          {snapshot
            ? exchangeNextStep(snapshot)
            : "Chargement de la discussion…"}
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}
      <Button
        className="h-auto min-h-10 max-w-full whitespace-normal"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void sync()}
      >
        Actualiser
      </Button>
      {!guest && !closed && snapshot && (
        <details>
          <summary className="cursor-pointer py-2 font-medium">
            Inviter sans installation
          </summary>
          <p className="mb-2 text-xs text-slate-600">
            Ce lien donne accès à cet échange. Partagez-le uniquement avec
            l’interlocuteur. Il expire sous 7 jours.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-auto min-h-10 max-w-full whitespace-normal"
              size="sm"
              disabled={busy}
              onClick={() => void run("invite")}
            >
              Créer le lien
            </Button>
            <Button
              className="h-auto min-h-10 max-w-full whitespace-normal"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run("revoke")}
            >
              Révoquer les liens
            </Button>
          </div>
          {link && (
            <div className="mt-2 space-y-2">
              <Input
                aria-label="Lien invité"
                value={link}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                className="h-auto min-h-10 max-w-full whitespace-normal"
                size="sm"
                variant="outline"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(link)
                    .catch(() =>
                      setError("Sélectionnez et copiez le lien affiché."),
                    )
                }
              >
                Copier le lien
              </Button>
            </div>
          )}
        </details>
      )}
      <div
        className="max-h-[45dvh] space-y-2 overflow-y-auto"
        aria-live="polite"
      >
        {snapshot?.messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-full rounded-xl border p-3 ${message.role === role ? "ml-5 bg-cyan-50" : "mr-5 bg-slate-50"}`}
          >
            <div className="mb-1 flex flex-wrap justify-between gap-1 text-[11px] text-slate-500">
              <span>
                {message.role === role ? "Vous" : "Interlocuteur"} ·{" "}
                {message.channel === "guest" ? "Lien invité" : message.channel}
              </span>
              <time>
                {new Date(message.created_at).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <div className="break-words [overflow-wrap:anywhere]">
              <WaouhMessageText
                text={
                  message.text ||
                  (
                    {
                      propose: "Conditions proposées",
                      accept: "Conditions acceptées",
                      shipment: "Expédition déclarée",
                      receipt: "Réception confirmée",
                      payment: "Paiement déclaré",
                      payment_received: "Paiement reçu confirmé",
                      stop: "Échange arrêté",
                    } as Record<string, string>
                  )[message.operation] ||
                  "Mise à jour de l’échange"
                }
              />
            </div>
            {message.terms?.amount && (
              <p className="mt-2 font-semibold">
                {moneyXof(message.terms.amount)} · Quantité{" "}
                {message.terms.quantity}
              </p>
            )}
            <p className="mt-1 text-[10px] text-slate-500">
              {exchangeDeliveryLabel(message.status)}
            </p>
          </article>
        ))}
      </div>
      {agreement && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="font-semibold">
            {accepted ? "Accord confirmé" : "Proposition à confirmer"} ·{" "}
            {moneyXof(agreement.terms.amount)}
          </p>
          <p className="text-xs">
            Quantité : {agreement.terms.quantity} · Livraison :{" "}
            {agreement.terms.delivery}
          </p>
          <p className="text-xs">Paiement : {agreement.terms.payment}</p>
          {!guest && !closed && (
            <Button
              className="h-auto min-h-10 max-w-full whitespace-normal"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                setText(
                  `Proposition pour « ${snapshot?.journey.subject} » : ${agreement.terms.quantity} unité(s), total ${agreement.terms.amount} FCFA. Livraison : ${agreement.terms.delivery}. Paiement : ${agreement.terms.payment}. Confirmez ces conditions dans le lien invité de notre échange.`,
                )
              }
            >
              Partager la proposition
            </Button>
          )}
          <p className="text-xs">
            Vous : {ownAccepted ? "confirmé" : "à confirmer"} · Interlocuteur :{" "}
            {(
              guest
                ? agreement.owner_accepted_at
                : agreement.counterparty_accepted_at
            )
              ? "confirmé"
              : "à confirmer"}
          </p>
          {!closed && !ownAccepted && (
            <Button
              className="h-auto min-h-10 max-w-full whitespace-normal"
              size="sm"
              disabled={busy}
              onClick={() => void run("accept", { agreement_id: agreement.id })}
            >
              Accepter ces conditions
            </Button>
          )}
          {accepted && !closed && (
            <div className="flex flex-wrap gap-2">
              {!buyer && !agreement.shipped_at && (
                <Button
                  className="h-auto min-h-10 max-w-full whitespace-normal"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run("shipment", { agreement_id: agreement.id })
                  }
                >
                  Déclarer l’expédition
                </Button>
              )}
              {buyer && !agreement.received_at && (
                <Button
                  className="h-auto min-h-10 max-w-full whitespace-normal"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run("receipt", { agreement_id: agreement.id })
                  }
                >
                  J’ai reçu le produit / service
                </Button>
              )}
              {buyer && !agreement.payment_reported_at && (
                <Button
                  className="h-auto min-h-10 max-w-full whitespace-normal"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run("payment", { agreement_id: agreement.id })
                  }
                >
                  J’ai effectué le paiement
                </Button>
              )}
              {!buyer &&
                agreement.payment_reported_at &&
                !agreement.payment_received_at && (
                  <Button
                    className="h-auto min-h-10 max-w-full whitespace-normal"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void run("payment_received", {
                        agreement_id: agreement.id,
                      })
                    }
                  >
                    J’ai reçu le paiement
                  </Button>
                )}
            </div>
          )}
          <p className="text-[10px] text-slate-600">
            Ces confirmations enregistrent vos déclarations. Aucun paiement
            n’est exécuté par ces boutons.
          </p>
        </div>
      )}
      {snapshot && !closed && (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="h-auto min-h-10 max-w-full whitespace-normal"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={prepare}
              >
                Préparer une réponse
              </Button>
              {!guest && (
                <select
                  className="min-h-10 max-w-full rounded-lg border px-2 text-xs"
                  aria-label="Canal de réponse"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {snapshot.routes.map((route) => (
                    <option
                      key={route.channel}
                      value={route.channel}
                      disabled={!route.available}
                    >
                      {route.label}
                      {!route.available ? " · indisponible" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {!guest && (
              <p className="text-[11px] text-slate-500">
                {snapshot.routes.find((route) => route.channel === channel)
                  ?.reason ||
                  (channel === "guest"
                    ? "Le message est publié ici. Transmettez le lien à votre interlocuteur."
                    : "Vérifiez le message avant de confirmer l’envoi.")}
              </p>
            )}
            <Textarea
              aria-label="Votre message"
              placeholder="Votre message…"
              rows={2}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button
              className="h-auto min-h-10 max-w-full whitespace-normal"
              size="sm"
              disabled={busy || !text.trim()}
              onClick={() =>
                void run("message", { text, channel, confirmed: true })
              }
            >
              {channel === "guest" ? "Publier le message" : "Confirmer l’envoi"}
            </Button>
          </div>
          {!accepted && (
            <details>
              <summary className="cursor-pointer py-2 font-medium">
                Proposer des conditions
              </summary>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    aria-label="Montant total FCFA"
                    placeholder="Total FCFA"
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Input
                    aria-label="Quantité"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <Input
                  aria-label="Conditions de livraison"
                  placeholder="Livraison / réalisation"
                  maxLength={300}
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                />
                <Input
                  aria-label="Conditions de paiement"
                  placeholder="Modalités de paiement"
                  maxLength={200}
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                />
                <Button
                  className="h-auto min-h-10 max-w-full whitespace-normal"
                  size="sm"
                  disabled={
                    busy ||
                    !(Number(amount) > 0) ||
                    !(Number(quantity) > 0) ||
                    !delivery.trim() ||
                    !payment.trim()
                  }
                  onClick={() =>
                    void run("propose", {
                      terms: {
                        amount: Number(amount),
                        quantity: Number(quantity),
                        delivery: delivery.trim(),
                        payment: payment.trim(),
                      },
                    })
                  }
                >
                  Proposer ces conditions
                </Button>
              </div>
            </details>
          )}
          {guest && (
            <Button
              className="h-auto min-h-10 max-w-full whitespace-normal"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void run("stop")}
            >
              Refuser et arrêter les messages
            </Button>
          )}
        </>
      )}
    </section>
  );
}

export function WaouhExternalExchangeDisclosure({
  journeyId,
  label = "Messages, lien invité et accord",
}: {
  journeyId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer py-2 text-xs font-semibold">
        {label}
      </summary>
      {open && <WaouhExternalExchange access={{ journey_id: journeyId }} />}
    </details>
  );
}
