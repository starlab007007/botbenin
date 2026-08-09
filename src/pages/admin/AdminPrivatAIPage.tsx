import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HardDriveDownload, KeyRound, Route, ShieldCheck } from 'lucide-react';
import AdminPrivatAIDownloadsPanel from './AdminPrivatAIDownloadsPanel';
import AdminPrivatAILicensesPage from './AdminPrivatAILicensesPage';

export default function AdminPrivatAIPage() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">PrivatAI — Administration</h1>
        <p className="text-muted-foreground mt-1">
          Publication des applications, téléchargements directs, essais gratuits, licences, appareils et traçabilité.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3"><HardDriveDownload className="h-5 w-5 text-violet-600" /><CardTitle className="text-base">Versions publiées</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">DMG Mac Intel, EXE Windows et MSI servis directement depuis bot.bj.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><KeyRound className="h-5 w-5 text-violet-600" /><CardTitle className="text-base">Licences & essai</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Essai de 7 jours, codes administrateur, validité et nombre d’appareils.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><ShieldCheck className="h-5 w-5 text-violet-600" /><CardTitle className="text-base">Contrôle centralisé</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Publication, révocation et journal d’activité dans un seul parcours.</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="downloads" className="space-y-5">
        <TabsList className="h-auto flex flex-wrap">
          <TabsTrigger value="downloads" className="gap-2"><HardDriveDownload className="h-4 w-4" />Applications & téléchargements</TabsTrigger>
          <TabsTrigger value="licenses" className="gap-2"><KeyRound className="h-4 w-4" />Licences & accès</TabsTrigger>
          <TabsTrigger value="journey" className="gap-2"><Route className="h-4 w-4" />Parcours de bout en bout</TabsTrigger>
        </TabsList>

        <TabsContent value="downloads">
          <AdminPrivatAIDownloadsPanel />
        </TabsContent>

        <TabsContent value="licenses">
          <AdminPrivatAILicensesPage />
        </TabsContent>

        <TabsContent value="journey">
          <Card>
            <CardHeader>
              <CardTitle>Parcours PrivatAI complet</CardTitle>
              <CardDescription>Vue opérationnelle destinée à l’administrateur.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                ['1. Préparer la version', 'Générer et tester le DMG/EXE/MSI sur la machine de développement.'],
                ['2. Publier depuis le backoffice', 'Charger le fichier validé dans Applications & téléchargements, avec son numéro de version et une note.'],
                ['3. Distribuer', 'Les utilisateurs téléchargent immédiatement depuis bot.bj/privatia, sans ouvrir GitHub.'],
                ['4. Démarrer l’essai', 'Au premier lancement, PrivatAI initialise l’essai gratuit serveur de 7 jours.'],
                ['5. Générer une licence', 'Après l’essai, l’administrateur crée un code, définit sa durée et le nombre d’appareils autorisés.'],
                ['6. Activer et superviser', 'Le client saisit le code. L’administrateur suit les appareils, expirations, validations et événements.'],
                ['7. Administrer dans le temps', 'Désactiver/réactiver une licence, réinitialiser ses appareils ou révoquer un poste en cas de besoin.'],
                ['8. Mettre à jour PrivatAI', 'Publier un nouveau binaire sous le même nom stable ; le lien public reste inchangé.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl border p-4">
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{description}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
