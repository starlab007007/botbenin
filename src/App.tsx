
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

// Lazy loading pour optimiser les performances
const HomePage = lazy(() => import("./pages/HomePage"));
const ChatPage = lazy(() => import("./pages/ChatPage").then(module => ({ default: module.ChatPage })));
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.ShortLinkRedirectPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.DashboardPage })));
const BotManagementPage = lazy(() => import("./pages/BotManagementPage").then(module => ({ default: module.BotManagementPage })));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage"));
const ProspectsPage = lazy(() => import("./pages/ProspectsPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BotTestPage = lazy(() => import("./pages/BotTestPage"));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage"));

// Pages modulaires
const BusinessModule = lazy(() => import("./pages/modules/BusinessModule"));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule"));
const GestionModule = lazy(() => import("./pages/modules/GestionModule"));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserProvider>
              <Layout>
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/bots" element={<BotManagementPage />} />
                    <Route path="/automations" element={<AutomationsPage />} />
                    <Route path="/prospects" element={<ProspectsPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/users" element={<UsersManagementPage />} />
                    <Route path="/bot-test/:botId" element={<BotTestPage />} />
                    <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                    
                    {/* Modules */}
                    <Route path="/business" element={<BusinessModule />} />
                    <Route path="/marketing" element={<MarketingModule />} />
                    <Route path="/gestion" element={<GestionModule />} />
                    <Route path="/citoyen" element={<CitoyenModule />} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Layout>
            </UserProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
