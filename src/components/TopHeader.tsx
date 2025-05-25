
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Menu, X, Bell, Search, ChevronDown } from 'lucide-react';
import { MobileSidebar } from '@/components/MobileSidebar';
import { useNavigate } from 'react-router-dom';

export const TopHeader: React.FC = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6 lg:py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and menu */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={() => setShowMobileSidebar(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Bot className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg lg:text-xl font-bold text-gray-900">Bot.Bj</h1>
                <p className="text-xs lg:text-sm text-gray-500">Plateforme IA</p>
              </div>
            </div>
          </div>

          {/* Right side - User Menu */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            <Button variant="ghost" size="sm" className="p-2">
              <Search className="w-5 h-5 text-gray-600" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </Button>
            
            {/* User Profile Dropdown */}
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-sm lg:text-base font-semibold">U</span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-gray-900">Utilisateur</p>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar 
        isOpen={showMobileSidebar} 
        onClose={() => setShowMobileSidebar(false)} 
      />
    </>
  );
};
