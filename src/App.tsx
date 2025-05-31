
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
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

const queryClient = new QueryClient();

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GoogleAuthHandler />
              <Routes>
                {/* Routes publiques */}
                <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                
                {/* Routes avec layout */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="chat-test" element={<BotTestPage />} />
                  <Route path="automatisations" element={<AutomationsPage />} />
                  <Route path="bots" element={<BotManagementPage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="prospects" element={<ProspectsPage />} />
                  <Route path="modules/business" element={<BusinessModule />} />
                  <Route path="modules/marketing" element={<MarketingModule />} />
                  <Route path="modules/gestion" element={<GestionModule />} />
                  <Route path="modules/citoyen" element={<CitoyenModule />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="users" element={<UsersManagementPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
