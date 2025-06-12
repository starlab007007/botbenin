
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ModernSidebar } from '@/components/navigation/ModernSidebar';
import { ModernTopHeader } from '@/components/navigation/ModernTopHeader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
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
        
        {/* Contenu principal */}
        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-4rem)]">
          <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
            <Breadcrumbs />
          </div>
          
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
