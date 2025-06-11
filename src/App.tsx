
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { GoogleAuthHandler } from "@/components/GoogleAuthHandler";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ChatPage } from "./pages/ChatPage";
import { AutomationsPage } from "./pages/AutomationsPage";
import { BotManagementPage } from "./pages/BotManagementPage";
import { BotTestPage } from "./pages/BotTestPage";
import { PublicBotChatPage } from "./pages/PublicBotChatPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BusinessModule } from "./pages/modules/BusinessModule";
import { MarketingModule } from "./pages/modules/MarketingModule";
import { GestionModule } from "./pages/modules/GestionModule";
import { CitoyenModule } from "./pages/modules/CitoyenModule";
import { AccountPage } from "./pages/AccountPage";
import { SupportPage } from "./pages/SupportPage";
import { UsersManagementPage } from "./pages/UsersManagementPage";
import { ProspectsPage } from "./pages/ProspectsPage";
import NotFound from "./pages/NotFound";
import { TestAccountsPage } from "./pages/TestAccountsPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <AuthProvider>
          <UserProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <GoogleAuthHandler />
              <Routes>
                {/* Routes publiques */}
                <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                
                {/* Routes avec layout */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  
                  {/* Routes protégées nécessitant une authentification */}
                  <Route path="chat" element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  } />
                  <Route path="chat-test" element={
                    <ProtectedRoute>
                      <BotTestPage />
                    </ProtectedRoute>
                  } />
                  <Route path="automatisations" element={
                    <ProtectedRoute>
                      <AutomationsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="bots" element={
                    <ProtectedRoute>
                      <BotManagementPage />
                    </ProtectedRoute>
                  } />
                  <Route path="dashboard" element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } />
                  <Route path="prospects" element={
                    <ProtectedRoute>
                      <ProspectsPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Modules IA - Accessibles à tous les utilisateurs authentifiés */}
                  <Route path="modules/business" element={
                    <ProtectedRoute>
                      <BusinessModule />
                    </ProtectedRoute>
                  } />
                  <Route path="modules/marketing" element={
                    <ProtectedRoute>
                      <MarketingModule />
                    </ProtectedRoute>
                  } />
                  <Route path="modules/gestion" element={
                    <ProtectedRoute>
                      <GestionModule />
                    </ProtectedRoute>
                  } />
                  <Route path="modules/citoyen" element={
                    <ProtectedRoute>
                      <CitoyenModule />
                    </ProtectedRoute>
                  } />
                  
                  {/* Pages utilisateur */}
                  <Route path="account" element={
                    <ProtectedRoute>
                      <AccountPage />
                    </ProtectedRoute>
                  } />
                  <Route path="support" element={
                    <ProtectedRoute>
                      <SupportPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Pages admin */}
                  <Route path="users" element={
                    <ProtectedRoute requirePermissions={['manage_users']}>
                      <UsersManagementPage />
                    </ProtectedRoute>
                  } />
                  <Route path="test-accounts" element={
                    <ProtectedRoute requirePermissions={['manage_users']}>
                      <TestAccountsPage />
                    </ProtectedRoute>
                  } />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </UserProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
