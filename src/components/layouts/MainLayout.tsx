
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ModernSidebar } from '@/components/navigation/ModernSidebar';
import { ModernTopHeader } from '@/components/navigation/ModernTopHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { useIsMobile } from '@/hooks/use-mobile';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header moderne */}
      <ModernTopHeader 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      
      <div className="flex">
        {/* Sidebar moderne */}
        <ModernSidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Contenu principal avec dimensions standardisées */}
        <main className={`flex-1 min-h-[calc(100vh-4rem)] ${isMobile ? '' : 'lg:ml-64'}`}>
          <div className={`bg-white border-b border-gray-200 ${isMobile ? 'px-4' : 'px-4 sm:px-6 lg:px-8'} py-3`}>
            <Breadcrumbs />
          </div>
          
          {/* Container avec largeur maximale et responsive padding */}
          <div className={`w-full max-w-full mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 sm:px-6 lg:px-8 py-6 lg:py-8'} overflow-x-hidden`}>
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Overlay pour mobile en plein écran */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
