import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { MessageCircle } from "lucide-react";
import { useWhatsAppOtpFlow } from "@/hooks/useWhatsAppOtpFlow";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  redirectTo?: string;
}

export default function WhatsAppLoginDialog({ open, onOpenChange, redirectTo = "/dashboard" }: Props) {
  const navigate = useNavigate();
  const flow = useWhatsAppOtpFlow();

  useEffect(() => {
    if (flow.step === "done" && open) {
      onOpenChange(false);
      navigate(redirectTo, { replace: true });
    }
  }, [flow.step, open, navigate, redirectTo, onOpenChange]);

  useEffect(() => { if (!open) flow.reset(); /* eslint-disable-next-line */ }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!flow.loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-center text-[#25D366] mb-2"><MessageCircle className="h-12 w-12" /></div>
          <DialogTitle className="text-center">Connexion WhatsApp</DialogTitle>
          <DialogDescription className="text-center">
            {flow.step === "phone" && "Recevez un code par WhatsApp."}
            {flow.step === "otp" && `Code envoyé à ${flow.phone}`}
            {flow.step === "profile" && "Complétez votre profil pour terminer."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {flow.step === "phone" && (
            <>
              <div className="space-y-2">
                <Label>Numéro WhatsApp</Label>
                <Input type="tel" value={flow.phone} onChange={(e) => flow.setPhone(e.target.value)} placeholder="+22997000000" />
                <p className="text-xs text-muted-foreground">Vous recevrez un code à 6 chiffres.</p>
              </div>
              <Button onClick={flow.sendCode} disabled={flow.loading || flow.phone.length < 8} className="w-full h-11 bg-[#25D366] hover:bg-[#1da851] text-white">
                {flow.loading ? "..." : "Envoyer le code"}
              </Button>
            </>
          )}

          {flow.step === "otp" && (
            <>
              <div className="flex flex-col items-center gap-2">
                <Label>Code à 6 chiffres</Label>
                <InputOTP maxLength={6} value={flow.code} onChange={flow.setCode}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={flow.verifyCode} disabled={flow.loading || flow.code.length !== 6} className="w-full h-11 bg-[#25D366] hover:bg-[#1da851] text-white">
                {flow.loading ? "..." : "Vérifier"}
              </Button>
              <button
                className="text-sm text-muted-foreground w-full disabled:opacity-50"
                onClick={flow.sendCode}
                disabled={flow.loading || flow.cooldown > 0}
              >
                {flow.cooldown > 0 ? `Renvoyer dans ${flow.cooldown}s` : "Renvoyer le code"}
              </button>
            </>
          )}

          {flow.step === "profile" && (
            <>
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input value={flow.fullName} onChange={(e) => flow.setFullName(e.target.value)} placeholder="Votre nom complet" />
              </div>
              <div className="space-y-2">
                <Label>Email (optionnel)</Label>
                <Input type="email" value={flow.email} onChange={(e) => flow.setEmail(e.target.value)} placeholder="votre@email.com" />
                <p className="text-xs text-muted-foreground">Utile pour récupérer votre compte.</p>
              </div>
              <Button onClick={flow.completeProfile} disabled={flow.loading || flow.fullName.trim().length < 2} className="w-full h-11 bg-[#25D366] hover:bg-[#1da851] text-white">
                {flow.loading ? "..." : "Terminer"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
