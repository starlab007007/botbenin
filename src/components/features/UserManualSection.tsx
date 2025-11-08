import React from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, PlayCircle, FileText, AlertCircle } from 'lucide-react';
import { userManualSteps } from '@/data/featuresData';

export const UserManualSection: React.FC = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Manuel d'Utilisation Interactif
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Guide pas à pas pour maîtriser Bot.bj
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {userManualSteps.map((step) => (
              <AccordionItem 
                key={step.step} 
                value={`step-${step.step}`}
                className="border rounded-lg bg-background"
              >
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-4 text-left">
                    <Badge className="text-lg px-3 py-1">
                      {step.step}
                    </Badge>
                    <div>
                      <div className="font-bold text-lg">{step.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {step.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-6 pb-6">
                  <Card className="p-6 space-y-6">
                    {/* Prerequisites */}
                    {step.prerequisites && (
                      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                          <div className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                            Prérequis
                          </div>
                          <div className="text-sm text-amber-800 dark:text-amber-200">
                            {step.prerequisites}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Étapes à suivre :</h4>
                      <ol className="space-y-2">
                        {step.tasks.map((task, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <span className="text-sm pt-0.5">{task}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Resources */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t">
                      <Button variant="outline" size="sm" className="gap-2">
                        <PlayCircle className="w-4 h-4" />
                        Voir la vidéo
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Télécharger le PDF
                      </Button>
                    </div>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Additional Resources */}
          <Card className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
            <h3 className="font-bold text-lg mb-4">Ressources Complémentaires</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start gap-2">
                📚 Base de connaissances
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                💬 Support chat en direct
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                📧 Support email
              </Button>
              <Button variant="outline" className="justify-start gap-2">
                👥 Communauté d'utilisateurs
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
