import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { HomePage } from '@/pages/HomePage';
import { BotManagement } from '@/components/BotManagement';
import { UsersManagementPage } from '@/pages/UsersManagementPage';
import { AdminSetupPage } from '@/pages/AdminSetupPage';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <div className="min-h-screen bg-background">
              <Toaster />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/bots" element={<BotManagement />} />
                <Route path="/users-management" element={<UsersManagementPage />} />
                <Route path="/admin-setup" element={<AdminSetupPage />} />
              </Routes>
            </div>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
