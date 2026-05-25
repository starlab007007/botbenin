import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { toast } from "sonner";
import { MessageCircle, Smartphone, Contact } from "lucide-react";

const normalize = (raw: string) => {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
};

export const NewChatSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { user } = useMobileAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"web" | "whatsapp">("whatsapp");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user) return;
    const p = normalize(phone);
    if (!p || p.length < 8) { toast.error("Numéro invalide"); return; }
    setBusy(true);
    try {
      const { data: existing } = await supabase
        .from("waouh_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone_number", p)
        .eq("channel", channel)
        .maybeSingle();

      let id = existing?.id;
      if (!id) {
        const { data, error } = await supabase
          .from("waouh_conversations")
          .insert({ user_id: user.id, phone_number: p, channel, state: "open", context: {} })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }
      onOpenChange(false);
      navigate(`/app/chat/${id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally { setBusy(false); }
  };

  const pickContact = async () => {
    try {
      const { Contacts } = await import("@capacitor-community/contacts");
      const perm = await Contacts.requestPermissions();
      if (perm.contacts !== "granted") { toast.error("Permission refusée"); return; }
      const res: any = await Contacts.pickContact({ projection: { phones: true } });
      const num = res?.contact?.phones?.[0]?.number;
      if (num) setPhone(num);
      else toast.info("Aucun numéro trouvé");
    } catch {
      toast.info("Contacts indisponibles sur le web");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[hsl(165_91%_25%)]" /> Nouveau chat Waouh</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Numéro de téléphone</Label>
            <div className="flex gap-2 mt-1">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+229 90 00 00 00" inputMode="tel" />
              <Button variant="outline" size="icon" onClick={pickContact}><Contact className="h-4 w-4" /></Button>
            </div>
          </div>
          <div>
            <Label>Canal</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button variant={channel === "whatsapp" ? "default" : "outline"} onClick={() => setChannel("whatsapp")} className={channel === "whatsapp" ? "bg-[#25D366] hover:bg-[#1da851]" : ""}>
                <Smartphone className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
              <Button variant={channel === "web" ? "default" : "outline"} onClick={() => setChannel("web")}>
                <MessageCircle className="h-4 w-4 mr-2" /> Web
              </Button>
            </div>
          </div>
          <Button onClick={create} disabled={busy} className="w-full bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)]">
            {busy ? "Création…" : "Démarrer la conversation"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NewChatSheet;
