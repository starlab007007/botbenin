import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageCircle, Send, X, Loader2, Camera, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useWaouhGeolocation } from "@/hooks/useWaouhGeolocation";
import { WaouhCityBadge } from "./WaouhCityBadge";
import { WaouhTransactionCard } from "./WaouhTransactionCard";
import { WaouhAuthGate } from "./WaouhAuthGate";
import { WaouhPaymentDialog } from "./WaouhPaymentDialog";
import { WaouhQuickActions, type QuickAction } from "./WaouhQuickActions";
import { WaouhSellWizard } from "./WaouhSellWizard";
import { ChatImage } from "@/app-mobile/components/ChatImage";
import { NativeSellSheet } from "./NativeSellSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Att = { url: string; type: string; caption?: string };
type WaouhAction = { id: string; label: string; url?: string };
const stripLegacy = (t: string) =>
  (t || "")
    .replace(/\n*👉\s*Appuyez sur \*?Payer\*?[^\n]*/gi, "")
    .replace(/\n*💳\s*\*?Carte de paiement WAOUH\*?[\s\S]*?(?=\n{2,}|$)/gi, "")
    .replace(/\n*Payer maintenant\s*:?[\s\S]*?(?:Moov[^\n]*|MTN[^\n]*)/gi, "")
    .replace(/\n*Vous pouvez maintenant payer[^\n]*/gi, "")
    .replace(/\n*L'acheteur va lancer le paiement\.?/gi, "")
    .replace(/\n*🔒?\s*Les fonds restent en escrow[^\n]*/gi, "")
    .replace(/\n*[•\-]?\s*\*?Sécurité\*?\s*:\s*escrow[^\n]*/gi, "")
    .replace(/(?:^|\n)\s*1\.\s*(?:✅|💬|❌|💳)?[^\n]*\n\s*2\.\s*(?:✅|💬|❌|💳|MTN|Moov)[^\n]*(?:\n\s*3\.\s*(?:✅|💬|❌|💳|MTN|Moov)[^\n]*)?/gi, "")
    .replace(/\s*\(paiement\s+sécuris[eé][^)]*\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

type Msg = {
  id: string;
  direction: "in" | "out";
  text: string;
  created_at: string;
  attachments?: Att[] | null;
  meta?: { transaction_id?: string | null; intent?: string | null } | null;
};

const SESSION_KEY = "waouh_web_session_id";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto as any).randomUUID?.() ?? `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const QUICK_PROMPTS: Record<Exclude<QuickAction, "sell" | "pay">, string> = {
  buy: "Je cherche ",
  negotiate: "Je propose  FCFA pour ",
};


export type WaouhWebChatHandle = { triggerQuickAction: (a: QuickAction) => void; focusInput: () => void };

export const WaouhWebChat = forwardRef<WaouhWebChatHandle, { embedded?: boolean; fullscreen?: boolean; variant?: "web" | "native"; composerTopSlot?: React.ReactNode }>(({ embedded = false, fullscreen = false, variant = "web", composerTopSlot }, externalRef) => {
  const [open, setOpen] = useState(embedded || fullscreen);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAtts, setPendingAtts] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [focusMsgId, setFocusMsgId] = useState<string | null>(null);
  const sessionId = useRef(getSessionId()).current;
  const scrollRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { geo, loading: geoLoading, setCity, refresh } = useWaouhGeolocation();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let active = true;
    const uid = user?.id ?? null;

    (async () => {
      // Resolve all waouh_users.id linked to this device (session) + auth account.
      // waouh_messages.user_id references waouh_users.id (NOT auth.users.id),
      // so we MUST query by these IDs to get full history.
      const ors: string[] = [`web_session_id.eq.${sessionId}`];
      if (uid) ors.push(`auth_user_id.eq.${uid}`);
      const { data: wusers } = await supabase
        .from("waouh_users")
        .select("id")
        .or(ors.join(","))
        .limit(50);
      const waouhIds = Array.from(new Set((wusers ?? []).map((u: any) => u.id)));

      // Load history: by web_session_id OR by any of the resolved waouh_users.id
      const msgOrs: string[] = [`web_session_id.eq.${sessionId}`];
      if (waouhIds.length) msgOrs.push(`user_id.in.(${waouhIds.join(",")})`);
      const { data } = await supabase
        .from("waouh_messages")
        .select("id,direction,text,created_at,attachments,meta")
        .or(msgOrs.join(","))
        .order("created_at", { ascending: true })
        .limit(500);
      if (active && data) {
        const seen = new Set<string>();
        const unique = (data as any[]).filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
        setMessages(unique as any);
      }

      // Link this device's anonymous waouh_users row to the freshly authenticated account
      if (uid) {
        supabase
          .from("waouh_users")
          .update({ auth_user_id: uid })
          .eq("web_session_id", sessionId)
          .is("auth_user_id", null)
          .then(() => {}, () => {});
      }
    })();

    const suffix = Math.random().toString(36).slice(2, 8);
    const onInsert = (payload: any) => {
      const m = payload.new as any;
      setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
    };
    const chSession = supabase
      .channel(`waouh_msgs_s_${sessionId}_${suffix}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "waouh_messages", filter: `web_session_id=eq.${sessionId}` }, onInsert)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(chSession);
    };
  }, [open, sessionId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Listen to notification clicks → scroll & highlight target message/transaction
  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (!open) setOpen(true);
      const targetId: string | undefined =
        detail.message_id ||
        (detail.transaction_id
          ? messages.find((m) => m.meta?.transaction_id === detail.transaction_id)?.id
          : undefined);
      if (!targetId) return;
      setFocusMsgId(targetId);
      setTimeout(() => {
        const el = msgRefs.current[targetId];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setFocusMsgId(null), 2400);
    };
    window.addEventListener("waouh:focus-message", onFocus as EventListener);
    return () => window.removeEventListener("waouh:focus-message", onFocus as EventListener);
  }, [messages, open]);

  const MAX_PHOTOS = 2;
  const handleFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const remaining = MAX_PHOTOS - pendingAtts.length;
    if (remaining <= 0) {
      toast({ title: "Limite atteinte", description: `Maximum ${MAX_PHOTOS} photos par annonce.`, variant: "destructive" });
      return;
    }
    const toUpload = list.slice(0, remaining);
    setUploading(true);
    try {
      for (const file of toUpload) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `web/${sessionId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("waouh-uploads").upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("waouh-uploads").getPublicUrl(path);
        setPendingAtts((prev) => [...prev, { url: pub.publicUrl, type: file.type }]);
      }
    } catch (err: any) {
      toast({ title: "Upload échoué", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const sendCore = async (text: string, atts: Att[]) => {
    if (!text && atts.length === 0) return;
    setSending(true);
    const now = new Date().toISOString();
    const tempInId = `temp-in-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempInId, direction: "in", text: text || "(image)", created_at: now, attachments: atts },
    ]);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-channel-in", {
        body: {
          channel: "web",
          sessionId,
          text,
          attachments: atts,
          lat: geo.lat,
          lng: geo.lng,
          city: geo.city,
          authUserId: user?.id ?? null,
        },
      });
      if (error) throw error;
      const { data: fresh } = await supabase
        .from("waouh_messages")
        .select("id,direction,text,created_at,attachments,meta")
        .eq("web_session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (fresh && fresh.length > 0) {
        setMessages(fresh as any);
      } else if ((data as any)?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-out-${Date.now()}`,
            direction: "out",
            text: (data as any).reply,
            created_at: new Date().toISOString(),
            attachments: null,
            meta: { intent: (data as any).intent ?? null, transaction_id: (data as any).transaction_id ?? null },
          },
        ]);
      }
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempInId));
      toast({ title: "Envoi échoué", description: e.message, variant: "destructive" });
      throw e;
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && pendingAtts.length === 0) || sending) return;
    const atts = pendingAtts;
    setInput("");
    setPendingAtts([]);
    try {
      await sendCore(text, atts);
    } catch {
      setInput(text);
      setPendingAtts(atts);
    }
  };

  const handleQuickAction = (a: QuickAction) => {
    if (a === "sell") { setSellOpen(true); return; }
    if (a === "pay") return; // Plus de paiement dans le nouveau parcours
    const prompt = QUICK_PROMPTS[a as Exclude<QuickAction, "sell" | "pay">];
    if (!prompt) return;
    setInput((cur) => (cur ? cur : prompt));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  useImperativeHandle(externalRef, () => ({
    triggerQuickAction: handleQuickAction,
    focusInput: () => inputRef.current?.focus(),
  }), []);



  const [paymentTx, setPaymentTx] = useState<{ id: string; amount: number } | null>(null);
  const [pendingPaymentTx, setPendingPaymentTx] = useState<{ id: string; amount: number } | null>(null);
  const onPay = (tx: any) => {
    if (!user) {
      setPendingPaymentTx({ id: tx.id, amount: tx.amount });
      toast({ title: "Authentification requise", description: "Connectez-vous pour finaliser le paiement en toute sécurité." });
      setAuthOpen(true);
    } else {
      setPaymentTx({ id: tx.id, amount: tx.amount });
    }
  };

  // Resume payment after successful login
  useEffect(() => {
    if (user && pendingPaymentTx) {
      setPaymentTx(pendingPaymentTx);
      setPendingPaymentTx(null);
      setAuthOpen(false);
    }
  }, [user, pendingPaymentTx]);

  const Panel = (
    <Card
      className={cn(
        "flex flex-col bg-background overflow-hidden",
        fullscreen
          ? "w-full h-full rounded-none border-0 shadow-none pb-[env(safe-area-inset-bottom)]"
          : embedded
            ? "w-full h-[70vh] max-h-[100dvh] rounded-lg border shadow-2xl"
            : "fixed bottom-20 right-4 w-[92vw] sm:w-[400px] h-[70vh] max-h-[100dvh] rounded-2xl z-50 border shadow-2xl"
      )}
    >
      {variant !== "native" && (
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate">WAOUH</div>
              <div className="text-xs opacity-90 truncate">Achetez · Vendez · Négociez · Payez</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <WaouhCityBadge geo={geo} loading={geoLoading} onSetCity={setCity} onRefresh={refresh} compact />
            {!embedded && !fullscreen && (
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 waouh-chat-bg min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8 px-4">
            👋 Bonjour ! Utilisez les boutons ci-dessous, ou tapez « Je vends … » / « Je cherche … ».
            <br />📍 Annonces autour de <strong>{geo.city}</strong>.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            ref={(el) => { msgRefs.current[m.id] = el; }}
            className={cn(
              "transition-all rounded-xl",
              focusMsgId === m.id && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background bg-emerald-50/40"
            )}
          >
            <div className={cn("flex", m.direction === "in" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "chat-bubble",
                  m.direction === "in" ? "chat-bubble-out" : "chat-bubble-in waouh-bot-bubble"
                )}
              >
                {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                  <div className={cn("grid gap-2 mb-2 not-prose", m.attachments.length === 1 ? "grid-cols-1" : m.attachments.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
                    {m.attachments.map((a, i) => (
                      <ChatImage
                        key={i}
                        src={a.url}
                        caption={a.caption || undefined}
                        gallery={m.attachments!.map((x) => ({ url: x.url, caption: x.caption || undefined }))}
                        index={i}
                        className="aspect-square border border-border"
                      />
                    ))}
                  </div>
                )}
                {m.text && m.text !== "(image)" && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      hr: () => <div className="waouh-sep" />,
                      h1: ({ children }) => <h1>{children}</h1>,
                      h2: ({ children }) => <h2>{children}</h2>,
                      h3: ({ children }) => <h3>{children}</h3>,
                      strong: ({ children }) => <strong>{children}</strong>,
                      em: ({ children }) => <em>{children}</em>,
                      ul: ({ children }) => <ul className="list-none pl-0 my-1 space-y-1">{children}</ul>,
                      li: ({ children }) => <li className="flex gap-2"><span className="text-emerald-500 mt-[2px]">•</span><span className="flex-1">{children}</span></li>,
                      p: ({ children }) => {
                        const s = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : "";
                        const isInfo = /^(📞|🟢|🏙️|📏|📇|👤|💰|📦|📊|🧠|🔔|✨|📍|🛒|🏷️|💵)/.test(s.trim());
                        return <p data-info={isInfo ? "1" : undefined}>{children}</p>;
                      },
                      a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">{children}</a>,
                    }}
                  >
                    {stripLegacy(m.text)}
                  </ReactMarkdown>
                )}

                {/* Catalogue produits renvoyés par WAOUH */}
                {Array.isArray((m as any).meta?.products) && (m as any).meta.products.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2 not-prose">
                    {((m as any).meta.products as any[]).slice(0, 6).map((p, i) => {
                      const photo = Array.isArray(p.photos) ? p.photos[0] : (p.photo || p.image || null);
                      const price = p.prix_min && p.prix_max && p.prix_min !== p.prix_max
                        ? `${Number(p.prix_min).toLocaleString()} - ${Number(p.prix_max).toLocaleString()} F`
                        : (p.prix_min || p.prix_max) ? `${Number(p.prix_min || p.prix_max).toLocaleString()} F` : "";
                      return (
                        <div key={i} className="rounded-lg overflow-hidden border border-border bg-card">
                          <div className="aspect-square bg-muted relative">
                            {photo ? (
                              <ChatImage src={photo} caption={p.nom} className="w-full h-full" imgClassName="aspect-square" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Pas d'image</div>
                            )}
                          </div>
                          <div className="p-1.5">
                            <div className="text-[11px] font-semibold truncate text-foreground">{p.nom}</div>
                            {price && <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{price}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {m.direction === "out" && Array.isArray((m as any).meta?.actions) && (m as any).meta.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 not-prose">
                    {((m as any).meta.actions as WaouhAction[]).slice(0, 4).map((a, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={async () => {
                          if (a.url) {
                            // In Capacitor, opening wa.me kicks the user to WhatsApp.
                            // Keep the user inside the app by ignoring WhatsApp deep-links.
                            try {
                              const { Capacitor } = await import("@capacitor/core");
                              if (Capacitor.isNativePlatform() && /(?:wa\.me|api\.whatsapp\.com|whatsapp:)/i.test(a.url)) {
                                toast({ title: "Action désactivée dans l'app", description: "Continuez la conversation ici." });
                                return;
                              }
                            } catch {}
                            window.open(a.url, "_blank");
                            return;
                          }
                          const kw = /accept/i.test(a.id) ? "OUI"
                            : /refuse/i.test(a.id) ? "NON"
                            : /counter|negociat/i.test(a.id) ? "Je propose "
                            : a.id.startsWith("intéressé") ? a.id
                            : a.label;
                          if (kw.endsWith(" ")) { setInput(kw); setTimeout(() => inputRef.current?.focus(), 0); }
                          else sendCore(kw, []);
                        }}
                      >{a.label}</Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {m.meta?.transaction_id && m.meta?.intent !== "contact_exchange" && m.meta?.intent !== "negotiation_open" && m.meta?.intent !== "match_seller" && (
              <div className="flex justify-start mt-1">
                <WaouhTransactionCard transactionId={m.meta.transaction_id} onPay={onPay} />
              </div>
            )}

          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-2xl px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> WAOUH réfléchit…
            </div>
          </div>
        )}
      </div>

      {pendingAtts.length > 0 && (
        <div className="px-2 pt-2 flex gap-2 border-t bg-muted/20 shrink-0">
          {pendingAtts.map((a, i) => (
            <div key={i} className="relative">
              <img src={a.url} className="w-14 h-14 rounded-md object-cover border" alt="" />
              <button
                type="button"
                onClick={() => setPendingAtts((p) => p.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-[10px] leading-none"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {variant !== "native" && <WaouhQuickActions onAction={handleQuickAction} disabled={sending} />}
      {variant === "native" && composerTopSlot}

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 p-2 border-t bg-background shrink-0"
      >
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Button
          type="button" size="icon" variant="ghost"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading || sending || pendingAtts.length >= MAX_PHOTOS}
          aria-label="Prendre une photo"
          title="Prendre une photo"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </Button>
        <Button
          type="button" size="icon" variant="ghost"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading || sending || pendingAtts.length >= MAX_PHOTOS}
          aria-label="Choisir depuis la galerie"
          title={`Galerie (${pendingAtts.length}/${MAX_PHOTOS})`}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Votre message…"
          disabled={sending}
          rows={1}
          className="flex-1 resize-none min-h-[40px] max-h-32 text-base sm:text-sm"
        />
        <Button type="submit" size="icon" disabled={sending || (!input.trim() && pendingAtts.length === 0)}>
          <Send className="w-4 h-4" />
        </Button>
      </form>

      <WaouhAuthGate open={authOpen} onOpenChange={setAuthOpen} sessionId={sessionId} />
      {paymentTx && (
        <WaouhPaymentDialog
          open={!!paymentTx}
          onOpenChange={(v) => !v && setPaymentTx(null)}
          transactionId={paymentTx.id}
          amount={paymentTx.amount}
        />
      )}
      {variant === "native" ? (
        <NativeSellSheet
          open={sellOpen}
          onOpenChange={setSellOpen}
          sessionId={sessionId}
          defaultCity={geo.city}
          onSubmit={async (text, atts) => { await sendCore(text, atts); }}
        />
      ) : (
        <WaouhSellWizard
          open={sellOpen}
          onOpenChange={setSellOpen}
          sessionId={sessionId}
          defaultCity={geo.city}
          onSubmit={async (text, atts) => { await sendCore(text, atts); }}
        />
      )}
    </Card>
  );

  if (embedded || fullscreen) return Panel;

  return (
    <>
      {open && Panel}
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-cyan-500 to-blue-500 hover:scale-105 transition z-50"
        aria-label="Ouvrir WAOUH"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>
    </>
  );
});
WaouhWebChat.displayName = "WaouhWebChat";

export default WaouhWebChat;
