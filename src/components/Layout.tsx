
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { FloatingChatButton } from '@/components/FloatingChatButton';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen gradient-warm text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl opacity-30 float-animation"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl opacity-20 float-animation" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600 rounded-full filter blur-3xl opacity-15 float-animation" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="flex relative z-10">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen backdrop-blur-sm">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
      <FloatingChatButton />
    </div>
  );
};
