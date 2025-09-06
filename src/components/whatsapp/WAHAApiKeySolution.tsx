import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Key, 
  ExternalLink, 
  Copy, 
  Settings,
  Shield,
  Unlock,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

const WAHAApiKeySolution: React.FC = () => {
  const [showApiKeySteps, setShowApiKeySteps] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
  };

  const openWAHADashboard = () => {
    window.open('https://waha.bot.bj/dashboard/', '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Problème Identifié */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            🚨 PROBLÈME IDENTIFIÉ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Permissions d'API Key Insuffisantes</h3>
            <p className="text-red-700 text-sm mb-3">
              Votre API Key WAHA actuelle permet uniquement la <strong>LECTURE</strong> des données (lister les sessions). 
              Les permissions d'<strong>ÉCRITURE</strong> sont nécessaires pour créer des sessions et générer des QR codes.
            </p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Lecture des sessions: <Badge className="bg-green-100 text-green-700">OK</Badge></span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Création/Modification: <Badge className="bg-red-100 text-red-700">BLOQUÉ</Badge></span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Solution Immédiate */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            ✅ SOLUTION IMMÉDIATE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <Alert className="border-orange-200 bg-orange-50">
            <Key className="w-4 h-4" />
            <AlertDescription className="text-orange-800">
              <strong>Action requise:</strong> Vous devez générer une nouvelle API Key avec les permissions complètes (READ + WRITE) dans le dashboard WAHA.
            </AlertDescription>
          </Alert>

          {/* Bouton pour accéder au dashboard */}
          <div className="flex gap-3">
            <Button 
              onClick={openWAHADashboard}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir WAHA Dashboard
            </Button>
            
            <Button 
              onClick={() => setShowApiKeySteps(!showApiKeySteps)}
              variant="outline"
              className="border-blue-200 text-blue-600"
            >
              {showApiKeySteps ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showApiKeySteps ? 'Masquer' : 'Voir'} les étapes détaillées
            </Button>
          </div>

        </CardContent>
      </Card>

      {/* Étapes détaillées */}
      {showApiKeySteps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              📋 Étapes Détaillées pour Résoudre le Problème
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Étape 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2">Accéder au Dashboard WAHA</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Connectez-vous au dashboard WAHA avec vos identifiants administrateur
                </p>
                <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                  URL: https://waha.bot.bj/dashboard/
                </div>
              </div>
            </div>

            <Separator />

            {/* Étape 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2">Naviguer vers API Keys</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Dans le menu du dashboard, recherchez la section "API Keys" ou "Security"
                </p>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    💡 <strong>Astuce:</strong> Généralement dans Settings → Security → API Keys
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Étape 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-orange-600">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2">Créer une Nouvelle API Key</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Générez une nouvelle API Key avec les permissions complètes
                </p>
                
                <div className="space-y-3">
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Permissions Requises:</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>✅ <strong>READ</strong> - Lire les sessions et configurations</li>
                      <li>✅ <strong>write</strong> - Créer et modifier les sessions</li>
                      <li>✅ <strong>sessions:create</strong> - Créer de nouvelles sessions</li>
                      <li>✅ <strong>sessions:manage</strong> - Démarrer/Arrêter les sessions</li>
                      <li>✅ <strong>qr:generate</strong> - Générer les QR codes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Étape 4 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-green-600">4</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2">Mettre à Jour la Configuration</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Remplacez l'ancienne API Key par la nouvelle dans vos variables d'environnement
                </p>
                
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Variable à mettre à jour:</p>
                    <div className="bg-gray-800 text-green-400 p-2 rounded font-mono text-sm flex items-center justify-between">
                      <span>WAHA_API_KEY=votre_nouvelle_api_key</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard('WAHA_API_KEY=votre_nouvelle_api_key')}
                        className="text-white hover:bg-gray-700"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">
                      💡 <strong>Important:</strong> Redémarrez votre application après avoir mis à jour l'API Key
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Vérification */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Vérification Finale
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                Une fois la nouvelle API Key configurée, revenez ici et relancez le diagnostic pour confirmer que le problème est résolu.
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <ArrowRight className="w-4 h-4" />
                <span>Utilisez le bouton "Lancer le Diagnostic des Permissions" ci-dessus</span>
              </div>
            </div>

          </CardContent>
        </Card>
      )}

      {/* Contact Support */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <AlertTriangle className="w-5 h-5" />
            🆘 Besoin d'Aide Supplémentaire?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-purple-700 mb-3">
            Si vous rencontrez des difficultés pour accéder au dashboard WAHA ou générer une nouvelle API Key, 
            contactez votre administrateur système ou l'équipe de support WAHA.
          </p>
          <div className="flex gap-2">
            <Badge className="bg-purple-100 text-purple-700">Documentation WAHA</Badge>
            <Badge className="bg-purple-100 text-purple-700">Support Technique</Badge>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default WAHAApiKeySolution;