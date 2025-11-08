import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, MessageCircle, CreditCard, Code, Shield } from 'lucide-react';
import { faqData } from '@/data/featuresData';

const iconMap: Record<string, React.ElementType> = {
  'user-plus': UserPlus,
  'message-circle': MessageCircle,
  'credit-card': CreditCard,
  code: Code,
  shield: Shield
};

export const FAQSection: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = faqData.categories.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Questions Fréquentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Trouvez rapidement les réponses à vos questions
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une question..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {filteredCategories.map((category, catIndex) => {
            const Icon = iconMap[category.icon];
            return (
              <Card key={catIndex} className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{category.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      {category.questions.length} questions
                    </Badge>
                  </div>
                </div>

                <Accordion type="single" collapsible>
                  {category.questions.map((item, qIndex) => (
                    <AccordionItem key={qIndex} value={`q-${catIndex}-${qIndex}`}>
                      <AccordionTrigger className="text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            );
          })}

          {filteredCategories.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Aucune question ne correspond à votre recherche.
              </p>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};
