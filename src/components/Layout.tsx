
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header for mobile and desktop */}
      <TopHeader />
      
      <div className="flex">
        {/* Sidebar - hidden on mobile, visible on desktop */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 lg:ml-64 min-h-screen bg-gray-100">
          <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-6 bg-gray-100">
            <div className="animate-float-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
