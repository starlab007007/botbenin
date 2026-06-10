import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WAStep = "phone" | "otp" | "profile" | "done";

export function useWhatsAppOtpFlow() {
  const [step, setStep] = useState<WAStep>("phone");
  const [phone, setPhone] = useState("+229");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const startCooldown = (sec = 30) => {
    setCooldown(sec);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { if (timerRef.current) window.clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const sendCode = useCallback(async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-otp-send", { body: { phone } });
      if (error) throw error;
      if ((data as any)?.dev_code) toast.info(`Code dev: ${(data as any).dev_code}`);
      toast.success("Code envoyé sur WhatsApp");
      setStep("otp");
      startCooldown(30);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'envoi");
    } finally { setLoading(false); }
  }, [phone, cooldown]);

  const verifyCode = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-otp-verify", { body: { phone, code } });
      if (error) throw error;
      const d = data as any;
      if (!d?.email_otp || !d?.email) throw new Error("Réponse invalide");
      const { error: vErr } = await supabase.auth.verifyOtp({ email: d.email, token: d.email_otp, type: "magiclink" });
      if (vErr) throw vErr;
      const newUser = Boolean(d.is_new_user);
      setIsNewUser(newUser);
      if (newUser) { setStep("profile"); }
      else { setStep("done"); toast.success("Connecté"); }
      return { isNewUser: newUser };
    } catch (e: any) {
      toast.error(e?.message ?? "Code invalide");
      return { isNewUser: false, error: e };
    } finally { setLoading(false); }
  }, [phone, code]);

  const completeProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-complete-profile", {
        body: { full_name: fullName, email: email || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Profil enregistré");
      setStep("done");
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur enregistrement profil");
      return false;
    } finally { setLoading(false); }
  }, [fullName, email]);

  const reset = useCallback(() => {
    setStep("phone"); setCode(""); setFullName(""); setEmail(""); setIsNewUser(false);
  }, []);

  return {
    step, setStep,
    phone, setPhone,
    code, setCode,
    fullName, setFullName,
    email, setEmail,
    loading, isNewUser, cooldown,
    sendCode, verifyCode, completeProfile, reset,
  };
}
