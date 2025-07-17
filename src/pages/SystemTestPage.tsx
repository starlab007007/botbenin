import React from 'react';
import { AuthTestSuite } from '@/components/AuthTestSuite';

export const SystemTestPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Tests Système d'Authentification</h1>
        <p className="text-gray-600 mt-2">Validation complète du processus d'authentification</p>
      </div>
      <AuthTestSuite />
    </div>
  );
};