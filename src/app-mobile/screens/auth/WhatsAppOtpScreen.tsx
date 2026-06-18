import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useWhatsAppOtpFlow } from "@/hooks/useWhatsAppOtpFlow";
import { useEffect } from "react";

export default function WhatsAppOtpScreen() {
  const navigate = useNavigate();
  const flow = useWhatsAppOtpFlow();

  useEffect(() => {
    if (flow.step === "done") {
      let target = "/app/chat";
      try {
        const t = sessionStorage.getItem("waouh_post_auth_redirect");
        if (t) { sessionStorage.removeItem("waouh_post_auth_redirect"); target = t; }
      } catch {}
      navigate(target, { replace: true });
    }
  }, [flow.step, navigate]);

  const back = () => {
    if (flow.step === "otp") flow.setStep("phone");
    else if (flow.step === "profile") return; // forbid back during profile
    else navigate(-1);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex items-center gap-3 px-4 h-14 border-b">
        <Button variant="ghost" size="icon" onClick={back}><ArrowLeft /></Button>
        <h1 className="text-lg font-semibold">WhatsApp</h1>
      </header>
      <div className="p-6 max-w-sm mx-auto space-y-6">
        <div className="flex justify-center text-[#25D366]"><MessageCircle className="h-16 w-16" /></div>

        {flow.step === "phone" && (
          <>
            <div className="space-y-2">
              <Label>Numéro WhatsApp</Label>
              <Input type="tel" value={flow.phone} onChange={(e) => flow.setPhone(e.target.value)} placeholder="+22997000000" />
              <p className="text-xs text-muted-foreground">
                Le code sera envoyé directement sur <span className="font-medium text-[#25D366]">WhatsApp</span>.
                Assurez-vous que ce numéro possède bien un compte WhatsApp actif.
              </p>
            </div>
            <Button onClick={flow.sendCode} disabled={flow.loading || flow.phone.length < 8} className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]">
              {flow.loading ? "..." : "Envoyer le code"}
            </Button>
          </>
        )}

        {flow.step === "otp" && (
          <>
            <div className="space-y-2 flex flex-col items-center">
              <Label>Code reçu sur {flow.phone}</Label>
              <InputOTP maxLength={6} value={flow.code} onChange={flow.setCode}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={flow.verifyCode} disabled={flow.loading || flow.code.length !== 6} className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]">
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
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">Complétez votre profil</h2>
              <p className="text-sm text-muted-foreground">Pour finaliser votre compte WaouhApp</p>
            </div>
            <div className="space-y-2">
              <Label>Nom complet *</Label>
              <Input value={flow.fullName} onChange={(e) => flow.setFullName(e.target.value)} placeholder="Votre nom complet" />
            </div>
            <div className="space-y-2">
              <Label>Email (optionnel)</Label>
              <Input type="email" value={flow.email} onChange={(e) => flow.setEmail(e.target.value)} placeholder="votre@email.com" />
              <p className="text-xs text-muted-foreground">Utile pour récupérer votre compte.</p>
            </div>
            <Button onClick={flow.completeProfile} disabled={flow.loading || flow.fullName.trim().length < 2} className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]">
              {flow.loading ? "..." : "Terminer"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
