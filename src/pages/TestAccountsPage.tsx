
import React from 'react';
import { TestAccountSetup } from '@/components/TestAccountSetup';

export const TestAccountsPage: React.FC = () => {
  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Comptes de test
          </h1>
          <p className="text-gray-600">
            Configuration et création de comptes de test pour le développement et les démonstrations
          </p>
        </div>
        
        <TestAccountSetup />
      </div>
    </div>
  );
};
