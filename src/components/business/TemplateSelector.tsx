import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Bot, Send, Building2, Users, ArrowRight } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (templateId: string) => void;
}

const templates = [
  {
    id: 'prospect_standard',
    name: 'Prospect Standard',
    description: 'Pour gérer vos prospects et contacts commerciaux',
    icon: Target,
    category: 'Prospection',
    fields: ['Nom', 'Email', 'Téléphone', 'Entreprise', 'Statut']
  },
  {
    id: 'bot_training',
    name: 'Entraînement Bot',
    description: 'Pour enrichir les connaissances de vos bots IA',
    icon: Bot,
    category: 'IA',
    fields: ['Question', 'Réponse', 'Catégorie', 'Mots-clés']
  },
  {
    id: 'campaign_contacts',
    name: 'Contacts Campagne',
    description: 'Pour vos campagnes marketing et emailing',
    icon: Send,
    category: 'Marketing',
    fields: ['Nom', 'Email', 'Téléphone', 'Segment', 'Tags']
  },
  {
    id: 'b2b_leads',
    name: 'Leads B2B',
    description: 'Pour la prospection d\'entreprises (B2B)',
    icon: Building2,
    category: 'B2B',
    fields: ['Entreprise', 'Contact', 'Email', 'Secteur', 'Taille']
  },
  {
    id: 'b2c_customers',
    name: 'Clients B2C',
    description: 'Pour votre base clients particuliers',
    icon: Users,
    category: 'B2C',
    fields: ['Nom complet', 'Email', 'Téléphone', 'Adresse', 'Préférences']
  }
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choisir un template</CardTitle>
        <CardDescription>
          Sélectionnez le type de données que vous importez
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-all hover:shadow-md"
                onClick={() => onSelect(template.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold mb-2">{template.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {template.description}
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Champs inclus:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.fields.map((field, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm" className="w-full mt-4">
                    Sélectionner
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
