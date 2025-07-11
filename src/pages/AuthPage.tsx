
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, UserPlus, LogIn, Mail } from 'lucide-react';
import { PasswordChangeForm } from '@/components/auth/PasswordChangeForm';

const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, resetPassword, isAuthenticated, isLoading } = useAuth();
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('login');
  const isResetMode = searchParams.get('reset') === 'true';

  useEffect(() => {
    if (isAuthenticated && !isResetMode) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate, isResetMode]);

  useEffect(() => {
    if (isResetMode) {
      setActiveTab('change-password');
    }
  }, [isResetMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    
    console.log('[AuthPage] Attempting login for:', loginEmail);
    const success = await login(loginEmail, loginPassword);
    
    if (success) {
      console.log('[AuthPage] Login successful, navigating to home');
      navigate('/home');
    } else {
      console.log('[AuthPage] Login failed');
    }
    
    setIsLoginLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== registerConfirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (registerPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsRegisterLoading(true);
    
    console.log('[AuthPage] Attempting registration for:', registerEmail);
    const success = await register({
      name: registerName,
      email: registerEmail,
      phone: registerPhone,
      password: registerPassword,
    });
    
    if (success) {
      console.log('[AuthPage] Registration successful');
      setActiveTab('login');
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPhone('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    } else {
      console.log('[AuthPage] Registration failed');
    }
    
    setIsRegisterLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);
    
    console.log('[AuthPage] Attempting password reset for:', resetEmail);
    const success = await resetPassword(resetEmail);
    
    if (success) {
      setResetEmail('');
    }
    
    setIsResetLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-warm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-warm p-4">
      <div className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Inscription</TabsTrigger>
            <TabsTrigger value="reset">Réinitialiser</TabsTrigger>
            {isAuthenticated && <TabsTrigger value="change-password">Changer MDP</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Connexion
                </CardTitle>
                <CardDescription>
                  Connectez-vous à votre compte Bot.Bj
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={isLoginLoading}
                      placeholder="votre@email.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={isLoginLoading}
                        placeholder="Votre mot de passe"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isLoginLoading}
                  >
                    {isLoginLoading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Inscription
                </CardTitle>
                <CardDescription>
                  Créez votre compte Bot.Bj
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nom complet *</Label>
                    <Input
                      id="register-name"
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      disabled={isRegisterLoading}
                      placeholder="Votre nom complet"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      disabled={isRegisterLoading}
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Téléphone</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      disabled={isRegisterLoading}
                      placeholder="+229 XX XX XX XX"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={isRegisterLoading}
                        placeholder="Au moins 6 caractères"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmer le mot de passe *</Label>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showRegisterConfirmPassword ? 'text' : 'password'}
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={isRegisterLoading}
                        placeholder="Confirmer le mot de passe"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                      >
                        {showRegisterConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    disabled={isRegisterLoading}
                  >
                    {isRegisterLoading ? 'Création...' : 'Créer le compte'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reset">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Réinitialiser le mot de passe
                </CardTitle>
                <CardDescription>
                  Entrez votre email pour recevoir un lien de réinitialisation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={isResetLoading}
                      placeholder="votre@email.com"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-orange-600 hover:bg-orange-700" 
                    disabled={isResetLoading}
                  >
                    {isResetLoading ? 'Envoi...' : 'Envoyer le lien'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {isAuthenticated && (
            <TabsContent value="change-password">
              <PasswordChangeForm />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AuthPage;
