import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export default function CreateBotWizard() {
  const navigate = useNavigate();
  const { user } = useMobileAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [chatTitle, setChatTitle] = useState("");
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => step === 1 ? navigate(-1) : setStep((s) => s - 1);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("bots").insert({
        owner_id: user.id, name, description,
        chat_title: chatTitle || name,
        chat_context: context,
        is_active: true,
        configuration: {},
      });
      if (error) throw error;
      toast.success("Bot créé");
      navigate("/app/bots");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="bg-[hsl(165_91%_18%)] text-white px-2 py-2 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={prev} className="text-white hover:bg-white/15"><ArrowLeft /></Button>
        <div className="flex-1">
          <div className="font-semibold">Nouveau bot</div>
          <div className="text-xs text-white/70">Étape {step}/4</div>
        </div>
      </header>
      <div className="h-1 bg-muted"><div className="h-full bg-[#FF6B35] transition-all" style={{ width: `${step * 25}%` }} /></div>

      <main className="p-6 space-y-4 max-w-md mx-auto">
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold">Identifiez votre bot</h2>
            <div className="space-y-2"><Label>Nom</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Assistant boutique" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} /></div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold">Personnalité</h2>
            <div className="space-y-2"><Label>Titre du chat</Label><Input value={chatTitle} onChange={e=>setChatTitle(e.target.value)} placeholder={name} /></div>
            <div className="space-y-2"><Label>Contexte / instructions</Label><Textarea value={context} onChange={e=>setContext(e.target.value)} rows={6} placeholder="Tu es un assistant qui…" /></div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold">Canal</h2>
            <p className="text-sm text-muted-foreground">Votre bot sera accessible via le chat Waouh. Vous pourrez le connecter à WhatsApp depuis l'onglet WhatsApp IA.</p>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold">Récapitulatif</h2>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div><span className="text-muted-foreground">Nom: </span>{name || "—"}</div>
              <div><span className="text-muted-foreground">Description: </span>{description || "—"}</div>
              <div><span className="text-muted-foreground">Contexte: </span>{context.slice(0, 80) || "—"}</div>
            </div>
          </>
        )}

        <div className="pt-4">
          {step < 4 ? (
            <Button className="w-full h-12" onClick={next} disabled={step === 1 && !name.trim()}>
              Continuer <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button className="w-full h-12 bg-[#FF6B35] hover:bg-[#e85a25]" onClick={submit} disabled={saving}>
              <Check className="mr-2 h-4 w-4" /> {saving ? "Création…" : "Créer le bot"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
