
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Settings, 
  RotateCcw, 
  TrendingUp, 
  Users, 
  Target, 
  Bot
} from 'lucide-react';

const iaBenefits = [
  {
    title: 'Vous voulez automatiser vos conversations WhatsApp',
    description: 'Gérez automatiquement vos échanges WhatsApp, répondez instantanément à vos clients 24/7 et convertissez plus de prospects sans effort.',
    icon: Settings,
    color: 'from-green-500 to-green-600'
  },
  {
    title: 'Vous perdez des prospects par manque de suivi',
    description: 'Notre plateforme capture, organise et suit automatiquement tous vos prospects. Import intelligent depuis n\'importe quel format, mapping automatique et relances personnalisées.',
    icon: Target,
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Vos campagnes marketing manquent d\'efficacité',
    description: 'Créez et lancez des campagnes multicanales (Email, WhatsApp, SMS) en quelques clics. L\'IA génère votre contenu, optimise vos messages et analyse vos performances en temps réel.',
    icon: TrendingUp,
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'Votre service client ne peut pas répondre assez vite',
    description: 'Déployez des chatbots IA multilingues qui répondent instantanément à vos clients, comprennent leurs besoins et les orientent intelligemment vers les bonnes solutions.',
    icon: Bot,
    color: 'from-pink-500 to-pink-600'
  },
  {
    title: 'Vous manquez de temps pour créer du contenu',
    description: 'L\'IA génère automatiquement vos textes marketing, posts réseaux sociaux, emails de prospection et contenus publicitaires. Publiez sur toutes vos plateformes en un clic.',
    icon: Users,
    color: 'from-orange-500 to-orange-600'
  },
  {
    title: 'Vous voulez des données pour prendre de meilleures décisions',
    description: 'Tableaux de bord analytiques en temps réel, tracking des visiteurs, scoring automatique des prospects et rapports prédictifs pour optimiser votre stratégie.',
    icon: RotateCcw,
    color: 'from-indigo-500 to-indigo-600'
  }
];

export const IABenefitsCards: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          L'IA est faite pour vous si :
        </h2>
        <p className="text-gray-600 text-lg max-w-3xl mx-auto">
          Découvrez comment notre intelligence artificielle peut transformer votre entreprise
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {iaBenefits.map((benefit, index) => (
          <Card 
            key={index}
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white border-0 overflow-hidden relative"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
            <CardHeader className="pb-4 relative">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <benefit.icon className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                {benefit.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <CardDescription className="text-gray-600 leading-relaxed">
                {benefit.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
