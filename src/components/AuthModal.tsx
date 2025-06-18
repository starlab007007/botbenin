
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from './auth/LoginForm';
import { RegisterForm } from './auth/RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    
    if (registerPassword !== confirmPassword) {
      console.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    setIsLoading(true);
    
    const success = await register({
      name: registerName,
      email: registerEmail,
      phone: registerPhone,
      password: registerPassword,
    });
    
    if (success) {
      onClose();
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPhone('');
      setRegisterPassword('');
      setConfirmPassword('');
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Connexion / Inscription</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Inscription</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm
              email={loginEmail}
              password={loginPassword}
              showPassword={showPassword}
              isLoading={isLoading}
              onEmailChange={setLoginEmail}
              onPasswordChange={setLoginPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              onSubmit={handleLogin}
            />
          </TabsContent>
          
          <TabsContent value="register">
            <RegisterForm
              name={registerName}
              email={registerEmail}
              phone={registerPhone}
              password={registerPassword}
              confirmPassword={confirmPassword}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              isLoading={isLoading}
              onNameChange={setRegisterName}
              onEmailChange={setRegisterEmail}
              onPhoneChange={setRegisterPhone}
              onPasswordChange={setRegisterPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
              onSubmit={handleRegister}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
