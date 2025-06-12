
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header moderne avec effet glassmorphism */}
      <TopHeader />
      
      <div className="flex">
        {/* Sidebar redesignée - cachée sur mobile, visible sur desktop */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        {/* Contenu principal avec design moderne */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">
            <div className="mx-auto max-w-8xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
