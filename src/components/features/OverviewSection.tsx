import React from 'react';
import { Card } from '@/components/ui/card';
import { Check, Target, Code } from 'lucide-react';
import { overviewData } from '@/data/featuresData';

export const OverviewSection: React.FC = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-3 gap-8">
          {/* What Is */}
          <Card className="p-8 space-y-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">
                {overviewData.whatIs.title}
              </h3>
              <p className="text-muted-foreground mb-4">
                {overviewData.whatIs.description}
              </p>
              <ul className="space-y-2">
                {overviewData.whatIs.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* For Who */}
          <Card className="p-8 space-y-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">
                {overviewData.forWho.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {overviewData.forWho.sectors.map((sector, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* Technologies */}
          <Card className="p-8 space-y-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Code className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-3">
                {overviewData.tech.title}
              </h3>
              <ul className="space-y-3">
                {overviewData.tech.stack.map((tech, index) => (
                  <li key={index} className="space-y-1">
                    <div className="font-medium">{tech.name}</div>
                    <div className="text-xs text-muted-foreground">{tech.category}</div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
