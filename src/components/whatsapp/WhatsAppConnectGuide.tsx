import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Smartphone, 
  Webhook, 
  Code, 
  Users,
  CheckCircle,
  Circle,
  ArrowRight,
  QrCode,
  Settings,
  Globe
} from "lucide-react";

interface WhatsAppConnectGuideProps {
  onConnectNumber: () => void;
  onWebhookSetup: () => void;
  onWidgetSetup: () => void;
  onManageAgents: () => void;
  hasConnectedSessions: boolean;
  hasWebhookConfigured: boolean;
  hasWidgetConfigured: boolean;
}

const WhatsAppConnectGuide: React.FC<WhatsAppConnectGuideProps> = ({
  onConnectNumber,
  onWebhookSetup,
  onWidgetSetup,
  onManageAgents,
  hasConnectedSessions,
  hasWebhookConfigured,
  hasWidgetConfigured
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: "Aperçu",
      subtitle: "Commencer",
      description: "Transformez votre WhatsApp en un outil puissant de génération de leads et d'engagement client avec des conversations alimentées par l'IA",
      icon: MessageSquare,
      status: "completed",
      action: null
    },
    {
      id: 2,
      title: "Connecter le Numéro",
      subtitle: "Lier votre WhatsApp",
      description: "Sélectionnez une campagne et scannez le code QR avec votre WhatsApp pour établir la connexion",
      icon: Smartphone,
      status: hasConnectedSessions ? "completed" : "pending",
      action: onConnectNumber
    },
    {
      id: 3,
      title: "Intégration Webhook",
      subtitle: "Connecter les formulaires",
      description: "Connectez vos formulaires de capture de leads pour déclencher automatiquement les conversations WhatsApp",
      icon: Webhook,
      status: hasWebhookConfigured ? "completed" : "pending",
      action: onWebhookSetup
    },
    {
      id: 4,
      title: "Widget Site Web",
      subtitle: "Ajouter le chat",
      description: "Créez un widget WhatsApp flottant pour votre site web qui redirige les visiteurs directement vers votre agent",
      icon: Code,
      status: hasWidgetConfigured ? "completed" : "pending",
      action: onWidgetSetup
    },
    {
      id: 5,
      title: "Gérer les Agents",
      subtitle: "Gérer vos agents",
      description: "Gérez vos agents IA, analysez les performances et optimisez vos conversations",
      icon: Users,
      status: "available",
      action: onManageAgents
    }
  ];

  const getStepStatus = (step: any) => {
    if (step.status === "completed") return "completed";
    if (step.status === "pending") return "pending";
    return "available";
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automatisation WhatsApp IA</h1>
            <p className="text-muted-foreground text-lg">
              Transformez votre WhatsApp en un outil puissant de génération de leads et d'engagement client avec des conversations alimentées par l'IA
            </p>
          </div>
        </div>
        
        <Button 
          size="lg" 
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          onClick={() => setActiveStep(2)}
        >
          Commencer la Configuration WhatsApp <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.slice(0, 4).map((step) => {
          const Icon = step.icon;
          const status = getStepStatus(step);
          
          return (
            <Card 
              key={step.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeStep === step.id ? 'ring-2 ring-green-500 border-green-200' : ''
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              <CardContent className="p-4 text-center space-y-3">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                  status === 'completed' ? 'bg-green-100' : 
                  status === 'pending' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Icon className={`w-6 h-6 ${
                      status === 'pending' ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                </div>
                
                <Badge variant={
                  status === 'completed' ? 'default' : 
                  status === 'pending' ? 'secondary' : 'outline'
                } className="text-xs">
                  {status === 'completed' ? '✓ Terminé' : 
                   status === 'pending' ? 'En attente' : 'Disponible'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 4-Step Setup Process */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Processus de Configuration en 4 Étapes</h2>
              <p className="text-muted-foreground">
                Suivez ces étapes pour mettre en place votre automatisation WhatsApp IA
              </p>
            </div>

            <div className="space-y-4">
              {steps.slice(0, 4).map((step, index) => {
                const Icon = step.icon;
                const status = getStepStatus(step);
                const isActive = activeStep === step.id;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center space-x-4 p-4 rounded-lg border transition-all ${
                      isActive ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      status === 'completed' ? 'bg-green-100' : 
                      status === 'pending' ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className={`text-sm font-bold ${
                          status === 'pending' ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {step.id}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{step.title}</h3>
                        {status === 'completed' && (
                          <Badge variant="default" className="text-xs">✓</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    
                    {step.action && (
                      <Button
                        onClick={step.action}
                        variant={status === 'completed' ? 'outline' : 'default'}
                        size="sm"
                        className={status === 'completed' ? '' : 'bg-green-600 hover:bg-green-700'}
                      >
                        {status === 'completed' ? 'Gérer' : 'Configurer'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works Section */}
      {activeStep === 3 && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <h3 className="text-xl font-bold">Comment Fonctionne l'Intégration Webhook</h3>
              <p className="text-muted-foreground">
                Déclenchez automatiquement des conversations WhatsApp lorsque quelqu'un soumet vos formulaires de capture de leads
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Lead Soumet le Formulaire</h4>
                    <p className="text-sm text-muted-foreground">
                      Le visiteur remplit votre formulaire de capture de leads
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Webhook se Déclenche</h4>
                    <p className="text-sm text-muted-foreground">
                      La plateforme du formulaire envoie les données à l'URL webhook
                    </p>
                  </div>
                </div>
                
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">L'IA Répond</h4>
                    <p className="text-sm text-muted-foreground">
                      Votre agent envoie le premier message WhatsApp
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Plateformes supportées :</strong> System.io, HubSpot, Zapier, Make.com, Typeform, 
                  et toute plateforme qui supporte les webhooks. Incluez les champs : <code>name</code>, <code>phone</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppConnectGuide;