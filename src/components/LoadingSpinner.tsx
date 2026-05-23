import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Chargement...</h3>
        <p className="text-sm text-gray-500">Préparation de votre espace de travail</p>
      </div>
    </div>
  );
};

/**
 * Fallback de Suspense pour les navigations entre routes.
 * Ne rend rien pendant les premières `delayMs` ms : pour les chunks
 * déjà en cache ou rapides, l'utilisateur ne voit aucun spinner et
 * la page précédente reste affichée jusqu'à l'arrivée de la nouvelle.
 */
export const DeferredRouteFallback: React.FC<{ delayMs?: number; inline?: boolean }> = ({
  delayMs = 300,
  inline = false,
}) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!show) return null;

  if (inline) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" aria-label="Chargement" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-label="Chargement" />
    </div>
  );
};
