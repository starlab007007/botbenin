import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  onAuthenticated?: () => void;
}

export const WaouhAuthGate: React.FC<Props> = ({ open, onOpenChange, sessionId, onAuthenticated }) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/waouh-chat` },
      });
      if (error) throw error;
      toast({ title: "Lien envoyé", description: `Vérifiez ${email} pour finaliser.` });

      // Listen for sign-in to link session
      const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
        if (session?.user?.id) {
          await supabase.rpc("waouh_link_session", { p_session_id: sessionId, p_user_id: session.user.id });
          onAuthenticated?.();
          onOpenChange(false);
          sub.subscription.unsubscribe();
        }
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-center">Sécurisez votre paiement</DialogTitle>
          <DialogDescription className="text-center">
            Pour protéger vos transactions Mobile Money, créez un compte gratuit en 10 secondes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-medium">Votre email</label>
            <Input type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500" onClick={sendMagicLink} disabled={sending || !email.trim()}>
            {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Mail className="w-4 h-4 mr-1.5" />}
            Recevoir le lien magique
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            Pas de mot de passe — un simple clic dans votre boîte mail vous connecte.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WaouhAuthGate;
