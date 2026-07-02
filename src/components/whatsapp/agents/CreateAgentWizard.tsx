import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppAccounts } from "@/hooks/useWhatsAppAccounts";
import { useWaouhPartner } from "@/hooks/useWaouhPartner";
import { SECTOR_TEMPLATES, SectorTemplate } from "@/config/agent-templates";
import {
  Mic, Image as ImageIcon, Type, Trash2, Plus, Bot, Loader2,
  ChevronRight, ChevronLeft, ShoppingBag, FileText, Globe, ExternalLink, Send, Sparkles,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (agentId: string) => void;
}

type Product = { name: string; price_fcfa?: number | null; description?: string | null; _tempId?: string };
type AgentType = "commerce" | "docs" | "website";
type PartnerProduct = {
  id: string; nom: string; description: string | null;
  prix_min: number | null; prix_max: number | null; unite: string | null;
  categorie: string | null; disponible: boolean;
  business_id: string; business_name?: string;
};
type PartnerBusiness = { id: string; nom_entreprise: string; code_court: string | null };

const STEPS = ["Type & Secteur", "Personnalité", "Contenu", "Connaissances", "Test", "Connexion"];

export function CreateAgentWizard({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const { accounts } = useWhatsAppAccounts();
  const { partner } = useWaouhPartner();
  const location = useLocation();
  const isMobileApp = location.pathname.startsWith("/app");
  const partnerBusinessesHref = isMobileApp ? "/app/partner/businesses" : "/partner/businesses";
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [agentType, setAgentType] = useState<AgentType>("commerce");
  const [template, setTemplate] = useState<SectorTemplate>(SECTOR_TEMPLATES[0]);
  const [agentName, setAgentName] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [tone, setTone] = useState("");
  const [emojis, setEmojis] = useState(true);
  const [caps, setCaps] = useState(SECTOR_TEMPLATES[0].capabilities);

  // Commerce mode
  const [partnerBusinesses, setPartnerBusinesses] = useState<PartnerBusiness[]>([]);
  const [partnerProducts, setPartnerProducts] = useState<PartnerProduct[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());
  const [activeBusinessId, setActiveBusinessId] = useState<string | "all">("all");
  const [products, setProducts] = useState<Product[]>([]);

  // Docs mode
  const [docFiles, setDocFiles] = useState<Array<{ name: string; storage_path: string; size: number }>>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Website mode
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [crawlSite, setCrawlSite] = useState(true);

  // Knowledge (all modes)
  const [knowledge, setKnowledge] = useState("");
  const [knowledgeUrl, setKnowledgeUrl] = useState("");

  // Connect
  const [selectedSession, setSelectedSession] = useState<string>("");

  // Voice / image capture
  const [recording, setRecording] = useState(false);
  const [parsing, setParsing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recMimeRef = useRef<string>("audio/webm");

  // Sandbox / preview (step 4)
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [previewMsgs, setPreviewMsgs] = useState<Array<{ role: string; content: string }>>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    setPersonaName(template.persona.name);
    setTone(template.persona.tone);
    setEmojis(template.persona.emojis);
    setCaps(template.capabilities);
    if (agentType === "commerce" && products.length === 0 && template.sample_products.length) {
      setProducts(template.sample_products.map((p) => ({ ...p, _tempId: crypto.randomUUID() })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // Load partner products (grouped by business) when entering commerce mode
  useEffect(() => {
    if (!open || agentType !== "commerce" || !partner?.id) return;
    (async () => {
      const { data: biz } = await (supabase as any)
        .from("waouh_partner_businesses")
        .select("id, nom_entreprise, code_court")
        .eq("partner_id", partner.id)
        .order("nom_entreprise");
      const businesses = (biz as PartnerBusiness[]) || [];
      setPartnerBusinesses(businesses);
      const { data: prods } = await (supabase as any)
        .from("waouh_partner_products")
        .select("id, nom, description, prix_min, prix_max, unite, categorie, disponible, business_id")
        .eq("partner_id", partner.id)
        .order("nom");
      const bizMap = new Map(businesses.map((b) => [b.id, b.nom_entreprise]));
      const list = ((prods as PartnerProduct[]) || []).map((p) => ({
        ...p, business_name: bizMap.get(p.business_id) || "—",
      }));
      setPartnerProducts(list);
    })();
  }, [open, agentType, partner?.id]);

  const resetAndClose = () => {
    setStep(0); setAgentName(""); setProducts([]); setKnowledge(""); setKnowledgeUrl("");
    setSelectedSession(""); setTemplate(SECTOR_TEMPLATES[0]); setAgentType("commerce");
    setDocFiles([]); setWebsiteUrl(""); setSelectedPartnerIds(new Set());
    setCreatedAgentId(null); setPreviewMsgs([]);
    onClose();
  };

  // ===== Voice / Image (commerce mini-catalog) =====
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recMimeRef.current = mr.mimeType || "audio/webm";
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recMimeRef.current });
        if (blob.size < 2000) {
          toast({ title: "Enregistrement trop court", description: "Parlez au moins 2 secondes.", variant: "destructive" });
          return;
        }
        await parseVoiceBlob(blob, recMimeRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast({ title: "Micro indisponible", description: e.message, variant: "destructive" });
    }
  };
  const stopVoice = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const parseVoiceBlob = async (blob: Blob, mime: string) => {
    setParsing(true);
    try {
      const b64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("waouh-agent-parse-catalog", {
        body: { mode: "voice", audio_base64: b64, audio_format: mime },
      });
      if (error) throw error;
      const newP = (data?.products || []).map((p: any) => ({ ...p, _tempId: crypto.randomUUID() }));
      setProducts((prev) => [...prev, ...newP]);
      toast({ title: `+${newP.length} produits ajoutés depuis la voix 🎙️` });
    } catch (e: any) {
      toast({ title: "Erreur reconnaissance vocale", description: e.message, variant: "destructive" });
    } finally { setParsing(false); }
  };

  const parseImage = async (file: File) => {
    setParsing(true);
    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("waouh-agent-parse-catalog", {
        body: { mode: "image", image_base64: b64, image_mime: file.type },
      });
      if (error) throw error;
      const newP = (data?.products || []).map((p: any) => ({ ...p, _tempId: crypto.randomUUID() }));
      setProducts((prev) => [...prev, ...newP]);
      toast({ title: `+${newP.length} produits ajoutés depuis la photo 📸` });
    } catch (e: any) {
      toast({ title: "Erreur analyse image", description: e.message, variant: "destructive" });
    } finally { setParsing(false); }
  };

  // ===== Docs upload =====
  const uploadDoc = async (file: File) => {
    setUploadingDoc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("agent-documents").upload(path, file, { upsert: false });
      if (error) throw error;
      setDocFiles((prev) => [...prev, { name: file.name, storage_path: path, size: file.size }]);
      toast({ title: `📄 ${file.name} téléversé` });
    } catch (e: any) {
      toast({ title: "Erreur téléversement", description: e.message, variant: "destructive" });
    } finally { setUploadingDoc(false); }
  };
  const removeDoc = async (path: string) => {
    await supabase.storage.from("agent-documents").remove([path]).catch(() => null);
    setDocFiles((prev) => prev.filter((f) => f.storage_path !== path));
  };

  const addEmptyProduct = () =>
    setProducts((p) => [...p, { name: "", price_fcfa: null, description: "", _tempId: crypto.randomUUID() }]);
  const updateProduct = (id: string, patch: Partial<Product>) =>
    setProducts((p) => p.map((x) => (x._tempId === id ? { ...x, ...patch } : x)));
  const removeProduct = (id: string) => setProducts((p) => p.filter((x) => x._tempId !== id));

  const togglePartner = (id: string) => {
    setSelectedPartnerIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const canNext = () => {
    if (step === 0) return !!agentName.trim();
    if (step === 1) return !!personaName.trim();
    if (step === 2) {
      if (agentType === "website") return !!websiteUrl.trim();
      if (agentType === "docs") return docFiles.length > 0;
      return true;
    }
    return true;
  };

  // ===== Create agent (step -> 4) =====
  const createDraft = async () => {
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non connecté");

      const { data: agent, error } = await (supabase as any).from("waouh_ai_agents").insert({
        user_id: userData.user.id,
        name: agentName.trim(),
        sector: template.id,
        template_id: template.id,
        agent_type: agentType,
        website_url: agentType === "website" ? websiteUrl.trim() : null,
        persona: { name: personaName.trim(), tone, emojis },
        capabilities: caps,
        status: "testing",
      }).select("*").single();
      if (error) throw error;

      // Commerce: save manual products + link partner products
      if (agentType === "commerce") {
        const validProducts = products.filter((p) => p.name.trim());
        if (validProducts.length) {
          await (supabase as any).from("waouh_ai_agent_products").insert(
            validProducts.map((p, i) => ({
              agent_id: agent.id, user_id: userData.user.id,
              name: p.name.trim(),
              price_fcfa: p.price_fcfa || null,
              description: p.description || null,
              position: i,
            })),
          );
        }
        if (selectedPartnerIds.size) {
          await (supabase as any).from("waouh_ai_agent_partner_products").insert(
            Array.from(selectedPartnerIds).map((product_id) => ({
              agent_id: agent.id, product_id, user_id: userData.user.id,
            })),
          );
        }
      }

      // Ingest sources based on type
      const faqText = template.starter_faq.map((f) => `Q: ${f.q}\nR: ${f.a}`).join("\n\n");
      const combinedText = [faqText, knowledge].filter(Boolean).join("\n\n---\n\n");
      if (combinedText.trim()) {
        await supabase.functions.invoke("waouh-agent-ingest", {
          body: { agent_id: agent.id, source_type: "text", text: combinedText },
        });
      }
      if (knowledgeUrl.trim()) {
        await supabase.functions.invoke("waouh-agent-ingest", {
          body: { agent_id: agent.id, source_type: "url", url: knowledgeUrl.trim() },
        });
      }
      if (agentType === "website" && websiteUrl.trim()) {
        await supabase.functions.invoke("waouh-agent-ingest", {
          body: { agent_id: agent.id, source_type: "website", url: websiteUrl.trim(), crawl: crawlSite },
        });
      }
      if (agentType === "docs") {
        for (const f of docFiles) {
          await supabase.functions.invoke("waouh-agent-ingest", {
            body: { agent_id: agent.id, source_type: "doc", storage_path: f.storage_path, filename: f.name },
          });
        }
      }

      setCreatedAgentId(agent.id);
      toast({ title: "🤖 Agent prêt à tester", description: "Discutez avec lui avant de le déployer." });
      setStep(4);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  // ===== Sandbox chat (step 4) =====
  const sendPreview = async () => {
    if (!createdAgentId) return;
    const q = previewInput.trim();
    if (!q) return;
    setPreviewInput("");
    setPreviewMsgs((m) => [...m, { role: "user", content: q }]);
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("waouh-agent-chat", {
        body: { agent_id: createdAgentId, message: q, history: previewMsgs, persist: false },
      });
      if (error) throw error;
      setPreviewMsgs((m) => [...m, { role: "assistant", content: data?.reply || "…" }]);
    } catch (e: any) {
      setPreviewMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally { setPreviewLoading(false); }
  };

  // ===== Final deploy (step 5) =====
  const deploy = async () => {
    if (!createdAgentId) return;
    setBusy(true);
    try {
      await (supabase as any).from("waouh_ai_agents").update({
        waha_session_name: selectedSession || null,
        status: selectedSession ? "active" : "draft",
      }).eq("id", createdAgentId);
      toast({
        title: selectedSession ? "🚀 Agent déployé sur WhatsApp" : "💾 Enregistré comme brouillon",
        description: selectedSession ? "Il répond dès maintenant." : "Vous pourrez le connecter plus tard.",
      });
      onCreated?.(createdAgentId);
      resetAndClose();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-green-600" />
            Nouvel Agent IA — {STEPS[step]}
          </DialogTitle>
          <div className="flex gap-1 pt-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded ${i <= step ? "bg-green-500" : "bg-muted"}`} />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {step === 0 && (
            <>
              <div>
                <Label>Nom de l'agent (ou de votre activité)</Label>
                <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Ex: Boutique Chic Cotonou" />
              </div>
              <div>
                <Label>Type d'agent</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {([
                    { id: "commerce", label: "Commerce", icon: ShoppingBag, desc: "Vend vos produits/services" },
                    { id: "docs", label: "Documents", icon: FileText, desc: "Répond via PDF/Word" },
                    { id: "website", label: "Site Web", icon: Globe, desc: "Répond via votre site" },
                  ] as const).map((t) => {
                    const Icon = t.icon;
                    const active = agentType === t.id;
                    return (
                      <button key={t.id} type="button" onClick={() => setAgentType(t.id)}
                        className={`text-left p-3 rounded-lg border-2 transition ${active ? "border-green-500 bg-green-50" : "border-muted hover:border-green-200"}`}>
                        <Icon className={`w-5 h-5 ${active ? "text-green-600" : "text-muted-foreground"}`} />
                        <div className="font-medium text-sm mt-1">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Secteur d'activité</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SECTOR_TEMPLATES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTemplate(t)}
                      className={`text-left p-3 rounded-lg border-2 transition ${template.id === t.id ? "border-green-500 bg-green-50" : "border-muted hover:border-green-200"}`}>
                      <div className="text-2xl">{t.emoji}</div>
                      <div className="font-medium text-sm">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <Label>Prénom de votre assistant IA</Label>
                <Input value={personaName} onChange={(e) => setPersonaName(e.target.value)} placeholder="Ex: Aïcha" />
              </div>
              <div>
                <Label>Ton / Personnalité</Label>
                <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="chaleureux et vendeur" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Utiliser des emojis 🎉</Label>
                <Switch checked={emojis} onCheckedChange={setEmojis} />
              </div>
              <div className="border-t pt-3 space-y-2">
                <div className="text-sm font-semibold">Que doit-il faire ?</div>
                {[
                  ["qa", "Répondre aux questions"],
                  ["sell", "Présenter et vendre les produits"],
                  ["appointments", "Prendre des rendez-vous"],
                  ["qualify", "Qualifier les prospects"],
                  ["handoff", "Passer la main à l'humain si besoin"],
                ].map(([k, l]) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="font-normal">{l}</Label>
                    <Switch checked={(caps as any)[k]} onCheckedChange={(v) => setCaps({ ...caps, [k]: v })} />
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && agentType === "commerce" && (
            <>
              <div className="text-sm text-muted-foreground">
                Choisissez les produits que l'agent doit connaître. Ce sont ceux du module <b>Partenaire → Mes produits</b>.
              </div>
              {partnerProducts.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Aucun produit dans votre module Partenaire. Ajoutez-en d'abord pour que l'agent puisse les proposer.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/partner/products" onClick={resetAndClose}>
                      <ExternalLink className="w-3 h-3 mr-1" />Créer mes produits partenaire
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                  {partnerProducts.map((p) => {
                    const checked = selectedPartnerIds.has(p.id);
                    const price = p.prix_min != null
                      ? (p.prix_max && p.prix_max !== p.prix_min
                        ? `${p.prix_min.toLocaleString("fr-FR")}–${p.prix_max.toLocaleString("fr-FR")}`
                        : p.prix_min.toLocaleString("fr-FR")) + " FCFA"
                      : "prix sur demande";
                    return (
                      <label key={p.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/40">
                        <input type="checkbox" checked={checked} onChange={() => togglePartner(p.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.nom}</div>
                          <div className="text-xs text-muted-foreground truncate">{price}{p.categorie ? ` · ${p.categorie}` : ""}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{selectedPartnerIds.size} produit(s) partenaire sélectionné(s)</span>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/partner/products" target="_blank">Gérer mes produits <ExternalLink className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>

              <div className="border-t pt-3">
                <div className="text-sm font-semibold mb-2">Ajouter d'autres articles (vocal / photo / manuel)</div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={recording ? "destructive" : "outline"} onClick={recording ? stopVoice : startVoice} disabled={parsing}>
                    <Mic className="w-4 h-4 mr-1" />{recording ? "Arrêter" : "Dicter"}
                  </Button>
                  <label className="cursor-pointer">
                    <Button size="sm" variant="outline" type="button" asChild disabled={parsing}>
                      <span><ImageIcon className="w-4 h-4 mr-1" />Photo</span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && parseImage(e.target.files[0])} />
                  </label>
                  <Button size="sm" variant="outline" onClick={addEmptyProduct}>
                    <Plus className="w-4 h-4 mr-1" />Manuel
                  </Button>
                  {parsing && <Badge variant="secondary"><Loader2 className="w-3 h-3 animate-spin mr-1" />IA…</Badge>}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
                  {products.map((p) => (
                    <div key={p._tempId} className="border rounded-lg p-2 flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Input value={p.name} onChange={(e) => updateProduct(p._tempId!, { name: e.target.value })} placeholder="Nom du produit" className="h-8" />
                        <div className="flex gap-2">
                          <Input type="number" value={p.price_fcfa ?? ""} onChange={(e) => updateProduct(p._tempId!, { price_fcfa: e.target.value ? parseInt(e.target.value) : null })} placeholder="Prix FCFA" className="h-8 w-32" />
                          <Input value={p.description || ""} onChange={(e) => updateProduct(p._tempId!, { description: e.target.value })} placeholder="Description" className="h-8 flex-1" />
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removeProduct(p._tempId!)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && agentType === "docs" && (
            <>
              <div className="text-sm text-muted-foreground">
                Téléversez les documents (PDF, DOCX, TXT, MD) qui serviront de <b>source unique</b> à l'agent.
                Il ne répondra qu'à partir de leur contenu.
              </div>
              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${uploadingDoc ? "opacity-60" : "hover:bg-muted/40"}`}>
                  {uploadingDoc ? <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" /> :
                    <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />}
                  <p className="text-sm">Cliquez pour téléverser un document</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD — 20 Mo max</p>
                </div>
                <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadDoc(e.target.files[0])} disabled={uploadingDoc} />
              </label>
              <div className="space-y-1">
                {docFiles.map((f) => (
                  <div key={f.storage_path} className="flex items-center justify-between border rounded p-2 text-sm">
                    <span className="flex items-center gap-2 truncate"><FileText className="w-4 h-4 text-green-600" /> {f.name}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeDoc(f.storage_path)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && agentType === "website" && (
            <>
              <div className="text-sm text-muted-foreground">
                L'agent lira le contenu de votre site et ne répondra qu'à partir de celui-ci.
              </div>
              <div>
                <Label>URL du site web</Label>
                <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://mon-site.com" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Explorer plusieurs pages</Label>
                  <p className="text-xs text-muted-foreground">Analyse jusqu'à 15 pages du site (plus complet, plus lent)</p>
                </div>
                <Switch checked={crawlSite} onCheckedChange={setCrawlSite} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-sm text-muted-foreground">
                Informations complémentaires : horaires, zone, politique. L'IA s'en servira pour être plus précise.
              </div>
              <div>
                <Label className="flex items-center gap-1"><Type className="w-3 h-3" />Notes / FAQ (optionnel)</Label>
                <Textarea rows={5} value={knowledge} onChange={(e) => setKnowledge(e.target.value)}
                  placeholder="Ex: Livraison Cotonou/Calavi. Paiement Mobile Money. Retour sous 48h..." />
              </div>
              <div>
                <Label>Page complémentaire (optionnel)</Label>
                <Input value={knowledgeUrl} onChange={(e) => setKnowledgeUrl(e.target.value)} placeholder="https://..." />
              </div>
              {template.starter_faq.length > 0 && agentType === "commerce" && (
                <div className="text-xs text-muted-foreground">
                  ✨ {template.starter_faq.length} FAQ du secteur "{template.label}" ajoutées automatiquement.
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <div className="font-semibold text-green-800 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> Testez votre agent avant de le déployer
                </div>
                <p className="text-green-700 mt-1 text-xs">
                  Envoyez-lui quelques messages comme le ferait un vrai client. Rien n'est envoyé à WhatsApp à cette étape.
                </p>
              </div>
              <div className="border rounded-lg h-72 overflow-y-auto p-2 bg-muted/30 space-y-2">
                {previewMsgs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Ex: "Bonjour, tu vends quoi ?" · "C'est combien ?" · "Livraison Cotonou ?"
                  </p>
                )}
                {previewMsgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-green-500 text-white" : "bg-white border"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {previewLoading && <div className="text-xs text-muted-foreground"><Loader2 className="w-3 h-3 inline animate-spin mr-1" />L'agent réfléchit…</div>}
              </div>
              <div className="flex gap-2">
                <Input value={previewInput} onChange={(e) => setPreviewInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendPreview()} placeholder="Tapez comme un client WhatsApp…" />
                <Button onClick={sendPreview} disabled={previewLoading || !previewInput.trim() || !createdAgentId}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="text-sm">
                Connectez cet agent à une session WhatsApp pour qu'il commence à répondre.
                Vous pourrez aussi le laisser en brouillon.
              </div>
              <div>
                <Label>Session WhatsApp</Label>
                <select className="w-full mt-1 border rounded-md p-2 bg-background"
                  value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
                  <option value="">— Laisser en brouillon —</option>
                  {accounts.filter((a) => a.status === "connected" || a.status === "WORKING").map((a) => (
                    <option key={a.id} value={a.session_name}>{a.session_name} {a.phone_number ? `(${a.phone_number})` : ""}</option>
                  ))}
                </select>
                {accounts.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Aucune session WhatsApp active. Connectez-en une dans l'onglet WhatsApp.
                  </p>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <div className="font-semibold text-green-800">Récapitulatif</div>
                <div className="text-green-700 mt-1 space-y-0.5">
                  <div>• Agent : <b>{agentName}</b> ({template.emoji} {template.label})</div>
                  <div>• Type : <b>{agentType === "commerce" ? "Commerce" : agentType === "docs" ? "Documents" : "Site web"}</b></div>
                  <div>• Persona : <b>{personaName}</b> ({tone})</div>
                  {agentType === "commerce" && (
                    <div>• Produits : <b>{selectedPartnerIds.size} partenaires + {products.filter((p) => p.name.trim()).length} manuels</b></div>
                  )}
                  {agentType === "docs" && <div>• Documents : <b>{docFiles.length}</b></div>}
                  {agentType === "website" && <div>• Site : <b>{websiteUrl}</b></div>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || busy || step === 4 /* cannot go back after creation */}>
            <ChevronLeft className="w-4 h-4 mr-1" />Précédent
          </Button>

          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Suivant<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={createDraft} disabled={busy} className="bg-green-600 hover:bg-green-700">
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Créer et tester
            </Button>
          )}
          {step === 4 && (
            <Button onClick={() => setStep(5)} disabled={!createdAgentId}>
              Continuer<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 5 && (
            <Button onClick={deploy} disabled={busy} className="bg-green-600 hover:bg-green-700">
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Bot className="w-4 h-4 mr-1" />}
              {selectedSession ? "Déployer sur WhatsApp" : "Enregistrer en brouillon"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
