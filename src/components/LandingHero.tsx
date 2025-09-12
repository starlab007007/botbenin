
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import jarvisCore from '@/assets/jarvis-ai-core.png';

interface LandingHeroProps {
  onStartChat: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onStartChat }) => {
  return (
    <div>
      {/* Hero Section */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        
        <div className="max-w-6xl mx-auto text-center space-y-12 animate-fade-in relative z-10">
          {/* Hero Text */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent leading-tight">
              Rencontrez Jarvis
              <br />
              <span className="text-2xl md:text-3xl lg:text-4xl font-normal">Votre Assistant IA Personnel</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Intelligence artificielle conversationnelle avancée pour répondre à tous vos besoins
            </p>
          </div>

          {/* Jarvis Core Image with Dynamic Effects */}
          <div className="relative flex items-center justify-center my-16">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping scale-150 opacity-30"></div>
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse scale-125 opacity-40 delay-500"></div>
            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping scale-110 opacity-50 delay-1000"></div>
            
            {/* Main Jarvis Image Container */}
            <div className="relative w-80 h-80 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem]">
              {/* Rotating rings */}
              <div className="absolute inset-4 border-2 border-primary/30 rounded-full animate-spin"></div>
              <div className="absolute inset-8 border border-accent/40 rounded-full animate-spin animate-reverse delay-200" style={{animationDirection: 'reverse'}}></div>
              <div className="absolute inset-12 border border-primary/20 rounded-full animate-spin delay-500"></div>
              
              {/* Core Image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src={jarvisCore} 
                  alt="Jarvis AI Core" 
                  className="w-full h-full object-contain filter drop-shadow-2xl hover:scale-105 transition-transform duration-700 animate-pulse"
                />
              </div>
              
              {/* Floating particles */}
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary rounded-full animate-bounce delay-300"></div>
              <div className="absolute top-3/4 right-1/4 w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-700"></div>
              <div className="absolute bottom-1/4 left-3/4 w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce delay-1200"></div>
              
              {/* Status indicator */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground font-medium">Jarvis en ligne</span>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="p-6 bg-white/70 backdrop-blur-sm border-warm-beige-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-soft-peach-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="font-playfair font-semibold text-lg text-gray-900">Find Your Direction</h3>
                <p className="text-gray-600 text-sm">Get personalized career path suggestions based on your goals and interests.</p>
              </div>
            </Card>

            <Card className="p-6 bg-white/70 backdrop-blur-sm border-warm-beige-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-soft-peach-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="font-playfair font-semibold text-lg text-gray-900">Learn & Grow</h3>
                <p className="text-gray-600 text-sm">Discover curated learning resources, books, and courses for your journey.</p>
              </div>
            </Card>

            <Card className="p-6 bg-white/70 backdrop-blur-sm border-warm-beige-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-soft-peach-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="font-playfair font-semibold text-lg text-gray-900">Take Action</h3>
                <p className="text-gray-600 text-sm">Get actionable steps and strategies to move forward with confidence.</p>
              </div>
            </Card>
          </div>

          {/* CTA Button */}
          <div className="mt-12">
            <Button 
              onClick={onStartChat}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden group"
            >
              <span className="relative z-10">Commencer avec Jarvis</span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Button>
          </div>

          {/* Example Questions */}
          <div className="mt-8 text-sm text-gray-600">
            <p className="mb-2">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="bg-white/60 px-3 py-1 rounded-full border border-warm-beige-200">"I want to transition into AI engineering"</span>
              <span className="bg-white/60 px-3 py-1 rounded-full border border-warm-beige-200">"How to develop leadership skills?"</span>
              <span className="bg-white/60 px-3 py-1 rounded-full border border-warm-beige-200">"Career change at 35"</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 mt-16">
        <Card className="p-8 bg-white/80 backdrop-blur-sm border-warm-beige-200 rounded-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🌟 Modèle Économique Bot.Bj</h2>
            <p className="text-gray-700">Structure tarifaire adaptée à tous vos besoins</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter */}
            <div className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">🔹 Starter</h3>
                <div className="text-2xl font-bold text-green-600 mb-1">Gratuit</div>
                <p className="text-sm text-gray-600">Petites entreprises</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">1 Agent IA</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">1 000 messages/mois</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Support email</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Intégrations de base</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Tableau de bord analytique</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Suivi des statistiques en temps réel</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">QR code de bot</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Partage sur les réseaux sociaux</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Lien webhook</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-red-500 mr-2">❌</span>
                  <span className="text-gray-500">Relances automatisées</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-red-500 mr-2">❌</span>
                  <span className="text-gray-500">Scoring des leads</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-red-500 mr-2">❌</span>
                  <span className="text-gray-500">Envois multicanaux</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-red-500 mr-2">❌</span>
                  <span className="text-gray-500">Prospection du marché</span>
                </div>
              </div>
              
              <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                Choisir ce plan
              </Button>
            </div>

            {/* Professional */}
            <div className="border-2 border-blue-500 rounded-xl p-6 hover:shadow-lg transition-all duration-300 relative bg-white">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-medium">Recommandé</span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">🔹 Professional</h3>
                <div className="text-2xl font-bold text-blue-600 mb-1">7 500 CFA/mois</div>
                <p className="text-sm text-gray-600">PME / PMI</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">2 Agents IA</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">10 000 messages/mois</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Génération de leads & qualification</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Relances automatisées</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Emails (5 000/mois)</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">CRM de suivi des contacts</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Intégrations complètes</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Support prioritaire</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Lien de bot personnalisé</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Prospection automatisée</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Tableau de bord analytique</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Suivi des statistiques en temps réel</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">QR code de bot</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Partage sur les réseaux sociaux</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Lien webhook</span>
                </div>
              </div>
              
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                Choisir ce plan
              </Button>
            </div>

            {/* Enterprise */}
            <div className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">🔹 Enterprise</h3>
                <div className="text-2xl font-bold text-purple-600 mb-1">15 500 CFA/mois</div>
                <p className="text-sm text-gray-600">Grandes entreprises</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">4 Agents IA</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Messages illimités</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Qualification dynamique + IA</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Relances automatiques + manuelles</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Emails/SMS/WhatsApp illimités</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Automatisation marketing + IA prédictive</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">A/B Testing, scoring évolutif</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Personnalisation avancée</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Support dédié 24/7</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Prospection multicanal avec ciblage IA</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Tableau de bord analytique</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Suivi des statistiques en temps réel</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">QR code de bot</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Partage sur les réseaux sociaux</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Lien webhook</span>
                </div>
              </div>
              
              <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                Choisir ce plan
              </Button>
            </div>

            {/* Custom */}
            <div className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">🔹 Custom</h3>
                <div className="text-2xl font-bold text-orange-600 mb-1">Sur devis</div>
                <p className="text-sm text-gray-600">Secteur public & Corporate</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Solution sur mesure</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Développements spécifiques</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">SLA garanti</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Formation et onboarding complet</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Gestion multi-workspace</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Prospection & campagnes à la demande</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Tableau de bord analytique</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Suivi des statistiques en temps réel</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">QR code de bot</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Partage sur les réseaux sociaux</span>
                </div>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 mr-2">✅</span>
                  <span className="text-gray-900">Lien webhook</span>
                </div>
              </div>
              
              <Button className="w-full bg-gray-600 hover:bg-gray-700 text-white">
                Choisir ce plan
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
