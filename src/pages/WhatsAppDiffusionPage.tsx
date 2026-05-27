
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Zap, Shield, Target, CheckCircle2 } from 'lucide-react';
import whatsappLogo from '@/assets/whatsapp-icon-official.png';
import { WhatsAppCampaignForm } from '@/components/whatsapp/WhatsAppCampaignForm';
import { WhatsAppDiffusionV2 } from '@/components/whatsapp/WhatsAppDiffusionV2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WhatsAppDiffusionPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center mb-6">
              <img src={whatsappLogo} alt="WhatsApp" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mr-3" />
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                WhatsApp Diffusion
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Envoyez des campagnes WhatsApp de masse : textes, photos et vidéos à vos contacts
            </p>
            <Badge variant="secondary" className="mt-4">Campagnes de diffusion</Badge>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
            {[
              { icon: Send, title: 'Diffusion de masse', desc: 'Envoyez des messages à des milliers de contacts en un clic' },
              { icon: Users, title: 'Multi-format', desc: 'Texte, photos et vidéos pour des campagnes variées' },
              { icon: Target, title: 'Ciblage précis', desc: 'Choisissez vos sessions et numéros de rapport' },
              { icon: Zap, title: 'Automatisation', desc: 'Webhook intégré pour déclencher vos workflows' },
              { icon: Shield, title: 'Sécurisé', desc: 'Vos données restent privées et isolées' },
              { icon: CheckCircle2, title: 'Suivi', desc: 'Rapports de livraison via numéro WhatsApp' },
            ].map((f, i) => (
              <Card key={i} className="border-green-200 hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-2">
                  <f.icon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" onClick={() => setIsAuthModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
              Commencer maintenant
            </Button>
          </div>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <img src={whatsappLogo} alt="WhatsApp" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl mr-3" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              WhatsApp Diffusion
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Créez et envoyez vos campagnes WhatsApp
          </p>
        </div>
        <WhatsAppCampaignForm />
      </div>
    </div>
  );
};

export default WhatsAppDiffusionPage;
