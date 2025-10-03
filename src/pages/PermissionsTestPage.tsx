import React from 'react';
import { PermissionsExamples } from '@/components/auth/PermissionsExamples';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export const PermissionsTestPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">Système de Permissions</h1>
            <p className="text-muted-foreground">
              Test et démonstration du système de permissions granulaires
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            À propos du système de permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            🔒 <strong>Sécurité renforcée</strong> : Toutes les fonctionnalités critiques sont protégées par des permissions granulaires
          </p>
          <p>
            👥 <strong>Gestion des rôles</strong> : Les permissions sont attribuées via des rôles (Admin, Manager, Marketing, Sales, etc.)
          </p>
          <p>
            🎯 <strong>Contrôle précis</strong> : Chaque action peut être contrôlée individuellement (view, create, edit, delete)
          </p>
          <p>
            🚀 <strong>Performance</strong> : Vérifications côté client ET serveur pour une sécurité maximale
          </p>
        </CardContent>
      </Card>

      <PermissionsExamples />
    </div>
  );
};
