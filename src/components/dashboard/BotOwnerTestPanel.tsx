
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BotOwnerDataTest } from '@/components/BotOwnerDataTest';
import { SecureDataManager } from '@/services/dashboard/secureDataManager';
import { 
  Database, 
  CheckCircle, 
  AlertCircle, 
  TestTube,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const BotOwnerTestPanel: React.FC = () => {
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testSystem = async () => {
    setIsLoading(true);
    try {
      // Tester les nouvelles fonctionnalités
      const globalStats = await SecureDataManager.getDashboardStats();
      const ownerBots = await SecureDataManager.getOwnerBots();
      const conversations = await SecureDataManager.getAllConversations();
      
      setSystemStatus({
        globalStats,
        botsCount: ownerBots.length,
        conversationsCount: conversations.length,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error: any) {
      setSystemStatus({
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Nouveau Système Bot Owner
            <Badge variant="outline" className="text-xs">
              Version Améliorée
            </Badge>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testSystem}
              disabled={isLoading}
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isLoading ? 'Test en cours...' : 'Tester le Système'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTestPanel(!showTestPanel)}
            >
              {showTestPanel ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Statut du système */}
        {systemStatus && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              {systemStatus.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium">
                {systemStatus.success ? 'Système Fonctionnel' : 'Erreur Détectée'}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(systemStatus.timestamp).toLocaleTimeString('fr-FR')}
              </span>
            </div>
            
            {systemStatus.success ? (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Bots:</span>
                  <span className="ml-2">{systemStatus.globalStats.totalBots}</span>
                </div>
                <div>
                  <span className="font-medium">Messages:</span>
                  <span className="ml-2">{systemStatus.globalStats.totalMessages}</span>
                </div>
                <div>
                  <span className="font-medium">Conversations:</span>
                  <span className="ml-2">{systemStatus.conversationsCount}</span>
                </div>
              </div>
            ) : (
              <p className="text-red-600 text-sm">{systemStatus.error}</p>
            )}
          </div>
        )}

        {/* Informations sur les améliorations */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Nouvelles fonctions SQL sécurisées avec validation de propriété</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Gestionnaire de données spécialisé (BotOwnerDataManager)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Hook React pour accès facile aux données (useBotOwnerData)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Fallback automatique vers l'ancien système si nécessaire</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Politiques RLS améliorées pour la sécurité</span>
          </div>
        </div>

        {/* Panel de test détaillé */}
        {showTestPanel && (
          <div className="mt-6 border-t pt-6">
            <BotOwnerDataTest onClose={() => setShowTestPanel(false)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
