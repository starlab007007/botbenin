
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import BotManagementPage from "./pages/BotManagementPage";
import ChatPage from "./pages/ChatPage";
import BotTestPage from "./pages/BotTestPage";
import PublicBotChatPage from "./pages/PublicBotChatPage";
import ShortLinkRedirectPage from "./pages/ShortLinkRedirectPage";
import AutomationsPage from "./pages/AutomationsPage";
import ProspectsPage from "./pages/ProspectsPage";
import SocialSharingCampaignsPage from "./pages/SocialSharingCampaignsPage";
import SupportPage from "./pages/SupportPage";
import AccountPage from "./pages/AccountPage";
import UsersManagementPage from "./pages/UsersManagementPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Module pages
import CitoyenModule from "./pages/modules/CitoyenModule";
import BusinessModule from "./pages/modules/BusinessModule";
import GestionModule from "./pages/modules/GestionModule";
import MarketingModule from "./pages/modules/MarketingModule";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                
                {/* Routes avec Layout */}
                <Route path="/*" element={<Layout />}>
                  <Route path="home" element={<HomePage />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="bots" element={<BotManagementPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="test-bot/:botId" element={<BotTestPage />} />
                  <Route path="automations" element={<AutomationsPage />} />
                  <Route path="prospects" element={<ProspectsPage />} />
                  <Route path="campaigns" element={<SocialSharingCampaignsPage />} />
                  <Route path="support" element={<SupportPage />} />
                  <Route path="account" element={<AccountPage />} />
                  <Route path="users" element={<UsersManagementPage />} />
                  
                  {/* Module routes */}
                  <Route path="modules/citoyen" element={<CitoyenModule />} />
                  <Route path="modules/business" element={<BusinessModule />} />
                  <Route path="modules/gestion" element={<GestionModule />} />
                  <Route path="modules/marketing" element={<MarketingModule />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </UserProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
