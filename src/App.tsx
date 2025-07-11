
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import PublicBotChatPage from "./pages/PublicBotChatPage";
import ShortLinkRedirectPage from "./pages/ShortLinkRedirectPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import BotManagementPage from "./pages/BotManagementPage";
import AutomationsPage from "./pages/AutomationsPage";
import ProspectsPage from "./pages/ProspectsPage";
import SocialSharingCampaignsPage from "./pages/SocialSharingCampaignsPage";
import SupportPage from "./pages/SupportPage";
import SystemTestPage from "./pages/SystemTestPage";
import BotTestPage from "./pages/BotTestPage";
import UsersManagementPage from "./pages/UsersManagementPage";
import AccountPage from "./pages/AccountPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/bot/:botId" element={<PublicBotChatPage />} />
              <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bots" element={<BotManagementPage />} />
              <Route path="/automations" element={<AutomationsPage />} />
              <Route path="/prospects" element={<ProspectsPage />} />
              <Route path="/campaigns" element={<SocialSharingCampaignsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/system-test" element={<SystemTestPage />} />
              <Route path="/bot-test" element={<BotTestPage />} />
              <Route path="/users" element={<UsersManagementPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
