import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Play, Star, TrendingUp, Users, Zap, Shield, Globe } from 'lucide-react';
import { heroData } from '@/data/featuresData';
import { useNavigate } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-secondary/5 py-20 md:py-32">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-grid-white/5 bg-[size:50px_50px]" style={{ maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)' }} />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="mx-auto max-w-6xl text-center space-y-8">
          {/* Badge Premium */}
          <div className="flex justify-center animate-fade-in">
            <Badge variant="secondary" className="px-6 py-2.5 text-sm font-medium bg-primary/10 hover:bg-primary/20 transition-colors border-2 border-primary/20">
              <Star className="w-4 h-4 mr-2 fill-primary text-primary animate-pulse" />
              #1 Plateforme IA en Afrique de l'Ouest
              <Zap className="w-4 h-4 ml-2 text-primary" />
            </Badge>
          </div>

          {/* Main Title with Gradient */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight animate-fade-in-up">
            <span className="block text-foreground">Bot.bj - Automatisation Intelligente</span>
            <span className="block mt-3 bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent animate-gradient">
              pour l'Afrique
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            La première plateforme d'intelligence artificielle conversationnelle 
            <span className="text-primary font-semibold"> made in Africa</span>, pour les entreprises africaines. 
            Automatisez vos conversations, boostez vos ventes et ravissez vos clients.
          </p>

          {/* Features Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <Shield className="w-4 h-4 text-primary" />
              <span>Sécurisé RGPD</span>
            </div>
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <Zap className="w-4 h-4 text-primary" />
              <span>Sans Code</span>
            </div>
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
              <Globe className="w-4 h-4 text-primary" />
              <span>Multi-canal</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Button 
              size="lg" 
              className="text-lg px-10 h-14 shadow-2xl hover:shadow-primary/50 transition-all hover:scale-105 group"
              onClick={() => navigate('/register')}
            >
              Commencer Gratuitement
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 h-14 border-2 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Voir la Démo
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground pt-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary border-3 border-background flex items-center justify-center text-white text-xs font-bold shadow-lg"
                >
                  {i === 3 ? '🇧🇯' : ''}
                </div>
              ))}
            </div>
            <div>
              <div className="font-semibold text-foreground">+500 entreprises</div>
              <div className="text-xs">nous font confiance</div>
            </div>
          </div>

          {/* Stats Grid avec Icônes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-16 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="group text-center space-y-3 p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                1000+
              </div>
              <div className="text-sm font-medium text-muted-foreground">Bots Créés</div>
            </div>

            <div className="group text-center space-y-3 p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 hover:shadow-xl transition-all hover:-translate-y-1" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-center gap-2">
                <Users className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                500+
              </div>
              <div className="text-sm font-medium text-muted-foreground">Clients Satisfaits</div>
            </div>

            <div className="group text-center space-y-3 p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 hover:shadow-xl transition-all hover:-translate-y-1" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                50K+
              </div>
              <div className="text-sm font-medium text-muted-foreground">Messages/Jour</div>
            </div>

            <div className="group text-center space-y-3 p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border hover:border-primary/50 hover:shadow-xl transition-all hover:-translate-y-1" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-center gap-2">
                <Star className="w-6 h-6 text-primary fill-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                4.9/5
              </div>
              <div className="text-sm font-medium text-muted-foreground">Satisfaction Client</div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-12 opacity-60 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            <div className="text-sm font-medium">Utilisé par :</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold">B1</div>
              <span className="text-sm">Startups</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold">B2</div>
              <span className="text-sm">PME</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold">B3</div>
              <span className="text-sm">E-commerce</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold">B4</div>
              <span className="text-sm">Agences</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 200" className="w-full h-auto">
          <path 
            fill="currentColor" 
            fillOpacity="0.1" 
            d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,200L1392,200C1344,200,1248,200,1152,200C1056,200,960,200,864,200C768,200,672,200,576,200C480,200,384,200,288,200C192,200,96,200,48,200L0,200Z"
            className="text-background"
          />
        </svg>
      </div>
    </section>
  );
};
