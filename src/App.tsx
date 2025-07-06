
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProvider } from '@/contexts/UserContext';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { MainLayout } from '@/components/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { BotManagement } from '@/components/BotManagement';
import { UsersManagementPage } from '@/pages/UsersManagementPage';
import { AdminSetupPage } from '@/pages/AdminSetupPage';
import { MarketingModule } from '@/pages/modules/MarketingModule';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <Toaster />
            <Routes>
              {/* Routes sans layout (pages standalone) */}
              <Route path="/admin-setup" element={<AdminSetupPage />} />

              {/* Routes avec layout principal */}
              <Route path="/*" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="home" element={<HomePage />} />
                <Route path="bots" element={<BotManagement />} />
                <Route path="users-management" element={<UsersManagementPage />} />
                <Route path="modules/marketing" element={<MarketingModule />} />
              </Route>
            </Routes>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
