import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Vérifier si un token est présent dans l'URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (errorParam === 'access_denied' || errorDescription?.includes('expired')) {
      setError('Le lien de réinitialisation a expiré ou est invalide. Veuillez demander un nouveau lien.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      toast.success('Mot de passe mis à jour avec succès');
      
      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour du mot de passe:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du mot de passe');
      toast.error('Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNewLink = () => {
    navigate('/auth');
  };

  const passwordsMatch = newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 6;
  const formValid = newPassword && confirmPassword && passwordsMatch && passwordValid;

  // Si le lien a expiré, afficher un message avec bouton pour redemander
  if (error && (error.includes('expiré') || error.includes('invalide'))) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="text-center">Lien expiré</CardTitle>
            <CardDescription className="text-center">
              Le lien de réinitialisation de mot de passe a expiré ou est invalide
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleRequestNewLink}
              className="w-full"
            >
              Demander un nouveau lien
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-5 h-5" />
            <span>Nouveau mot de passe</span>
          </CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe pour votre compte
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPasswords ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {newPassword && (
                <div className="flex items-center space-x-2 text-sm">
                  {passwordValid ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted"></div>
                  )}
                  <span className={passwordValid ? "text-green-600" : "text-muted-foreground"}>
                    Au moins 6 caractères
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPasswords ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {confirmPassword && (
                <div className="flex items-center space-x-2 text-sm">
                  {passwordsMatch ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted"></div>
                  )}
                  <span className={passwordsMatch ? "text-green-600" : "text-muted-foreground"}>
                    Les mots de passe correspondent
                  </span>
                </div>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={!formValid || isLoading}
            >
              {isLoading ? "Mise à jour en cours..." : "Réinitialiser le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
