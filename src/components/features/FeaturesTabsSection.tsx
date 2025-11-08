import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Check, Bot, Zap, BarChart, MessageCircle, Layers, Shield } from 'lucide-react';
import { featuresData } from '@/data/featuresData';

const iconMap: Record<string, React.ElementType> = {
  bot: Bot,
  zap: Zap,
  'bar-chart': BarChart,
  'message-circle': MessageCircle,
  layers: Layers,
  shield: Shield
};

export const FeaturesTabsSection: React.FC = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Fonctionnalités Principales
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une plateforme complète pour automatiser et optimiser vos communications
          </p>
        </div>

        <Tabs defaultValue="bots" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto gap-2 bg-background/50 p-2">
            {featuresData.tabs.map((tab) => {
              const Icon = iconMap[tab.icon];
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex flex-col gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {featuresData.tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-8">
              <Card className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-3">
                        {tab.title}
                      </h3>
                      <p className="text-lg text-muted-foreground">
                        {tab.description}
                      </p>
                    </div>

                    <ul className="space-y-3">
                      {tab.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-base">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="text-6xl mb-4">
                        {React.createElement(iconMap[tab.icon], { className: "w-24 h-24 mx-auto text-primary/20" })}
                      </div>
                      <p className="text-sm">Aperçu de la fonctionnalité</p>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};
