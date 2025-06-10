
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Eye, EyeOff, User, Lock, Info } from 'lucide-react';
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
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (loginMethod === 'email') {
      if (!loginData.email) {
        newErrors.email = 'Email requis';
      } else if (!validateEmail(loginData.email)) {
        newErrors.email = 'Format email invalide';
      }
    } else {
      if (!loginData.phone) {
        newErrors.phone = 'Numéro de téléphone requis';
      } else if (!validatePhone(loginData.phone)) {
        newErrors.phone = 'Format de numéro invalide';
      }
    }
    
    if (!loginData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (loginData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    let success = false;
    if (loginMethod === 'email') {
      success = await login(loginData.email, loginData.password);
    } else {
      success = await loginWithPhone(loginData.phone, loginData.password);
    }
    
    if (success) {
      onClose();
      setLoginData({ email: '', phone: '', password: '' });
      setErrors({});
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validation
    const newErrors: {[key: string]: string} = {};
    
    if (!registerData.name.trim()) {
      newErrors.name = 'Nom requis';
    }
    
    if (!registerData.email) {
      newErrors.email = 'Email requis';
    } else if (!validateEmail(registerData.email)) {
      newErrors.email = 'Format email invalide';
    }
    
    if (registerData.phone && !validatePhone(registerData.phone)) {
      newErrors.phone = 'Format de numéro invalide';
    }
    
    if (!registerData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (registerData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (!registerData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation du mot de passe requise';
    } else if (registerData.password !== registerData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const success = await register({
      name: registerData.name.trim(),
      email: registerData.email,
      phone: registerData.phone || undefined,
      password: registerData.password
    });
    
    if (success) {
      onClose();
      setRegisterData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
      setErrors({});
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

          {/* Test Accounts Info */}
          <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Comptes de test disponibles :</p>
                <div className="space-y-1 text-xs">
                  <p><strong>Admin :</strong> admin@test.com / admin123456</p>
                  <p><strong>Utilisateur :</strong> user@test.com / user123456</p>
                  <p><strong>Téléphone :</strong> +229 97 00 00 01 ou +229 97 00 00 02</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-yellow-400">
              <TabsTrigger value="login" className="text-black font-medium data-[state=active]:bg-yellow-300">Connexion</TabsTrigger>
              <TabsTrigger value="register" className="text-black font-medium data-[state=active]:bg-yellow-300">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
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
                        placeholder="admin@test.com ou user@test.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className={`bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.email ? 'border-red-500' : ''}`}
                      />
                      {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="phone" className="text-black">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+229 97 00 00 01 ou +229 97 00 00 02"
                        value={loginData.phone}
                        onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                        className={`bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.phone ? 'border-red-500' : ''}`}
                      />
                      {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="password" className="text-black">Mot de passe</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="admin123456 ou user123456"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className={`bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.password ? 'border-red-500' : ''}`}
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
                    {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
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
                        className={`pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.name ? 'border-red-500' : ''}`}
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      />
                    </div>
                    {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="reg-email" className="text-black">Email</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="votre@email.com"
                        className={`pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.email ? 'border-red-500' : ''}`}
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      />
                    </div>
                    {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="reg-phone" className="text-black">Téléphone (optionnel)</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="+229 XX XX XX XX"
                        className={`pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.phone ? 'border-red-500' : ''}`}
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      />
                    </div>
                    {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <Label htmlFor="reg-password" className="text-black">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`pl-10 pr-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.password ? 'border-red-500' : ''}`}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
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
                    {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <Label htmlFor="confirm-password" className="text-black">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className={`pl-10 bg-yellow-400 border-gray-400 text-black placeholder:text-gray-700 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>}
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
