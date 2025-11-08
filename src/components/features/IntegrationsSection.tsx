import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, FileSpreadsheet, Link, Code, 
  Zap, Users, ShoppingBag, ShoppingCart 
} from 'lucide-react';
import { integrationsData } from '@/data/featuresData';

const iconMap: Record<string, React.ElementType> = {
  'message-circle': MessageCircle,
  'file-spreadsheet': FileSpreadsheet,
  link: Link,
  code: Code,
  zap: Zap,
  users: Users,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart
};

export const IntegrationsSection: React.FC = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Intégrations & API
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connectez Bot.bj à vos outils préférés
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {integrationsData.map((integration, index) => {
            const Icon = iconMap[integration.icon];
            return (
              <Card 
                key={index}
                className="p-6 text-center space-y-3 hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-medium text-sm">{integration.name}</div>
                <Badge 
                  variant={integration.status === 'available' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {integration.status === 'available' ? 'Disponible' : 'Bientôt'}
                </Badge>
              </Card>
            );
          })}
        </div>

        {/* API Documentation */}
        <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Documentation API</h3>
              <p className="text-muted-foreground">
                Intégrez Bot.bj à vos applications avec notre API REST complète
              </p>
              <ul className="space-y-2 text-sm">
                <li>✓ Référence API complète</li>
                <li>✓ Génération de clés API</li>
                <li>✓ Exemples de code (Python, JS, PHP)</li>
                <li>✓ Sandbox de test</li>
              </ul>
            </div>
            <div className="bg-card p-6 rounded-lg border font-mono text-sm">
              <div className="text-muted-foreground mb-2">// Example API Call</div>
              <div className="text-primary">fetch</div>
              <div>('https://api.bot.bj/v1/bots',</div>
              <div className="ml-4">{'{'}</div>
              <div className="ml-8">headers: {'{'}</div>
              <div className="ml-12">'Authorization': 'Bearer YOUR_KEY'</div>
              <div className="ml-8">{'}'}</div>
              <div className="ml-4">{'}'}</div>
              <div>)</div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
