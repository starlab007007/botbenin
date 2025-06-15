
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

// Lazy load pages with proper typing
const HomePage = lazy(() => import("./pages/HomePage").then(module => ({ default: module.default })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.default })));
const BotManagementPage = lazy(() => import("./pages/BotManagementPage").then(module => ({ default: module.default })));
const BotTestPage = lazy(() => import("./pages/BotTestPage").then(module => ({ default: module.default })));
const ChatPage = lazy(() => import("./pages/ChatPage").then(module => ({ default: module.default })));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage").then(module => ({ default: module.default })));
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.default })));
const AccountPage = lazy(() => import("./pages/AccountPage").then(module => ({ default: module.default })));
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage").then(module => ({ default: module.default })));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage").then(module => ({ default: module.default })));
const ProspectsPage = lazy(() => import("./pages/ProspectsPage").then(module => ({ default: module.default })));
const SocialSharingCampaignsPage = lazy(() => import("./pages/SocialSharingCampaignsPage").then(module => ({ default: module.default })));
const SupportPage = lazy(() => import("./pages/SupportPage").then(module => ({ default: module.default })));
const AdminPage = lazy(() => import("./pages/AdminPage").then(module => ({ default: module.default })));
const NotFound = lazy(() => import("./pages/NotFound").then(module => ({ default: module.default })));

// Module pages
const BusinessModule = lazy(() => import("./pages/modules/BusinessModule").then(module => ({ default: module.default })));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule").then(module => ({ default: module.default })));
const GestionModule = lazy(() => import("./pages/modules/GestionModule").then(module => ({ default: module.default })));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule").then(module => ({ default: module.default })));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
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
