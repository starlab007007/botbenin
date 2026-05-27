import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ArrowLeft, Mail, Lock, User, Loader2, Info } from "lucide-react";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SegmentedTabs } from "@/app-mobile/components/auth/SegmentedTabs";
import { NativeTextField } from "@/app-mobile/components/auth/NativeTextField";
import { GoogleButton } from "@/app-mobile/components/auth/GoogleButton";
import { PasswordStrengthBar } from "@/app-mobile/components/auth/PasswordStrengthBar";

type Tab = "login" | "register" | "reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailAuthScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "login";
  const { login, register, resetPassword, loginWithGoogle, isAuthenticated } = useAuth();

  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/app/chat", { replace: true });
  }, [isAuthenticated, navigate]);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {};
    if (submitted) {
      if (tab !== "reset" && tab === "register" && !name.trim()) e.name = "Nom requis";
      if (!EMAIL_RE.test(email)) e.email = "Email invalide";
      if (tab !== "reset" && password.length < 6) e.password = "Min. 6 caractères";
      if (tab === "register" && password !== confirm) e.confirm = "Ne correspond pas";
    }
    return e;
  }, [submitted, tab, email, password, confirm, name]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    try {
      await loginWithGoogle();
    } catch {
      toast.error("Erreur Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (tab === "login") {
      if (!EMAIL_RE.test(email) || password.length < 6) {
        Haptics.notification({ type: NotificationType.Error }).catch(() => {});
        return;
      }
      setLoading(true);
      try {
        const ok = await login(email, password);
        if (ok) {
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          toast.success("Connexion réussie");
          navigate("/app/chat", { replace: true });
        } else {
          Haptics.notification({ type: NotificationType.Error }).catch(() => {});
          toast.error("Identifiants invalides");
        }
      } finally { setLoading(false); }
    } else if (tab === "register") {
      if (!name.trim() || !EMAIL_RE.test(email) || password.length < 6 || password !== confirm) {
        Haptics.notification({ type: NotificationType.Error }).catch(() => {});
        return;
      }
      setLoading(true);
      try {
        const ok = await register({ name, email, password, phone: "" });
        if (ok) {
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          toast.success("Compte créé ! Vérifiez votre email.");
          setTab("login");
          setPassword(""); setConfirm(""); setSubmitted(false);
        } else {
          toast.error("Erreur lors de l'inscription");
        }
      } finally { setLoading(false); }
    } else {
      if (!EMAIL_RE.test(email)) {
        Haptics.notification({ type: NotificationType.Error }).catch(() => {});
        return;
      }
      setLoading(true);
      try {
        const ok = await resetPassword(email);
        if (ok) {
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          toast.success("Email de réinitialisation envoyé");
          setTab("login"); setSubmitted(false);
        } else {
          toast.error("Erreur lors de l'envoi");
        }
      } finally { setLoading(false); }
    }
  };

  const title = tab === "login" ? "Se connecter" : tab === "register" ? "Créer un compte" : "Mot de passe";
  const cta = tab === "login" ? "Se connecter" : tab === "register" ? "Créer le compte" : "Envoyer le lien";

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-2 px-2 border-b bg-background/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 h-14 w-full">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 flex items-center justify-center rounded-full active:bg-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </header>

      {/* Scrollable content */}
      <form
        id="auth-form"
        onSubmit={submit}
        className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-5 pt-4 pb-6"
      >

        <div className="max-w-md mx-auto space-y-5">
          <SegmentedTabs
            tabs={[
              { value: "login", label: "Connexion" },
              { value: "register", label: "Inscription" },
              { value: "reset", label: "Mot de passe" },
            ]}
            value={tab}
            onChange={(v) => { setTab(v as Tab); setSubmitted(false); }}
          />

          {tab !== "reset" && (
            <>
              <GoogleButton onClick={handleGoogle} loading={googleLoading} label={tab === "register" ? "S'inscrire avec Google" : "Continuer avec Google"} />
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-border" /></div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-[11px] uppercase tracking-widest text-muted-foreground">ou par email</span>
                </div>
              </div>
            </>
          )}

          <div key={tab} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">

              {tab === "register" && (
                <NativeTextField
                  label="Nom complet"
                  icon={<User className="h-5 w-5" />}
                  placeholder="Votre nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  enterKeyHint="next"
                  error={errors.name}
                  valid={!!name.trim() && !errors.name}
                />
              )}

              <NativeTextField
                label="Email"
                icon={<Mail className="h-5 w-5" />}
                placeholder="votre@email.com"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="next"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                error={errors.email}
                valid={EMAIL_RE.test(email) && !errors.email}
              />

              {tab !== "reset" && (
                <>
                  <NativeTextField
                    label="Mot de passe"
                    icon={<Lock className="h-5 w-5" />}
                    placeholder="••••••••"
                    togglePassword
                    autoComplete={tab === "register" ? "new-password" : "current-password"}
                    enterKeyHint={tab === "register" ? "next" : "done"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                  />
                  {tab === "register" && <PasswordStrengthBar password={password} />}
                </>
              )}

              {tab === "register" && (
                <NativeTextField
                  label="Confirmer le mot de passe"
                  icon={<Lock className="h-5 w-5" />}
                  placeholder="••••••••"
                  togglePassword
                  autoComplete="new-password"
                  enterKeyHint="done"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm}
                  valid={!!confirm && password === confirm}
                />
              )}

              {tab === "reset" && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-muted/60 p-3.5 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Saisissez votre email pour recevoir un lien de réinitialisation.</p>
                </div>
              )}

              {tab === "login" && (
                <button
                  type="button"
                  onClick={() => { setTab("reset"); setSubmitted(false); }}
                  className="block w-full text-center text-sm text-primary font-medium pt-1"
                >
                  Mot de passe oublié ?
                </button>
              )}
          </div>


          <p className="text-[11px] text-center text-muted-foreground pt-4">
            En continuant, vous acceptez nos conditions d'utilisation.
          </p>
        </div>
      </form>

      {/* Sticky bottom CTA */}
      <div
        className="shrink-0 bg-background/95 backdrop-blur border-t px-5 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <button
          type="submit"
          form="auth-form"
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {cta}
        </button>
      </div>

    </div>
  );
}
