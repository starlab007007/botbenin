
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

// Lazy loading components with correct default export handling
const HomePage = lazy(() => import("./pages/HomePage").then(module => ({ default: module.default })));
const ChatPage = lazy(() => import("./pages/ChatPage").then(module => ({ default: module.default })));
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.ShortLinkRedirectPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.default })));
const BotManagementPage = lazy(() => import("./pages/BotManagementPage").then(module => ({ default: module.BotManagementPage })));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage").then(module => ({ default: module.default })));
const ProspectsPage = lazy(() => import("./pages/ProspectsPage").then(module => ({ default: module.default })));
const SupportPage = lazy(() => import("./pages/SupportPage").then(module => ({ default: module.default })));
const AccountPage = lazy(() => import("./pages/AccountPage").then(module => ({ default: module.default })));
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage").then(module => ({ default: module.default })));
const NotFound = lazy(() => import("./pages/NotFound").then(module => ({ default: module.default })));
const BotTestPage = lazy(() => import("./pages/BotTestPage").then(module => ({ default: module.BotTestPage })));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage").then(module => ({ default: module.PublicBotChatPage })));

// Pages modulaires
const BusinessModule = lazy(() => import("./pages/modules/BusinessModule").then(module => ({ default: module.default })));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule").then(module => ({ default: module.default })));
const GestionModule = lazy(() => import("./pages/modules/GestionModule").then(module => ({ default: module.default })));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule").then(module => ({ default: module.default })));

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
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Index />} />
                    <Route path="home" element={<HomePage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="bots" element={<BotManagementPage />} />
                    <Route path="automations" element={<AutomationsPage />} />
                    <Route path="prospects" element={<ProspectsPage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="account" element={<AccountPage />} />
                    <Route path="users" element={<UsersManagementPage />} />
                    
                    {/* Modules */}
                    <Route path="business" element={<BusinessModule />} />
                    <Route path="marketing" element={<MarketingModule />} />
                    <Route path="gestion" element={<GestionModule />} />
                    <Route path="citoyen" element={<CitoyenModule />} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Route>
                  
                  {/* Routes sans Layout */}
                  <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                  <Route path="/bot-test/:botId" element={<BotTestPage />} />
                  <Route path="/bot/:botId" element={<PublicBotChatPage />} />
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
