import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const InscriptionDebugger: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const log = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const debugInscription = async () => {
    setIsRunning(true);
    setResults([]);
    
    const testEmail = `debug-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    try {
      log('🔍 Début du diagnostic d\'inscription');
      
      // Test 1: Vérifier la connectivité Supabase
      log('📡 Test connectivité Supabase...');
      const { data: healthCheck, error: healthError } = await supabase
        .from('bot_owners')
        .select('id')
        .limit(1);
      
      if (healthError) {
        log(`❌ Erreur connectivité: ${healthError.message}`);
        return;
      }
      log('✅ Connectivité Supabase OK');

      // Test 2: Tentative d'inscription directe
      log(`📝 Tentative d'inscription avec: ${testEmail}`);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Debug Test User',
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (signUpError) {
        log(`❌ Erreur inscription Supabase: ${signUpError.message}`);
        log(`❌ Code erreur: ${signUpError.status || 'N/A'}`);
        
        // Analyser les types d'erreur courantes
        if (signUpError.message.includes('User already registered')) {
          log('💡 L\'utilisateur existe déjà - normal pour un test');
        } else if (signUpError.message.includes('Signup is disabled')) {
          log('⚠️ PROBLÈME: Les inscriptions sont désactivées dans Supabase');
        } else if (signUpError.message.includes('Invalid email')) {
          log('⚠️ PROBLÈME: Format d\'email invalide');
        } else if (signUpError.message.includes('bot_owners')) {
          log('⚠️ PROBLÈME: Erreur trigger bot_owners détectée');
        }
        return;
      }

      if (signUpData.user) {
        log(`✅ Utilisateur créé avec succès: ${signUpData.user.id}`);
        log(`📧 Email confirmé: ${signUpData.user.email_confirmed_at ? 'Oui' : 'Non'}`);
        
        // Test 3: Vérifier que le trigger a créé les données nécessaires
        setTimeout(async () => {
          log('🔍 Vérification des données créées par les triggers...');
          
          const { data: botOwner, error: botOwnerError } = await supabase
            .from('bot_owners')
            .select('*')
            .eq('user_id', signUpData.user.id)
            .single();
          
          if (botOwnerError) {
            log(`❌ Erreur récupération bot_owner: ${botOwnerError.message}`);
          } else if (botOwner) {
            log('✅ Bot owner créé automatiquement par le trigger');
          } else {
            log('❌ PROBLÈME: Bot owner non créé par le trigger');
          }
          
          // Test 4: Tentative de connexion
          log('🔐 Test de connexion avec le nouvel utilisateur...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });
          
          if (signInError) {
            log(`❌ Erreur connexion: ${signInError.message}`);
            if (signInError.message.includes('Invalid login credentials')) {
              log('💡 Credentials invalides - email non confirmé ?');
            }
          } else if (signInData.user) {
            log('✅ Connexion réussie');
            
            // Nettoyer le test en se déconnectant
            await supabase.auth.signOut();
            log('🧹 Déconnexion effectuée');
          }
          
          setIsRunning(false);
        }, 2000);
      } else {
        log('❌ PROBLÈME: Aucun utilisateur retourné par signUp');
        setIsRunning(false);
      }
      
    } catch (error: any) {
      log(`❌ Exception: ${error.message}`);
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>Débogueur d'Inscription</span>
        </CardTitle>
        <CardDescription>
          Diagnostic approfondi du processus d'inscription
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Button 
          onClick={debugInscription} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Logs de diagnostic :</h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`text-sm font-mono ${
                    result.includes('❌') ? 'text-red-600' :
                    result.includes('✅') ? 'text-green-600' :
                    result.includes('⚠️') ? 'text-orange-600' :
                    result.includes('💡') ? 'text-blue-600' :
                    'text-gray-700'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};