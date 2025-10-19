import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle, Zap, Users, ArrowRight } from 'lucide-react';

export const WhatsAppHero: React.FC = () => {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 border-0 text-white">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-20 -translate-x-10"></div>
      
      <div className="relative p-6 sm:p-8 lg:p-12">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center">
          {/* Left content */}
          <div className="space-y-4 sm:space-y-6">
            <Badge className="bg-white/20 text-white border-white/30 w-fit text-xs sm:text-sm">
              <Zap className="w-3 h-3 mr-1" />
              Fonctionnalité Phare
            </Badge>
            
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
                Automatisez WhatsApp avec l'IA
              </h2>
              <p className="text-white/90 text-base sm:text-lg leading-relaxed">
                Transformez WhatsApp en machine à convertir. Répondez automatiquement à vos clients 24/7, 
                qualifiez vos prospects et boostez vos ventes sans effort.
              </p>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90 text-sm sm:text-base">Réponses automatiques intelligentes par IA</p>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90 text-sm sm:text-base">Qualification automatique des prospects</p>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90 text-sm sm:text-base">Campagnes WhatsApp multicanales</p>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90 text-sm sm:text-base">Analytics et rapports en temps réel</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <Button 
                size="lg" 
                className="bg-white text-green-600 hover:bg-white/90 font-semibold text-sm sm:text-base py-2.5 sm:py-3"
                onClick={() => window.open('https://wa.me/22947333289?text=Bonjour, je souhaite automatiser WhatsApp avec votre plateforme IA', '_blank')}
              >
                <MessageCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Démarrer sur WhatsApp
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm sm:text-base"
                asChild
              >
                <a href="https://bot.bj/bot/770c2547-db60-41ab-9f18-1f080fa7ebbb" target="_blank" rel="noopener noreferrer">
                  Discuter avec notre IA
                </a>
              </Button>
            </div>
          </div>

          {/* Right content - Statistics */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">24/7</div>
              <div className="text-white/80 text-xs sm:text-sm">Disponibilité</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">95%</div>
              <div className="text-white/80 text-xs sm:text-sm">Taux de réponse</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 sm:p-6 text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">3x</div>
              <div className="text-white/80 text-xs sm:text-sm">Plus de conversions</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 sm:p-6 text-center">
              <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 mx-auto mb-1 sm:mb-2" />
              <div className="text-white/80 text-xs sm:text-sm">WhatsApp API</div>
            </Card>
          </div>
        </div>
      </div>
    </Card>
  );
};
