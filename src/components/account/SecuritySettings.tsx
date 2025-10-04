import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PasswordChangeForm } from '@/components/PasswordChangeForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Monitor, 
  MapPin, 
  Clock,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const SecuritySettings: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [securityScore, setSecurityScore] = useState(85);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
    calculateSecurityScore();
  }, []);

  const loadSessions = async () => {
    // Simuler des sessions actives
    setSessions([
      {
        id: '1',
        device: 'Chrome sur Windows',
        location: 'Cotonou, Bénin',
        lastActive: 'Maintenant',
        isCurrent: true
      }
    ]);
  };

  const calculateSecurityScore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let score = 60;
    
    if (user?.email_confirmed_at) score += 20;
    if (user?.phone) score += 10;
    // TODO: Vérifier 2FA quand implémenté
    
    setSecurityScore(score);
  };

  const revokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast({
      title: "Session révoquée",
      description: "La session a été déconnectée avec succès"
    });
  };

  const enable2FA = () => {
    toast({
      title: "Bientôt disponible",
      description: "L'authentification à deux facteurs sera disponible prochainement"
    });
  };

  return (
    <div className="space-y-6">
      {/* Score de sécurité */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              securityScore >= 80 ? 'bg-green-500' : 
              securityScore >= 60 ? 'bg-yellow-500' : 
              'bg-red-500'
            } text-white`}>
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{securityScore}%</h3>
              <p className="text-sm text-muted-foreground">Score de sécurité du compte</p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={securityScore >= 80 ? "default" : "destructive"}>
              {securityScore >= 80 ? 'Excellent' : securityScore >= 60 ? 'Bon' : 'À améliorer'}
            </Badge>
          </div>
        </div>

        {/* Recommandations */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Email vérifié</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span>Activez l'authentification à deux facteurs pour plus de sécurité</span>
          </div>
        </div>
      </Card>

      {/* Changement de mot de passe */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Mot de passe</h3>
            <p className="text-sm text-muted-foreground">Modifiez votre mot de passe régulièrement</p>
          </div>
        </div>
        <PasswordChangeForm />
      </Card>

      {/* Authentification à deux facteurs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Authentification à deux facteurs</h3>
              <p className="text-sm text-muted-foreground">Ajoutez une couche de sécurité supplémentaire</p>
            </div>
          </div>
          <Badge variant="outline">Bientôt</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Protégez votre compte avec un code de vérification en plus de votre mot de passe
        </p>
        <Button onClick={enable2FA} variant="outline">
          Configurer l'A2F
        </Button>
      </Card>

      {/* Sessions actives */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sessions actives</h3>
            <p className="text-sm text-muted-foreground">Gérez vos connexions actives</p>
          </div>
        </div>

        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{session.device}</p>
                    {session.isCurrent && (
                      <Badge variant="default" className="text-xs">Session actuelle</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {session.lastActive}
                    </span>
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => revokeSession(session.id)}
                >
                  Révoquer
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
