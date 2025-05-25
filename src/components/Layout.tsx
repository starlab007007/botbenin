
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TopHeader } from '@/components/TopHeader';
import { FloatingChatButton } from '@/components/FloatingChatButton';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header for mobile and desktop */}
      <TopHeader />
      
      <div className="flex">
        {/* Sidebar - hidden on mobile, visible on desktop */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          <div className="bg-gray-50 min-h-[calc(100vh-4rem)]">
            <Outlet />
          </div>
        </main>
      </div>
      
      <FloatingChatButton />
    </div>
  );
};
