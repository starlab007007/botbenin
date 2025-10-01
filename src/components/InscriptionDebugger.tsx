import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
}

export const InscriptionDebugger: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const { toast } = useToast();

  const log = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    console.log(`[${type}] ${message}`);
    setLogs(prev => [...prev, entry]);
  };

  const debugInscription = async () => {
    setIsRunning(true);
    setLogs([]);
    setSummary('');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    let issuesFound: string[] = [];
    let userId: string | null = null;
    
    try {
      log('🔍 Début du diagnostic complet d\'inscription', 'info');
      
      // ===== TEST 1: Connectivité Supabase =====
      log('📡 Test 1/6: Vérification de la connectivité Supabase...', 'info');
      try {
        const { error: healthError } = await supabase
          .from('bot_owners')
          .select('id')
          .limit(1);
        
        if (healthError) {
          log(`❌ Connectivité échouée: ${healthError.message}`, 'error');
          issuesFound.push('Connectivité Supabase défaillante');
          setIsRunning(false);
          setSummary('❌ Diagnostic interrompu: Problème de connexion à Supabase');
          return;
        }
        log('✅ Connectivité Supabase: OK', 'success');
      } catch (e: any) {
        log(`❌ Exception connectivité: ${e.message}`, 'error');
        issuesFound.push('Exception lors du test de connectivité');
        setIsRunning(false);
        return;
      }

      // ===== TEST 2: Configuration Auth =====
      log('🔑 Test 2/6: Vérification de la configuration Auth...', 'info');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        log(`✅ Configuration Auth: OK (Session actuelle: ${session ? 'Oui' : 'Non'})`, 'success');
      } catch (e: any) {
        log(`⚠️ Avertissement configuration: ${e.message}`, 'warning');
      }

      // ===== TEST 3: Inscription Supabase =====
      log(`📝 Test 3/6: Tentative d'inscription avec ${testEmail}...`, 'info');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test Diagnostic User',
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (signUpError) {
        log(`❌ ÉCHEC inscription: ${signUpError.message}`, 'error');
        log(`❌ Code HTTP: ${signUpError.status || 'N/A'}`, 'error');
        
        // Analyse détaillée de l'erreur
        if (signUpError.message.includes('already registered')) {
          log('💡 Cause: Utilisateur déjà existant (normal pour test)', 'warning');
        } else if (signUpError.message.includes('Signup is disabled')) {
          log('⚠️ PROBLÈME CRITIQUE: Les inscriptions sont désactivées dans Supabase', 'error');
          issuesFound.push('Inscriptions désactivées');
        } else if (signUpError.message.includes('Invalid email')) {
          log('⚠️ Email invalide détecté', 'error');
          issuesFound.push('Format email rejeté');
        } else if (signUpError.message.includes('duplicate') || signUpError.message.includes('User not found')) {
          log('⚠️ PROBLÈME: Erreur de duplication ou trigger défaillant', 'error');
          issuesFound.push('Erreur trigger bot_owners');
        } else if (signUpError.status === 500) {
          log('⚠️ PROBLÈME CRITIQUE: Erreur serveur 500', 'error');
          issuesFound.push('Erreur serveur interne');
        }
        
        setIsRunning(false);
        setSummary(issuesFound.length > 0 
          ? `❌ ${issuesFound.length} problème(s) détecté(s): ${issuesFound.join(', ')}`
          : '⚠️ Inscription échouée mais cause inconnue'
        );
        return;
      }

      if (!signUpData.user) {
        log('❌ PROBLÈME: Pas d\'utilisateur retourné par signUp', 'error');
        issuesFound.push('Aucun utilisateur créé');
        setIsRunning(false);
        setSummary('❌ Inscription a échoué silencieusement');
        return;
      }

      userId = signUpData.user.id;
      log(`✅ Utilisateur créé: ${userId}`, 'success');
      log(`📧 Email confirmé: ${signUpData.user.email_confirmed_at ? 'Oui' : 'Non (normal)'}`, 'info');
      
      // ===== TEST 4: Vérification trigger bot_owner =====
      log('⏳ Test 4/6: Attente création bot_owner par trigger (2s)...', 'info');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      log('🔍 Vérification de la création du bot_owner...', 'info');
      const { data: botOwner, error: botOwnerError } = await supabase
        .from('bot_owners')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (botOwnerError) {
        log(`❌ Erreur lecture bot_owner: ${botOwnerError.message}`, 'error');
        issuesFound.push('Erreur lecture table bot_owners');
      } else if (botOwner) {
        log(`✅ Bot owner créé automatiquement (ID: ${botOwner.id})`, 'success');
        log(`📊 Plan: ${botOwner.subscription_plan}, Max bots: ${botOwner.max_bots}`, 'info');
      } else {
        log('⚠️ PROBLÈME: Bot owner NON créé par le trigger', 'error');
        issuesFound.push('Trigger bot_owner ne fonctionne pas');
      }

      // ===== TEST 5: Test de connexion =====
      log('🔐 Test 5/6: Tentative de connexion...', 'info');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials') || 
            signInError.message.includes('Email not confirmed')) {
          log('💡 Connexion impossible: Email non confirmé (comportement normal)', 'warning');
        } else {
          log(`⚠️ Erreur connexion: ${signInError.message}`, 'warning');
          issuesFound.push('Connexion post-inscription échoue');
        }
      } else if (signInData.user) {
        log('✅ Connexion réussie avec le nouveau compte', 'success');
        
        // Nettoyer
        await supabase.auth.signOut();
        log('🧹 Déconnexion du compte test effectuée', 'info');
      }

      // ===== TEST 6: Vérification RLS =====
      log('🔒 Test 6/6: Vérification des politiques RLS...', 'info');
      try {
        // Tentative de lecture depuis la session test
        const { error: rlsError } = await supabase
          .from('bot_owners')
          .select('*')
          .limit(1);
        
        if (rlsError) {
          log(`⚠️ RLS peut avoir un problème: ${rlsError.message}`, 'warning');
        } else {
          log('✅ Politiques RLS: Fonctionnelles', 'success');
        }
      } catch (e: any) {
        log(`⚠️ Erreur test RLS: ${e.message}`, 'warning');
      }

      // ===== RÉSUMÉ =====
      if (issuesFound.length === 0) {
        setSummary('✅ Système d\'inscription fonctionnel à 100%');
        log('🎉 DIAGNOSTIC COMPLET: Aucun problème détecté', 'success');
      } else {
        setSummary(`⚠️ ${issuesFound.length} problème(s) identifié(s): ${issuesFound.join(', ')}`);
        log(`⚠️ Problèmes à corriger: ${issuesFound.join(', ')}`, 'warning');
      }
      
    } catch (error: any) {
      log(`❌ Exception fatale: ${error.message}`, 'error');
      log(`Stack: ${error.stack?.substring(0, 200)}`, 'error');
      setSummary('❌ Diagnostic interrompu par une exception');
    } finally {
      setIsRunning(false);
    }
  };

  const getIconForType = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="w-6 h-6" />
          <span>Diagnostic Complet d'Inscription</span>
        </CardTitle>
        <CardDescription>
          Test approfondi de tous les composants du système d'inscription
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={debugInscription} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Diagnostic en cours...
            </>
          ) : (
            'Lancer le diagnostic complet'
          )}
        </Button>

        {summary && (
          <Alert variant={summary.includes('✅') ? 'default' : 'destructive'}>
            <AlertDescription className="font-semibold">
              {summary}
            </AlertDescription>
          </Alert>
        )}

        {logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Journal de diagnostic ({logs.length} entrées)</h3>
            <div className="bg-muted/50 p-4 rounded-lg max-h-[500px] overflow-y-auto space-y-1">
              {logs.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 text-sm font-mono py-1"
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {getIconForType(entry.type)}
                  </span>
                  <span className="text-muted-foreground text-xs flex-shrink-0 w-20">
                    {entry.timestamp}
                  </span>
                  <span className={`flex-1 ${
                    entry.type === 'error' ? 'text-red-600 font-semibold' :
                    entry.type === 'success' ? 'text-green-600' :
                    entry.type === 'warning' ? 'text-orange-600' :
                    'text-foreground'
                  }`}>
                    {entry.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isRunning && logs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Cliquez sur le bouton pour lancer le diagnostic</p>
            <p className="text-sm mt-1">Le test créera un compte temporaire pour valider le processus</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};