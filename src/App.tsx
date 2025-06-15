
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import Index from "./pages/Index";
import { LoadingSpinner } from "./components/LoadingSpinner";

// Lazy load pages
const HomePage = lazy(() => import("./pages/HomePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const BotManagementPage = lazy(() => import("./pages/BotManagementPage"));
const BotTestPage = lazy(() => import("./pages/BotTestPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage"));
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage"));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage"));
const ProspectsPage = lazy(() => import("./pages/ProspectsPage"));
const SocialSharingCampaignsPage = lazy(() => import("./pages/SocialSharingCampaignsPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Module pages
const BusinessModule = lazy(() => import("./pages/modules/BusinessModule"));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule"));
const GestionModule = lazy(() => import("./pages/modules/GestionModule"));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <TooltipProvider>
        <AuthProvider>
          <UserProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/bots" element={<BotManagementPage />} />
                  <Route path="/bot-test" element={<BotTestPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/chat/:botId" element={<PublicBotChatPage />} />
                  <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/users" element={<UsersManagementPage />} />
                  <Route path="/automations" element={<AutomationsPage />} />
                  <Route path="/prospects" element={<ProspectsPage />} />
                  <Route path="/social-campaigns" element={<SocialSharingCampaignsPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  
                  {/* Module routes */}
                  <Route path="/modules/business" element={<BusinessModule />} />
                  <Route path="/modules/citoyen" element={<CitoyenModule />} />
                  <Route path="/modules/gestion" element={<GestionModule />} />
                  <Route path="/modules/marketing" element={<MarketingModule />} />
                  
                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </UserProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
