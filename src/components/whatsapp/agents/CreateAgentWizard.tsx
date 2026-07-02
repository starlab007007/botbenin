import React, { useState, useEffect, useRef } from "react";
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
import { SECTOR_TEMPLATES, SectorTemplate } from "@/config/agent-templates";
import { Mic, Image as ImageIcon, Type, Trash2, Plus, Bot, Loader2, ChevronRight, ChevronLeft } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (agentId: string) => void;
}

type Product = { name: string; price_fcfa?: number | null; description?: string | null; _tempId?: string };

const STEPS = ["Secteur", "Personnalité", "Catalogue", "Connaissances", "Connexion"];

export function CreateAgentWizard({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const { accounts } = useWhatsAppAccounts();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [template, setTemplate] = useState<SectorTemplate>(SECTOR_TEMPLATES[0]);
  const [agentName, setAgentName] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [tone, setTone] = useState("");
  const [emojis, setEmojis] = useState(true);
  const [caps, setCaps] = useState(SECTOR_TEMPLATES[0].capabilities);

  const [products, setProducts] = useState<Product[]>([]);
  const [knowledge, setKnowledge] = useState("");
  const [knowledgeUrl, setKnowledgeUrl] = useState("");

  const [selectedSession, setSelectedSession] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [parsing, setParsing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    setPersonaName(template.persona.name);
    setTone(template.persona.tone);
    setEmojis(template.persona.emojis);
    setCaps(template.capabilities);
    if (products.length === 0 && template.sample_products.length) {
      setProducts(template.sample_products.map((p) => ({ ...p, _tempId: crypto.randomUUID() })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const resetAndClose = () => {
    setStep(0); setAgentName(""); setProducts([]); setKnowledge(""); setKnowledgeUrl("");
    setSelectedSession(""); setTemplate(SECTOR_TEMPLATES[0]);
    onClose();
  };

  // ===== Voice capture for mini-catalog =====
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await parseVoiceBlob(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      toast({ title: "Micro indisponible", description: e.message, variant: "destructive" });
    }
  };
  const stopVoice = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const parseVoiceBlob = async (blob: Blob) => {
    setParsing(true);
    try {
      const b64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("waouh-agent-parse-catalog", {
        body: { mode: "voice", audio_base64: b64, audio_format: "webm" },
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

  const addEmptyProduct = () =>
    setProducts((p) => [...p, { name: "", price_fcfa: null, description: "", _tempId: crypto.randomUUID() }]);
  const updateProduct = (id: string, patch: Partial<Product>) =>
    setProducts((p) => p.map((x) => (x._tempId === id ? { ...x, ...patch } : x)));
  const removeProduct = (id: string) => setProducts((p) => p.filter((x) => x._tempId !== id));

  const canNext = () => {
    if (step === 0) return !!agentName.trim();
    if (step === 1) return !!personaName.trim();
    return true;
  };

  const submit = async () => {
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non connecté");

      const { data: agent, error } = await (supabase as any).from("waouh_ai_agents").insert({
        user_id: userData.user.id,
        name: agentName.trim(),
        sector: template.id,
        template_id: template.id,
        persona: { name: personaName.trim(), tone, emojis },
        capabilities: caps,
        waha_session_name: selectedSession || null,
        status: selectedSession ? "active" : "draft",
      }).select("*").single();
      if (error) throw error;

      // Save products
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

      // Ingest knowledge (starter FAQ + user text + url)
      const faqText = template.starter_faq.map((f) => `Q: ${f.q}\nR: ${f.a}`).join("\n\n");
      const combined = [faqText, knowledge].filter(Boolean).join("\n\n---\n\n");
      if (combined.trim()) {
        await supabase.functions.invoke("waouh-agent-ingest", {
          body: { agent_id: agent.id, source_type: "text", text: combined },
        });
      }
      if (knowledgeUrl.trim()) {
        supabase.functions.invoke("waouh-agent-ingest", {
          body: { agent_id: agent.id, source_type: "url", url: knowledgeUrl.trim() },
        });
      }

      toast({ title: "🤖 Agent créé !", description: selectedSession ? "Connecté à WhatsApp." : "Brouillon enregistré." });
      onCreated?.(agent.id);
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

          {step === 2 && (
            <>
              <div className="text-sm text-muted-foreground">
                Construisez votre mini-catalogue directement ici. Aucun besoin d'importer depuis ailleurs.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={recording ? "destructive" : "outline"} onClick={recording ? stopVoice : startVoice} disabled={parsing}>
                  <Mic className="w-4 h-4 mr-1" />
                  {recording ? "Arrêter" : "Dicter à la voix"}
                </Button>
                <label className="cursor-pointer">
                  <Button size="sm" variant="outline" type="button" asChild disabled={parsing}>
                    <span><ImageIcon className="w-4 h-4 mr-1" />Photo du menu / prix</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && parseImage(e.target.files[0])} />
                </label>
                <Button size="sm" variant="outline" onClick={addEmptyProduct}>
                  <Plus className="w-4 h-4 mr-1" />Ajouter à la main
                </Button>
                {parsing && <Badge variant="secondary"><Loader2 className="w-3 h-3 animate-spin mr-1" />IA en cours…</Badge>}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {products.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucun produit encore. Dictez, prenez une photo, ou ajoutez à la main.
                  </p>
                )}
                {products.map((p) => (
                  <div key={p._tempId} className="border rounded-lg p-2 flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input value={p.name} onChange={(e) => updateProduct(p._tempId!, { name: e.target.value })} placeholder="Nom du produit" className="h-8" />
                      <div className="flex gap-2">
                        <Input type="number" value={p.price_fcfa ?? ""} onChange={(e) => updateProduct(p._tempId!, { price_fcfa: e.target.value ? parseInt(e.target.value) : null })} placeholder="Prix FCFA" className="h-8 w-32" />
                        <Input value={p.description || ""} onChange={(e) => updateProduct(p._tempId!, { description: e.target.value })} placeholder="Description (optionnel)" className="h-8 flex-1" />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeProduct(p._tempId!)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-sm text-muted-foreground">
                Ajoutez des informations complémentaires : horaires, zone de livraison, politique de retour, FAQ, etc.
                L'IA s'en servira pour répondre plus précisément.
              </div>
              <div>
                <Label className="flex items-center gap-1"><Type className="w-3 h-3" />Texte libre</Label>
                <Textarea rows={6} value={knowledge} onChange={(e) => setKnowledge(e.target.value)}
                  placeholder="Ex: Nous livrons à Cotonou et Calavi. Paiement Mobile Money accepté. Retour possible sous 48h..." />
              </div>
              <div>
                <Label>URL de votre site / page Facebook (optionnel)</Label>
                <Input value={knowledgeUrl} onChange={(e) => setKnowledgeUrl(e.target.value)} placeholder="https://..." />
              </div>
              {template.starter_faq.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  ✨ {template.starter_faq.length} FAQ du secteur "{template.label}" seront ajoutées automatiquement.
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="text-sm">
                Connectez cet agent à une session WhatsApp pour qu'il commence à répondre.
                Vous pourrez aussi le laisser en brouillon et le connecter plus tard.
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
                    Aucune session WhatsApp. Connectez d'abord un compte via l'onglet WhatsApp.
                  </p>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <div className="font-semibold text-green-800">Récapitulatif</div>
                <div className="text-green-700 mt-1 space-y-0.5">
                  <div>• Agent : <b>{agentName}</b> ({template.emoji} {template.label})</div>
                  <div>• Persona : <b>{personaName}</b> ({tone})</div>
                  <div>• Produits : <b>{products.filter((p) => p.name.trim()).length}</b></div>
                  <div>• Base de connaissance : <b>{[knowledge, knowledgeUrl].filter(Boolean).length + template.starter_faq.length} entrée(s)</b></div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || busy}>
            <ChevronLeft className="w-4 h-4 mr-1" />Précédent
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Suivant<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={busy} className="bg-green-600 hover:bg-green-700">
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Bot className="w-4 h-4 mr-1" />}
              Créer l'agent
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// helpers
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
