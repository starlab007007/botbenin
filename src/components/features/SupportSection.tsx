import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Mail, Phone, Star } from 'lucide-react';
import { supportData } from '@/data/featuresData';

const iconMap: Record<string, React.ElementType> = {
  book: Book,
  mail: Mail,
  phone: Phone,
  star: Star
};

export const SupportSection: React.FC = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Support & Assistance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un accompagnement à chaque étape de votre parcours
          </p>
        </div>

        {/* Support Levels */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {supportData.levels.map((level, index) => {
            const Icon = iconMap[level.icon];
            return (
              <Card 
                key={index}
                className="p-6 space-y-4 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">{level.title}</h3>
                  <Badge variant="secondary" className="text-xs mb-4">
                    {level.pack}
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {level.features.map((feature, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* Contact Info */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Horaires de Support</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lun-Ven</span>
                <span className="font-medium">9h - 18h (GMT+1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Samedi</span>
                <span className="font-medium">10h - 14h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">24/7</span>
                <span className="font-medium">Via chatbot</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-lg">Nous Contacter</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Email</div>
                <div className="font-medium">{supportData.contact.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Téléphone</div>
                <div className="font-medium">{supportData.contact.phone}</div>
              </div>
              <div>
                <div className="text-muted-foreground">WhatsApp</div>
                <div className="font-medium">{supportData.contact.whatsapp}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
