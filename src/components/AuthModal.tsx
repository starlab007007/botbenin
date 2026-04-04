
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, resetPassword, loginWithGoogle } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Reset password form state
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await login(loginEmail, loginPassword);
    if (success) {
      onClose();
      setLoginEmail('');
      setLoginPassword('');
    }
    
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== registerConfirmPassword) {
      return; // Les mots de passe ne correspondent pas
    }
    
    setIsLoading(true);
    
    const success = await register({
      name: registerName,
      email: registerEmail,
      phone: '',
      password: registerPassword,
    });
    
    if (success) {
      onClose();
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    }
    
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const success = await resetPassword(resetEmail);
    if (success) {
      setResetEmail('');
    }
    
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await loginWithGoogle();
    setIsLoading(false);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl">Connexion / Inscription</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login" className="text-xs sm:text-sm">Connexion</TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm">Inscription</TabsTrigger>
            <TabsTrigger value="reset" className="text-xs sm:text-sm">Mot de passe</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3 h-11 border-2"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                  <path d="M8.99999 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 8.99999 14.4204C6.65545 14.4204 4.67181 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48181 18 8.99999 18Z" fill="#34A853"/>
                  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                  <path d="M8.99999 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 8.99999 0C5.48181 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67181 5.16273 6.65545 3.57955 8.99999 3.57955Z" fill="#EA4335"/>
                </svg>
                Continuer avec Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou par email
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Mot de passe oublié ?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => {
                    // Basculer vers l'onglet reset
                    const resetTab = document.querySelector('[value="reset"]') as HTMLButtonElement;
                    resetTab?.click();
                  }}
                >
                  Réinitialiser
                </button>
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="register">
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3 h-11 border-2"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                  <path d="M8.99999 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 8.99999 14.4204C6.65545 14.4204 4.67181 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48181 18 8.99999 18Z" fill="#34A853"/>
                  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                  <path d="M8.99999 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 8.99999 0C5.48181 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67181 5.16273 6.65545 3.57955 8.99999 3.57955Z" fill="#EA4335"/>
                </svg>
                S'inscrire avec Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou par email
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="register-name"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Votre nom complet"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="votre.email@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="register-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                {registerPassword && registerConfirmPassword && registerPassword !== registerConfirmPassword && (
                  <p className="text-sm text-destructive">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading || (registerPassword !== registerConfirmPassword)}
              >
                {isLoading ? "Inscription..." : "S'inscrire"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="reset">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Vous vous souvenez de votre mot de passe ?{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => {
                    // Basculer vers l'onglet login
                    const loginTab = document.querySelector('[value="login"]') as HTMLButtonElement;
                    loginTab?.click();
                  }}
                >
                  Se connecter
                </button>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
