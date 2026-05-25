import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle } from "lucide-react";

export default function WhatsAppOtpScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+229");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-otp-send", { body: { phone } });
      if (error) throw error;
      if ((data as any)?.dev_code) toast.info(`Code dev: ${(data as any).dev_code}`);
      toast.success("Code envoyé sur WhatsApp");
      setStep("otp");
    } catch (e: any) { toast.error(e.message ?? "Erreur envoi"); }
    finally { setLoading(false); }
  };

  const verifyCode = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-otp-verify", { body: { phone, code } });
      if (error) throw error;
      const d = data as any;
      if (!d?.email_otp || !d?.email) throw new Error("Réponse invalide");
      const { error: vErr } = await supabase.auth.verifyOtp({ email: d.email, token: d.email_otp, type: "magiclink" });
      if (vErr) throw vErr;
      toast.success("Connecté");
      navigate("/app/chat");
    } catch (e: any) { toast.error(e.message ?? "Code invalide"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="flex items-center gap-3 px-4 h-14 border-b">
        <Button variant="ghost" size="icon" onClick={() => step === "otp" ? setStep("phone") : navigate(-1)}><ArrowLeft /></Button>
        <h1 className="text-lg font-semibold">WhatsApp</h1>
      </header>
      <div className="p-6 max-w-sm mx-auto space-y-6">
        <div className="flex justify-center text-[#25D366]"><MessageCircle className="h-16 w-16" /></div>
        {step === "phone" ? (
          <>
            <div className="space-y-2">
              <Label>Numéro WhatsApp</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+22997000000" />
              <p className="text-xs text-muted-foreground">Vous recevrez un code à 6 chiffres par WhatsApp.</p>
            </div>
            <Button onClick={sendCode} disabled={loading || phone.length < 8} className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]">
              {loading ? "..." : "Envoyer le code"}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2 flex flex-col items-center">
              <Label>Code reçu</Label>
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={verifyCode} disabled={loading || code.length !== 6} className="w-full h-12 bg-[#25D366] hover:bg-[#1da851]">
              {loading ? "..." : "Vérifier"}
            </Button>
            <button className="text-sm text-muted-foreground w-full" onClick={sendCode} disabled={loading}>Renvoyer le code</button>
          </>
        )}
      </div>
    </div>
  );
}
