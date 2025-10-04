
import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { registerServiceWorker } from "./utils/registerServiceWorker";
import Index from "./pages/Index";
import { MainLayout } from "./components/layouts/MainLayout";
import { ProspectsLayout } from "./components/layouts/ProspectsLayout";
import { LoadingSpinner } from "./components/LoadingSpinner";

// Pages principales - Lazy loading with correct export handling
const HomePage = lazy(() => import("./pages/HomePage").then(module => ({ default: module.HomePage })));
const KpakpatoPage = lazy(() => import("./pages/KpakpatoPage").then(module => ({ default: module.KpakpatoPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.DashboardPage })));

// Gestion des bots et automatisations
const BotManagementPage = lazy(() => import("./pages/BotManagementPage").then(module => ({ default: module.BotManagementPage })));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage").then(module => ({ default: module.AutomationsPage })));
const BotTestPage = lazy(() => import("./pages/BotTestPage").then(module => ({ default: module.BotTestPage })));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage").then(module => ({ default: module.PublicBotChatPage })));

// Support et compte
const SupportPage = lazy(() => import("./pages/SupportPage").then(module => ({ default: module.SupportPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then(module => ({ default: module.AccountPage })));

// Authentication
const AuthPage = lazy(() => import("./pages/AuthPage"));

// Administration
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage").then(module => ({ default: module.UsersManagementPage })));

// Modules IA spécialisés
const BusinessModule = lazy(() => import("./pages/modules/BusinessModule").then(module => ({ default: module.BusinessModule })));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule").then(module => ({ default: module.MarketingModule })));
const GestionModule = lazy(() => import("./pages/modules/GestionModule").then(module => ({ default: module.GestionModule })));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule").then(module => ({ default: module.CitoyenModule })));
const VisualCreatorModule = lazy(() => import("./pages/modules/VisualCreatorModule").then(module => ({ default: module.VisualCreatorModule })));

// Marketing
const MarketingGallery = lazy(() => import("./pages/MarketingGallery"));

// Campagnes de partage
const SocialSharingCampaignsPage = lazy(() => import("./pages/SocialSharingCampaignsPage").then(module => ({ default: module.SocialSharingCampaignsPage })));

// WhatsApp Connect
const WhatsAppConnectPage = lazy(() => import("./pages/WhatsAppConnectPage"));

// CRM & Prospects
const IAProspectPreCallPage = lazy(() => import("./pages/IAProspectPreCallPage").then(module => ({ default: module.IAProspectPreCallPage })));
const ProspectPreparationPage = lazy(() => import("./pages/ProspectPreparationPage").then(module => ({ default: module.ProspectPreparationPage })));
const EvaluationResultsPage = lazy(() => import("./pages/EvaluationResultsPage").then(module => ({ default: module.EvaluationResultsPage })));

import { SystemTestPage } from "./pages/SystemTestPage";
import { PlatformTestPage } from "./pages/PlatformTestPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminRolesPage } from "./pages/admin/AdminRolesPage";
import { AdminPermissionsPage } from "./pages/admin/AdminPermissionsPage";
import { AdminUsersManagementPage } from "./pages/admin/AdminUsersManagementPage";
import { SystemLogsViewer } from "./components/admin/SystemLogsViewer";
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.ShortLinkRedirectPage })));
const WidgetPage = lazy(() => import("./pages/WidgetPage").then(module => ({ default: module.WidgetPage })));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  // Register service worker for push notifications
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
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
                  {/* Route d'accueil avec redirection vers home */}
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  
                  {/* Routes avec layout principal */}
                  <Route element={<MainLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/chat" element={<KpakpatoPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    {/* Gestion des bots */}
                    <Route path="/bots" element={<BotManagementPage />} />
                    <Route path="/bots" element={<AutomationsPage />} />
                    
                    {/* Campagnes de partage */}
                    <Route path="/social-campaigns" element={<SocialSharingCampaignsPage />} />
                    
                    {/* WhatsApp Connect */}
                    <Route path="/whatsapp-connect" element={<WhatsAppConnectPage />} />
                    
                    {/* Modules IA */}
                    <Route path="/modules/business" element={<BusinessModule />} />
                    <Route path="/modules/visual-creator" element={<VisualCreatorModule />} />
                    
                    {/* Marketing */}
                    <Route path="/marketing-gallery" element={<MarketingGallery />} />
                    
                    {/* Support et compte */}
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    
                    {/* Administration */}
                    
                    {/* Tests système */}
                    <Route path="/system-test" element={<SystemTestPage />} />
                    <Route path="/platform-test" element={<PlatformTestPage />} />
                    
                    {/* Admin dashboard */}
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/roles" element={<AdminRolesPage />} />
                    <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
                    <Route path="/admin/users" element={<AdminUsersManagementPage />} />
                    <Route path="/admin/logs" element={<SystemLogsViewer />} />
                    
                     {/* CRM & Prospects */}
                     <Route path="/prospects" element={<ProspectsLayout />} />
                     <Route path="/ia-prospect-precall" element={<IAProspectPreCallPage />} />
                     <Route path="/prospect-preparation" element={<ProspectPreparationPage />} />
                     <Route path="/evaluation-results" element={<EvaluationResultsPage />} />
                  </Route>
                  
                  {/* Routes publiques sans layout */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/widget" element={<WidgetPage />} />
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
};

export default App;
