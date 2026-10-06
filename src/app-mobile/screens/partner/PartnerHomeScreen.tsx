import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, Clock3, Loader2, ShieldAlert, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { useWaouhPartner } from "@/hooks/useWaouhPartner";
import { userFacingErrorText } from "@/lib/userFacingError";
import { buildWaouhAuthRedirect } from "@/lib/waouhAccessPolicy";
import { useToast } from "@/hooks/use-toast";

/**
 * Parcours Partner canonique Web + mobile :
 * découverte authentifiée → candidature → validation → espace opérationnel.
 * Aucun compte Partner n'est auto-activé côté client.
 */
export default function PartnerHomeScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useMobileAuth();
  const { partner, loading, apply } = useWaouhPartner();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    whatsapp: "",
    ville: "",
    mobile_money_number: "",
    mobile_money_operator: "MTN",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(buildWaouhAuthRedirect("/app/partner", "/app/auth"), { replace: true });
      return;
    }
    if (loading) return;
    if (partner?.statut === "active") {
      navigate("/app/partner/businesses", { replace: true });
    }
  }, [authLoading, user, loading, partner?.statut, navigate]);

  useEffect(() => {
    if (!user || form.nom) return;
    setForm((prev) => ({
      ...prev,
      nom: (user as any).user_metadata?.full_name || user.email || "",
    }));
  }, [user, form.nom]);

  if (authLoading || loading || partner?.statut === "active") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f6f8f7]">
        <div className="rounded-3xl border bg-white px-6 py-5 shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-700" />
          <p className="mt-2 text-xs font-semibold text-slate-500">Préparation de votre espace Partner…</p>
        </div>
      </div>
    );
  }

  if (partner) {
    const pending = partner.statut === "pending";
    const suspended = partner.statut === "suspended";
    return (
      <div className="min-h-[100dvh] bg-[#f6f8f7] p-4 pb-28">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                <Store className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">WAOUH Partner</div>
                <h1 className="text-xl font-black">{partner.nom || "Mon commerce"}</h1>
              </div>
            </div>
          </div>

          <Alert className={pending ? "border-amber-200 bg-amber-50" : suspended ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}>
            {pending ? <Clock3 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            <AlertTitle>
              {pending ? "Validation en cours" : suspended ? "Compte suspendu" : "Candidature non validée"}
            </AlertTitle>
            <AlertDescription>
              {pending
                ? "Votre candidature est enregistrée. Vous recevrez une notification WAOUH dès que votre espace est activé."
                : suspended
                  ? "L’accès aux opérations Partner est suspendu. Consultez le support ou l’administrateur WAOUH."
                  : "Votre candidature doit être corrigée ou réexaminée avant l’accès aux opérations Partner."}
            </AlertDescription>
          </Alert>

          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 font-black text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Votre parcours reste synchronisé
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Ventes, commissions, versements et alertes de stock apparaîtront dans la même cloche WAOUH et sur vos appareils dès activation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!form.nom.trim() || !form.telephone.trim() || !form.ville.trim()) {
      toast({
        title: "Informations à compléter",
        description: "Nom, téléphone et ville sont obligatoires.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      await apply({
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        whatsapp: form.whatsapp.trim() || form.telephone.trim(),
        ville: form.ville.trim(),
        mobile_money_number: form.mobile_money_number.trim() || undefined,
        mobile_money_operator: form.mobile_money_operator.trim() || undefined,
        statut: "pending",
      });
      toast({
        title: "Candidature envoyée",
        description: "Vous serez notifié dès la validation de votre espace Partner.",
      });
    } catch (error) {
      console.error("[Partner] onboarding failed", error);
      toast({
        title: "Candidature non envoyée",
        description: userFacingErrorText(error, "save"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f6f8f7] p-4 pb-28">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-[30px] bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15">
              <Building2 className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">WAOUH Partner</div>
              <h1 className="text-xl font-black">Créer mon espace commerce</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Un seul espace pour catalogue, stock, ventes, commissions, versements et notifications intelligentes.
          </p>
        </div>

        <div className="space-y-4 rounded-[28px] border bg-white p-5 shadow-sm">
          <div>
            <Label>Nom / commerce</Label>
            <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du partenaire" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} inputMode="tel" placeholder="+229…" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} inputMode="tel" placeholder="Même numéro si vide" />
            </div>
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Cotonou, Abomey-Calavi…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Opérateur Mobile Money</Label>
              <Input value={form.mobile_money_operator} onChange={(e) => setForm({ ...form, mobile_money_operator: e.target.value })} />
            </div>
            <div>
              <Label>Numéro Mobile Money</Label>
              <Input value={form.mobile_money_number} onChange={(e) => setForm({ ...form, mobile_money_number: e.target.value })} inputMode="tel" />
            </div>
          </div>

          <Button className="h-12 w-full rounded-2xl font-black" disabled={submitting} onClick={submit}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
            Envoyer pour validation
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-slate-500">
            L’accès aux opérations Partner est activé uniquement après validation.
          </p>
        </div>
      </div>
    </div>
  );
}
