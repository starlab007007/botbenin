import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const TestInscriptionDirecte: React.FC = () => {
  const [email, setEmail] = useState(`test-direct-${Date.now()}@example.com`);
  const [password, setPassword] = useState('testpassword123');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const { toast } = useToast();

  const testInscription = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 Test inscription directe avec:', email);
      
      // Test d'inscription direct avec Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: 'Test Direct User',
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('❌ Erreur inscription:', error);
        setResult({
          type: 'error',
          message: `Erreur: ${error.message}`
        });
        
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        console.log('✅ Utilisateur créé:', data.user.id);
        setResult({
          type: 'success',
          message: `Utilisateur créé avec succès! ID: ${data.user.id}`
        });
        
        toast({
          title: "Inscription réussie",
          description: "L'utilisateur a été créé avec succès",
        });
        
        // Vérifier que les données associées ont été créées
        setTimeout(async () => {
          const { data: botOwner } = await supabase
            .from('bot_owners')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
          
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
            
          console.log('🔍 Bot owner créé:', !!botOwner);
          console.log('🔍 Profile créé:', !!profile);
          
          if (botOwner && profile) {
            setResult(prev => ({
              ...prev!,
              message: prev!.message + '\n✅ Bot owner et profil créés automatiquement'
            }));
          }
        }, 1000);
      }
      
    } catch (error: any) {
      console.error('💥 Exception:', error);
      setResult({
        type: 'error',
        message: `Exception: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5" />
          <span>Test d'Inscription Directe</span>
        </CardTitle>
        <CardDescription>
          Test direct du processus d'inscription avec Supabase
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email de test</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button 
          onClick={testInscription} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Test en cours...' : 'Tester l\'inscription'}
        </Button>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-2">
              {result.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
              )}
              <div>
                <h3 className="font-semibold">
                  {result.type === 'success' ? 'Succès' : 'Erreur'}
                </h3>
                <p className="text-sm whitespace-pre-line">{result.message}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};