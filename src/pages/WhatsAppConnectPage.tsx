import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SmartWhatsAppInterface from '@/components/whatsapp/SmartWhatsAppInterface';
import { AgentsSection } from '@/components/whatsapp/agents/AgentsSection';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Users, 
  TrendingUp, 
  Zap, 
  Shield, 
  Clock, 
  Target,
  CheckCircle2
} from 'lucide-react';
import whatsappLogo from '@/assets/whatsapp-icon-official.png';

const WhatsAppConnectPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="container mx-auto px-6 py-12">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <img src={whatsappLogo} alt="WhatsApp" className="w-16 h-16 rounded-2xl mr-4" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                WhatsApp IA
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transformez votre WhatsApp en un puissant générateur de leads avec l'Intelligence Artificielle
            </p>
            <Badge variant="secondary" className="mt-4">
              Automatisation intelligente
            </Badge>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Bot className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Chatbots Intelligents</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Créez des chatbots IA qui répondent automatiquement à vos clients 24h/24
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Users className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Gestion des Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Collectez et qualifiez automatiquement vos prospects via WhatsApp
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <TrendingUp className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                <CardTitle className="text-lg">Analytiques Avancées</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Suivez les performances et l'engagement de vos campagnes en temps réel
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Benefits Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">
              Pourquoi choisir WhatsApp IA ?
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Automatisation Complète</h3>
                    <p className="text-muted-foreground">
                      Gérez vos conversations WhatsApp sans intervention manuelle
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Réponses Intelligentes</h3>
                    <p className="text-muted-foreground">
                      IA capable de comprendre et répondre de manière contextuelle
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Intégration Facile</h3>
                    <p className="text-muted-foreground">
                      Connectez votre WhatsApp en quelques clics seulement
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Support Multi-langues</h3>
                    <p className="text-muted-foreground">
                      Communiquez avec vos clients dans leur langue préférée
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">Sécurité Avancée</h3>
                    <p className="text-muted-foreground">
                      Toutes vos données sont protégées et chiffrées
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold">ROI Mesurable</h3>
                    <p className="text-muted-foreground">
                      Augmentez vos conversions et réduisez vos coûts opérationnels
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center border-emerald-200">
              <CardContent className="pt-6">
                <Zap className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-600">95%</div>
                <p className="text-muted-foreground">Taux de réponse</p>
              </CardContent>
            </Card>
            <Card className="text-center border-blue-200">
              <CardContent className="pt-6">
                <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <p className="text-muted-foreground">Disponibilité</p>
              </CardContent>
            </Card>
            <Card className="text-center border-purple-200">
              <CardContent className="pt-6">
                <Target className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">3x</div>
                <p className="text-muted-foreground">Plus de conversions</p>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à transformer votre WhatsApp ?
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Rejoignez des milliers d'entreprises qui automatisent leur communication
            </p>
            <Button 
              size="lg" 
              className="bg-white text-green-600 hover:bg-gray-100 font-semibold px-8 py-3 text-lg"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Se connecter / S'inscrire
            </Button>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AgentsSection />
      <SmartWhatsAppInterface />
    </div>
  );
};

export default WhatsAppConnectPage;