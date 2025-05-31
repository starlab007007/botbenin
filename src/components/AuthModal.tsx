
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Eye, EyeOff, User, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithPhone, register, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  
  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    phone: '',
    password: ''
  });
  
  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let success = false;
    if (loginMethod === 'email') {
      success = await login(loginData.email, loginData.password);
    } else {
      success = await loginWithPhone(loginData.phone, loginData.password);
    }
    
    if (success) {
      onClose();
      setLoginData({ email: '', phone: '', password: '' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      return;
    }
    
    const success = await register({
      name: registerData.name,
      email: registerData.email,
      phone: registerData.phone || undefined,
      password: registerData.password
    });
    
    if (success) {
      onClose();
      setRegisterData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-200 rounded-xl shadow-2xl border border-gray-300">
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-black mb-2">Bot.Bj</h2>
            <p className="text-gray-800">Votre assistant IA intelligent</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-yellow-400">
              <TabsTrigger value="login" className="text-black font-medium data-[state=active]:bg-yellow-300">Connexion</TabsTrigger>
              <TabsTrigger value="register" className="text-black font-medium data-[state=active]:bg-yellow-300">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                {/* Google Sign In Button */}
                <GoogleSignInButton variant="signin" disabled={isLoading} />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-400" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-200 px-2 text-gray-500">Ou continuez avec</span>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Button
                      type="button"
                      variant={loginMethod === 'email' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLoginMethod('email')}
                      className={`flex-1 ${loginMethod === 'email' ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-gray-300 text-black border-gray-400 hover:bg-gray-400'}`}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={loginMethod === 'phone' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLoginMethod('phone')}
                      className={`flex-1 ${loginMethod === 'phone' ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-gray-300 text-black border-gray-400 hover:bg-gray-400'}`}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Téléphone
                    </Button>
                  </div>

                  {loginMethod === 'email' ? (
                    <div>
                      <Label htmlFor="email" className="text-black">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        className="bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="phone" className="text-black">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+229 XX XX XX XX"
                        value={loginData.phone}
                        onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                        required
                        className="bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="password" className="text-black">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        className="bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-black hover:bg-yellow-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                {/* Google Sign In Button for Registration */}
                <GoogleSignInButton variant="signup" disabled={isLoading} />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-400" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-200 px-2 text-gray-500">Ou créez un compte avec</span>
                  </div>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-black">Nom complet</Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Votre nom complet"
                        className="pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reg-email" className="text-black">Email</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="votre@email.com"
                        className="pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reg-phone" className="text-black">Téléphone (optionnel)</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="+229 XX XX XX XX"
                        className="pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reg-password" className="text-black">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="pl-10 pr-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-black hover:bg-yellow-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="text-black">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Création...' : 'Créer un compte'}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-700 hover:text-black hover:bg-gray-300"
            >
              Fermer
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
