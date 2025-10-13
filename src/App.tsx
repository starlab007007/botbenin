
import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UserProvider } from "./contexts/UserContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./contexts/LanguageContext";
import { registerServiceWorker } from "./utils/registerServiceWorker";
import { initPerformanceMonitoring } from "./utils/performance";
import { useActivityTracking } from "./hooks/useActivityTracking";
import Index from "./pages/Index";
import { MainLayout } from "./components/layouts/MainLayout";
import { ProspectsLayout } from "./components/layouts/ProspectsLayout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { GoogleAnalytics } from "./components/GoogleAnalytics";

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
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage })));

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

// SEO Pages
const PricingPage = lazy(() => import("./pages/PricingPage").then(module => ({ default: module.PricingPage })));

// Admin Pages
const NotificationTestPage = lazy(() => import("./pages/admin/NotificationTestPage").then(module => ({ default: module.NotificationTestPage })));
const FAQPage = lazy(() => import("./pages/FAQPage").then(module => ({ default: module.FAQPage })));
const BlogPage = lazy(() => import("./pages/BlogPage").then(module => ({ default: module.BlogPage })));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage").then(module => ({ default: module.BlogPostPage })));
const TestimonialsPage = lazy(() => import("./pages/TestimonialsPage").then(module => ({ default: module.TestimonialsPage })));
const UseCaseEcommercePage = lazy(() => import("./pages/UseCaseEcommercePage").then(module => ({ default: module.UseCaseEcommercePage })));
const UseCaseSupportPage = lazy(() => import("./pages/UseCaseSupportPage").then(module => ({ default: module.UseCaseSupportPage })));

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
const SystemLogsPage = lazy(() => import("./pages/admin/SystemLogsPage"));
import { AdminRoute } from "./components/auth/AdminRoute";
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

const AppContent = () => {
  useActivityTracking();
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
                  {/* Routes avec layout principal */}
                  <Route element={<MainLayout />}>
                    {/* Route d'accueil */}
                    <Route path="/" element={<Index />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/chat" element={<KpakpatoPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    {/* Gestion des bots */}
                    <Route path="/bots" element={<BotManagementPage />} />
                    
                    {/* Campagnes de partage */}
                    <Route path="/social-campaigns" element={<SocialSharingCampaignsPage />} />
                    
                    {/* WhatsApp Connect */}
                    <Route path="/whatsapp-connect" element={<WhatsAppConnectPage />} />
                    
                    {/* SEO Pages */}
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />
                    <Route path="/testimonials" element={<TestimonialsPage />} />
                    <Route path="/use-case/ecommerce" element={<UseCaseEcommercePage />} />
                    <Route path="/use-case/support" element={<UseCaseSupportPage />} />
                    
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
                    
                    {/* Admin dashboard - Protected */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
                    <Route path="/admin/roles" element={<AdminRoute><AdminRolesPage /></AdminRoute>} />
                    <Route path="/admin/permissions" element={<AdminRoute><AdminPermissionsPage /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsersManagementPage /></AdminRoute>} />
          <Route path="/admin/logs" element={<AdminRoute><SystemLogsPage /></AdminRoute>} />
          <Route path="/admin/notification-test" element={<AdminRoute><NotificationTestPage /></AdminRoute>} />
                    
                     {/* CRM & Prospects */}
                     <Route path="/prospects" element={<ProspectsLayout />} />
                     <Route path="/ia-prospect-precall" element={<IAProspectPreCallPage />} />
                     <Route path="/prospect-preparation" element={<ProspectPreparationPage />} />
                     <Route path="/evaluation-results" element={<EvaluationResultsPage />} />
                  </Route>
                  
                  {/* Routes publiques sans layout */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/widget" element={<WidgetPage />} />
                  <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                  <Route path="/bot-test/:botId" element={<BotTestPage />} />
                  <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                  
                  {/* Route 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
  );
};

const App = () => {
  // Register service worker for push notifications and initialize performance monitoring
  useEffect(() => {
    registerServiceWorker();
    initPerformanceMonitoring();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GoogleAnalytics />
              <AuthProvider>
                <UserProvider>
                  <AppContent />
                </UserProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
