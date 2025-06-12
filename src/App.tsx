
import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./components/ThemeProvider";
import Index from "./pages/Index";
import { Layout } from "./components/Layout";

// Lazy loading components with correct named export handling
const HomePage = lazy(() => import("./pages/HomePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.ShortLinkRedirectPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const BotManagementPage = lazy(() => import("./pages/BotManagementPage").then(module => ({ default: module.BotManagementPage })));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage"));
const ProspectsPage = lazy(() => import("./pages/ProspectsPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BotTestPage = lazy(() => import("./pages/BotTestPage").then(module => ({ default: module.BotTestPage })));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage").then(module => ({ default: module.PublicBotChatPage })));

// Pages modulaires
const BusinessModule = lazy(() => import("./pages/modules/BusinessModule"));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule"));
const GestionModule = lazy(() => import("./pages/modules/GestionModule"));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserProvider>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                </div>
              }>
                <Routes>
                  <Route path="/" element={<Layout><Index /></Layout>} />
                  <Route path="/home" element={<Layout><HomePage /></Layout>} />
                  <Route path="/chat" element={<Layout><ChatPage /></Layout>} />
                  <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                  <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
                  <Route path="/bots" element={<Layout><BotManagementPage /></Layout>} />
                  <Route path="/automations" element={<Layout><AutomationsPage /></Layout>} />
                  <Route path="/prospects" element={<Layout><ProspectsPage /></Layout>} />
                  <Route path="/support" element={<Layout><SupportPage /></Layout>} />
                  <Route path="/account" element={<Layout><AccountPage /></Layout>} />
                  <Route path="/users" element={<Layout><UsersManagementPage /></Layout>} />
                  <Route path="/bot-test/:botId" element={<BotTestPage />} />
                  <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                  
                  {/* Modules */}
                  <Route path="/business" element={<Layout><BusinessModule /></Layout>} />
                  <Route path="/marketing" element={<Layout><MarketingModule /></Layout>} />
                  <Route path="/gestion" element={<Layout><GestionModule /></Layout>} />
                  <Route path="/citoyen" element={<Layout><CitoyenModule /></Layout>} />
                  
                  <Route path="*" element={<Layout><NotFound /></Layout>} />
                </Routes>
              </Suspense>
            </UserProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
