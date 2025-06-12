
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const pathNames: { [key: string]: string } = {
  'home': 'Accueil',
  'chat': 'Chat IA',
  'dashboard': 'Dashboard',
  'bots': 'Gestion des Bots',
  'automations': 'Automatisations',
  'prospects': 'Prospects',
  'modules': 'Modules IA',
  'business': 'IA Business',
  'marketing': 'IA Marketing',
  'gestion': 'IA Gestion',
  'citoyen': 'IA Citoyen',
  'support': 'Support',
  'account': 'Mon Compte',
  'admin': 'Administration',
  'users': 'Utilisateurs',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length <= 1) {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <Home className="w-4 h-4 text-gray-500" />
        <span className="text-gray-900 font-medium">Accueil</span>
      </div>
    );
  }

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    const name = pathNames[segment] || segment;

    return {
      name,
      path,
      isLast,
    };
  });

  return (
    <nav className="flex items-center space-x-2 text-sm">
      <Link 
        to="/home" 
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.path}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {breadcrumb.isLast ? (
            <span className="text-gray-900 font-medium">{breadcrumb.name}</span>
          ) : (
            <Link
              to={breadcrumb.path}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {breadcrumb.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
