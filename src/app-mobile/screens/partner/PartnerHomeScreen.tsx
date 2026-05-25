import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWaouhPartner } from "@/hooks/useWaouhPartner";
import { useWaouhPartnerStats } from "@/hooks/useWaouhPartnerStats";
import { useMobileAuth } from "../../hooks/useMobileAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SmartCombobox } from "@/components/ui/smart-combobox";
import { PhoneInput } from "@/components/ui/phone-input";
import { BENIN_CITY_NAMES, MOMO_OPERATORS } from "@/data/beninLocations";
import {
  partnerEnrollmentSchema,
  flattenZodErrors,
} from "@/lib/validation/waouh";
import { PartnerActivityFeed } from "@/components/waouh/PartnerActivityFeed";
import MobileScreenHeader from "../../components/MobileScreenHeader";
import MobileStatCard from "../../components/MobileStatCard";
import MobileSectionTile from "../../components/MobileSectionTile";
import {
  Building2,
  Package,
  TrendingUp,
  Wallet,
  Activity,
  Loader2,
  Receipt,
  Store,
  CheckCircle2,
} from "lucide-react";

export default function PartnerHomeScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();
  const { partner, loading, apply, refresh } = useWaouhPartner();
  const { stats } = useWaouhPartnerStats(partner?.id);
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    whatsapp: "",
    ville: "",
    mobile_money_number: "",
    mobile_money_operator: "MTN",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/app/auth");
  }, [authLoading, user, navigate]);

  // Realtime: nouvelle vente
  useEffect(() => {
    if (!partner) return;
    const ch = supabase
      .channel(`m-sales-${partner.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waouh_partner_sales",
          filter: `partner_id=eq.${partner.id}`,
        },
        (payload) => {
          const s: any = payload.new;
          toast({
            title: "🎉 Nouvelle vente !",
            description: `${Number(s.montant_vente).toLocaleString()} F · commission ${Number(s.commission_partner).toLocaleString()} F`,
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [partner?.id, toast]);

  const fmt = (n: any) => `${Number(n ?? 0).toLocaleString()} F`;

  if (loading || authLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ---- ENROLLMENT FORM ----
  if (!partner) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <MobileScreenHeader
          title="Devenir Partenaire"
          subtitle="Rejoignez le réseau Waouh Partner"
        />
        <div className="p-4 space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-[hsl(var(--wa-green)/0.08)] to-transparent p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="h-5 w-5 text-[hsl(var(--wa-green))]" />
              <h2 className="font-semibold">Gagnez une commission</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Enrôlez des commerces, ajoutez leurs produits et touchez une
              commission sur chaque vente générée.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div>
              <Label>Nom complet *</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className={errors.nom ? "border-destructive" : ""}
              />
              {errors.nom && (
                <p className="text-xs text-destructive mt-1">{errors.nom}</p>
              )}
            </div>
            <div>
              <Label>Téléphone *</Label>
              <PhoneInput
                value={form.telephone}
                onChange={(v) => setForm({ ...form, telephone: v })}
                invalid={!!errors.telephone}
                errorMessage={errors.telephone}
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <PhoneInput
                value={form.whatsapp}
                onChange={(v) => setForm({ ...form, whatsapp: v })}
                invalid={!!errors.whatsapp}
                errorMessage={errors.whatsapp}
              />
            </div>
            <div>
              <Label>🇧🇯 Ville *</Label>
              <SmartCombobox
                value={form.ville}
                onChange={(v) => setForm({ ...form, ville: v })}
                options={BENIN_CITY_NAMES}
                placeholder="Sélectionner une ville"
                invalid={!!errors.ville}
                errorMessage={errors.ville}
              />
            </div>
            <div>
              <Label>Opérateur Mobile Money *</Label>
              <SmartCombobox
                value={form.mobile_money_operator}
                onChange={(v) =>
                  setForm({ ...form, mobile_money_operator: v })
                }
                options={MOMO_OPERATORS.map((o) => o.value)}
                allowCustom={false}
                invalid={!!errors.mobile_money_operator}
                errorMessage={errors.mobile_money_operator}
              />
            </div>
            <div>
              <Label>Numéro Mobile Money *</Label>
              <PhoneInput
                value={form.mobile_money_number}
                onChange={(v) =>
                  setForm({ ...form, mobile_money_number: v })
                }
                invalid={!!errors.mobile_money_number}
                errorMessage={errors.mobile_money_number}
              />
            </div>
            <Button
              disabled={submitting}
              className="w-full h-12 bg-[hsl(var(--wa-green))] hover:bg-[hsl(var(--wa-green)/0.9)]"
              onClick={async () => {
                const parsed = partnerEnrollmentSchema.safeParse(form);
                if (!parsed.success) {
                  setErrors(flattenZodErrors(parsed.error) as any);
                  toast({
                    title: "Corrigez les champs en rouge",
                    variant: "destructive",
                  });
                  return;
                }
                setErrors({});
                setSubmitting(true);
                try {
                  await apply(parsed.data);
                  toast({
                    title: "✅ Candidature envoyée",
                    description: "Vous serez notifié après validation admin.",
                  });
                  await refresh();
                } catch (e: any) {
                  toast({
                    title: "Erreur",
                    description: e.message,
                    variant: "destructive",
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting && (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              )}
              Soumettre ma candidature
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- DASHBOARD ----
  return (
    <div className="min-h-[100dvh] bg-background">
      <MobileScreenHeader
        title="Espace Partenaire"
        subtitle={`${partner.nom} · ${partner.code_partenaire}`}
      />

      <div className="p-4 space-y-4">
        {/* Statut */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={partner.statut === "active" ? "default" : "secondary"}
            className={partner.statut === "active" ? "bg-[hsl(var(--wa-green))]" : ""}
          >
            {partner.statut}
          </Badge>
          <Badge variant="outline">{partner.niveau}</Badge>
          {partner.kyc_verified && (
            <Badge className="bg-emerald-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              KYC vérifié
            </Badge>
          )}
        </div>

        {partner.statut !== "active" && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs">
            ⏳ Votre compte est en attente d'activation par un administrateur.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <MobileStatCard
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Entreprises"
            value={stats?.nb_businesses ?? 0}
          />
          <MobileStatCard
            icon={<Package className="h-3.5 w-3.5" />}
            label="Produits"
            value={stats?.nb_products ?? 0}
          />
          <MobileStatCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="CA 24h"
            value={fmt(stats?.ca_24h)}
          />
          <MobileStatCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="CA 7j"
            value={fmt(stats?.ca_7j)}
          />
          <MobileStatCard
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Commission due"
            value={fmt(stats?.commission_en_attente)}
          />
          <MobileStatCard
            icon={<Wallet className="h-3.5 w-3.5 text-emerald-600" />}
            label="Total cumulé"
            value={fmt(stats?.commission_totale)}
          />
        </div>

        {/* Navigation */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Gestion
          </h2>
          <MobileSectionTile
            to="/app/partner/businesses"
            icon={<Building2 className="h-5 w-5" />}
            title="Mes entreprises"
            subtitle="Voir, enrôler, modifier"
            badge={
              <Badge variant="secondary" className="text-[10px]">
                {stats?.nb_businesses ?? 0}
              </Badge>
            }
          />
          <MobileSectionTile
            to="/app/partner/businesses"
            icon={<Store className="h-5 w-5" />}
            title="Enrôler un commerce"
            subtitle="Voix · GPS · IA"
          />
          <MobileSectionTile
            to="/app/partner/sales"
            icon={<TrendingUp className="h-5 w-5" />}
            title="Mes ventes & commissions"
            subtitle="Suivi temps réel"
          />
          <MobileSectionTile
            to="/app/partner/payouts"
            icon={<Wallet className="h-5 w-5" />}
            title="Mes versements"
            subtitle="Mobile Money"
          />
          <MobileSectionTile
            to="/app/partner/payments"
            icon={<Receipt className="h-5 w-5" />}
            title="Historique paiements"
            subtitle="Toutes vos transactions"
          />
        </div>

        {/* Activité */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Activity className="h-4 w-4 text-[hsl(var(--wa-green))]" />
            <span className="text-sm font-medium">Activité temps réel</span>
          </div>
          <PartnerActivityFeed partnerId={partner.id} height="h-[300px]" />
        </div>
      </div>
    </div>
  );
}
