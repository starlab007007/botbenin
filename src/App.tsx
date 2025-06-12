
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
import { MainLayout } from "./components/layouts/MainLayout";
import { LoadingSpinner } from "./components/LoadingSpinner";

// Pages principales - Lazy loading optimisé
const HomePage = lazy(() => import("./pages/HomePage").then(module => ({ default: module.HomePage })));
const ChatPage = lazy(() => import("./pages/ChatPage").then(module => ({ default: module.ChatPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.DashboardPage })));

// Gestion des bots et automatisations
const BotManagementPage = lazy(() => import("./pages/BotManagementPage").then(module => ({ default: module.BotManagementPage })));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage").then(module => ({ default: module.AutomationsPage })));
const BotTestPage = lazy(() => import("./pages/BotTestPage").then(module => ({ default: module.BotTestPage })));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage").then(module => ({ default: module.PublicBotChatPage })));

// CRM et Prospects
const ProspectsPage = lazy(() => import("./pages/ProspectsPage").then(module => ({ default: module.ProspectsPage })));

// Support et compte
const SupportPage = lazy(() => import("./pages/SupportPage").then(module => ({ default: module.SupportPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then(module => ({ default: module.AccountPage })));

// Administration
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage").then(module => ({ default: module.UsersManagementPage })));

// Modules IA spécialisés
const BusinessModule = lazy(() => import("./pages/modules/BusinessModule").then(module => ({ default: module.BusinessModule })));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule").then(module => ({ default: module.MarketingModule })));
const GestionModule = lazy(() => import("./pages/modules/GestionModule").then(module => ({ default: module.GestionModule })));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule").then(module => ({ default: module.CitoyenModule })));

// Pages spéciales
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.ShortLinkRedirectPage })));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UserProvider>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Route d'accueil sans layout */}
                  <Route path="/" element={<Index />} />
                  
                  {/* Routes avec layout principal */}
                  <Route path="/app" element={<MainLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="home" element={<HomePage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    
                    {/* Gestion des bots */}
                    <Route path="bots" element={<BotManagementPage />} />
                    <Route path="automations" element={<AutomationsPage />} />
                    
                    {/* CRM */}
                    <Route path="prospects" element={<ProspectsPage />} />
                    
                    {/* Modules IA */}
                    <Route path="modules">
                      <Route path="business" element={<BusinessModule />} />
                      <Route path="marketing" element={<MarketingModule />} />
                      <Route path="gestion" element={<GestionModule />} />
                      <Route path="citoyen" element={<CitoyenModule />} />
                    </Route>
                    
                    {/* Support et compte */}
                    <Route path="support" element={<SupportPage />} />
                    <Route path="account" element={<AccountPage />} />
                    
                    {/* Administration */}
                    <Route path="admin">
                      <Route path="users" element={<UsersManagementPage />} />
                    </Route>
                  </Route>
                  
                  {/* Routes publiques sans layout */}
                  <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                  <Route path="/bot-test/:botId" element={<BotTestPage />} />
                  <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                  
                  {/* Route 404 */}
                  <Route path="*" element={<NotFound />} />
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
