import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quote } from 'lucide-react';
import { testimonialsData } from '@/data/featuresData';

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Témoignages Clients
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ce que nos clients disent de Bot.bj
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonialsData.map((testimonial, index) => (
            <Card 
              key={index}
              className="p-8 space-y-6 hover:shadow-xl transition-all"
            >
              <Quote className="w-10 h-10 text-primary/20" />
              
              <p className="text-lg italic leading-relaxed">
                "{testimonial.quote}"
              </p>

              <div className="flex items-start justify-between gap-4 pt-4 border-t">
                <div>
                  <div className="font-bold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.company}
                  </div>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {testimonial.sector}
                  </Badge>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">
                    {testimonial.results}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
