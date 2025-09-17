
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IABenefitsCards } from '@/components/IABenefitsCards';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { QuickActions } from '@/components/home/QuickActions';
import { AIModules } from '@/components/home/AIModules';
import { AuditSection } from '@/components/home/AuditSection';
import { PricingSection } from '@/components/home/PricingSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { PersonalAgentCreator } from '@/components/PersonalAgentCreator';
import { PersonalAgentsList } from '@/components/PersonalAgentsList';
import { usePersonalAgents } from '@/hooks/usePersonalAgents';
import { Button } from '@/components/ui/button';
import { Plus, List } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [showAgentCreator, setShowAgentCreator] = useState(false);
  const [showAgentsList, setShowAgentsList] = useState(false);
  const { activeAgent, hasPersonalAgents, fetchAgents } = usePersonalAgents();

  return (
    <div className={`w-full space-y-6 sm:space-y-8 ${isMobile ? 'px-[2.5%]' : ''}`}>
      {/* Header de bienvenue - responsive */}
      <WelcomeHeader userName={user?.name} />

      {/* Section Agents IA Personnels */}
      {isAuthenticated && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-primary mb-2">
              Kpakpato – Agent IA
            </h2>
            <p className="text-muted-foreground">
              Créez et gérez vos agents de conversation personnalisés
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setShowAgentCreator(true)}
              className="bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer mon agent IA conversation
            </Button>
            
            {hasPersonalAgents && (
              <Button
                onClick={() => setShowAgentsList(true)}
                variant="outline"
                size="lg"
              >
                <List className="w-5 h-5 mr-2" />
                Mes agents ({activeAgent ? '1 actif' : '0 actif'})
              </Button>
            )}
          </div>
          
          {activeAgent && (
            <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Agent actif:</span> {activeAgent.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Section Audit Offert */}
      <AuditSection />

      {/* Actions rapides - responsive grid */}
      <QuickActions />

      {/* Modules IA */}
      <AIModules />

      {/* Section "L'IA est faite pour vous si" en bas */}
      <div>
        <IABenefitsCards />
      </div>

      {/* Section des plans tarifaires */}
      <div className="-mx-[2.5%] sm:mx-0">
        <PricingSection />
      </div>

      {/* Bouton de chat en direct */}
      <FloatingChatButton />

      {/* Modals de gestion des agents */}
      <PersonalAgentCreator
        open={showAgentCreator}
        onClose={() => setShowAgentCreator(false)}
        onAgentCreated={() => {
          fetchAgents();
          setShowAgentCreator(false);
        }}
      />
      
      <PersonalAgentsList
        open={showAgentsList}
        onClose={() => setShowAgentsList(false)}
      />
    </div>
  );
};
