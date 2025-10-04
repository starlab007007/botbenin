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
      
      <div className="relative p-8 sm:p-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left content */}
          <div className="space-y-6">
            <Badge className="bg-white/20 text-white border-white/30 w-fit">
              <Zap className="w-3 h-3 mr-1" />
              Fonctionnalité Phare
            </Badge>
            
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Automatisez WhatsApp avec l'IA
              </h2>
              <p className="text-white/90 text-lg leading-relaxed">
                Transformez WhatsApp en machine à convertir. Répondez automatiquement à vos clients 24/7, 
                qualifiez vos prospects et boostez vos ventes sans effort.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90">Réponses automatiques intelligentes par IA</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90">Qualification automatique des prospects</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90">Campagnes WhatsApp multicanales</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                <p className="text-white/90">Analytics et rapports en temps réel</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                size="lg" 
                className="bg-white text-green-600 hover:bg-white/90 font-semibold"
                onClick={() => window.open('https://wa.me/22947333289?text=Bonjour, je souhaite automatiser WhatsApp avec votre plateforme IA', '_blank')}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Démarrer sur WhatsApp
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                asChild
              >
                <a href="https://bot.bj/bot/0484686a-34c8-4eeb-8974-90b079ee9fe2" target="_blank" rel="noopener noreferrer">
                  Discuter avec notre IA
                </a>
              </Button>
            </div>
          </div>

          {/* Right content - Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-white/80 text-sm">Disponibilité</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-white/80 text-sm">Taux de réponse</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <div className="text-4xl font-bold mb-2">3x</div>
              <div className="text-white/80 text-sm">Plus de conversions</div>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2" />
              <div className="text-white/80 text-sm">WhatsApp API</div>
            </Card>
          </div>
        </div>
      </div>
    </Card>
  );
};
