
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { FloatingChatButton } from '@/components/FloatingChatButton';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Modern background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-muted pointer-events-none" />
      
      {/* Subtle floating elements for depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/5 rounded-full filter blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/10 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent/5 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>
      
      <div className="flex relative z-10">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">
          <div className="h-full p-6">
            <div className="h-full surface-elevated rounded-3xl overflow-hidden">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <FloatingChatButton />
    </div>
  );
};
