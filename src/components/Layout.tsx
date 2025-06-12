
import React from 'react';
import { Navigate } from 'react-router-dom';

// Ce composant est désormais obsolète et redirige vers le nouveau layout
export const Layout: React.FC = () => {
  return <Navigate to="/app" replace />;
};
