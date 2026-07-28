import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FileDown, Network, Database, Layers, Shuffle } from "lucide-react";

const DOCX = "/docs/Architecture_WAOUH_v1.docx";
const PDF = "/docs/Architecture_WAOUH_v1.pdf";

export default function ArchitecturePage() {
  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Architecture WAOUH / bot.bj</h1>
        <p className="text-muted-foreground">
          Dossier complet — architecture fonctionnelle, technique, schéma de base de données et
          cadre d'interopérabilité. Version 1.0.
        </p>
        <div className="flex flex-wrap gap-3 pt-3">
          <Button asChild>
            <a href={PDF} target="_blank" rel="noopener noreferrer">
              <FileDown className="mr-2 h-4 w-4" /> Télécharger le PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={DOCX} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" /> Télécharger le DOCX
            </a>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          {
            icon: Layers,
            title: "1. Architecture fonctionnelle",
            desc:
              "8 domaines : Chat & Marketplace, Agents IA, WhatsApp IA, Après BAC, FA IA, CRM, Diffusion, Administration. Parcours acheteur / vendeur / livreur / admin.",
          },
          {
            icon: Network,
            title: "2. Architecture technique",
            desc:
              "React 18 + Vite + Capacitor · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions Deno) · Lovable AI Gateway (Gemini 2.5 Flash-Lite) · WAHA · Qosic · ElevenLabs · HF NLLB.",
          },
          {
            icon: Database,
            title: "3. Schéma de base de données",
            desc:
              "≈ 200 tables (waouh_*, apresbac_*, fa_*, wa_*, user_*), diagrammes ER par domaine, fonctions SECURITY DEFINER, politique RLS et grants.",
          },
          {
            icon: Shuffle,
            title: "4. Cadre d'interopérabilité",
            desc:
              "API-first (OpenAPI 3.1), webhooks HMAC, événements canoniques waouh.*, identité unifiée (user_id / device_id / phone E.164), matrice partenaires, roadmap v1→v4.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu (PDF intégré)</CardTitle>
          <CardDescription>Prévisualisation du document — utilisez le bouton "Télécharger le PDF" pour la version haute qualité.</CardDescription>
        </CardHeader>
        <CardContent>
          <iframe
            src={PDF}
            title="Architecture WAOUH — PDF"
            className="w-full rounded-md border"
            style={{ height: "80vh" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
