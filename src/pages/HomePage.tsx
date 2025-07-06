
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IABenefitsCards } from '@/components/IABenefitsCards';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { QuickActions } from '@/components/home/QuickActions';
import { AIModules } from '@/components/home/AIModules';
import { AuditSection } from '@/components/home/AuditSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className={`w-full space-y-6 sm:space-y-8 ${isMobile ? 'px-[2.5%]' : ''}`}>
      {/* Header de bienvenue - responsive */}
      <WelcomeHeader userName={user?.name} />

      {/* Lien Admin Setup si pas d'utilisateur connecté */}
      {!user && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800">Configuration Administrative</h3>
              <p className="text-red-600">Première installation ? Configurez votre compte administrateur.</p>
            </div>
            <Link to="/admin-setup">
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                <Shield className="w-4 h-4 mr-2" />
                Config Admin
              </Button>
            </Link>
          </div>
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
    </div>
  );
};
