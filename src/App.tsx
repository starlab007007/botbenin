
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
import { MainLayout } from "./components/layouts/MainLayout";
import { ProspectsLayout } from "./components/layouts/ProspectsLayout";
import { LoadingSpinner, DeferredRouteFallback } from "./components/LoadingSpinner";
import { GoogleAnalytics } from "./components/GoogleAnalytics";

const Index = lazy(() => import("./pages/Index"));



// Pages principales - Lazy loading with correct export handling
const HomePage = lazy(() => import("./pages/HomePage").then(module => ({ default: module.HomePage })));
const KpakpatoPage = lazy(() => import("./pages/KpakpatoPage").then(module => ({ default: module.KpakpatoPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.DashboardPage })));

// Gestion des bots et automatisations
const BotManagementPage = lazy(() => import("./pages/AiAgentsListPage"));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage").then(module => ({ default: module.AutomationsPage })));
const BotTestPage = lazy(() => import("./pages/BotTestPage").then(module => ({ default: module.BotTestPage })));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage").then(module => ({ default: module.PublicBotChatPage })));
const VideoAssetsPage = lazy(() => import("./pages/VideoAssetsPage"));

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
const KnowledgeBasesPage = lazy(() => import("./pages/modules/KnowledgeBasesPage").then(module => ({ default: module.KnowledgeBasesPage })));
const MarketingModule = lazy(() => import("./pages/modules/MarketingModule").then(module => ({ default: module.MarketingModule })));
const GestionModule = lazy(() => import("./pages/modules/GestionModule").then(module => ({ default: module.GestionModule })));
const CitoyenModule = lazy(() => import("./pages/modules/CitoyenModule").then(module => ({ default: module.CitoyenModule })));
const VisualCreatorModule = lazy(() => import("./pages/modules/VisualCreatorModule").then(module => ({ default: module.VisualCreatorModule })));
const VisualGalleryPage = lazy(() => import("./pages/VisualGalleryPage"));

// Marketing
const MarketingGallery = lazy(() => import("./pages/MarketingGallery"));
const VideoProductionPage = lazy(() => import("./pages/VideoProductionPage").then(module => ({ default: module.VideoProductionPage })));
const VideoProductionCalendar = lazy(() => import("./pages/VideoProductionCalendar").then(module => ({ default: module.VideoProductionCalendar })));
const VideoGenerationPage = lazy(() => import("./pages/VideoGenerationPage").then(module => ({ default: module.VideoGenerationPage })));
const VideoLibraryPage = lazy(() => import("./pages/VideoLibraryPage").then(module => ({ default: module.VideoLibraryPage })));
const PromotionalTextGeneratorPage = lazy(() => import("./pages/PromotionalTextGeneratorPage").then(module => ({ default: module.PromotionalTextGeneratorPage })));

// Campagnes de partage
const SocialSharingCampaignsPage = lazy(() => import("./pages/SocialSharingCampaignsPage").then(module => ({ default: module.SocialSharingCampaignsPage })));

// WhatsApp Connect
const WhatsAppConnectPage = lazy(() => import("./pages/WhatsAppConnectPage"));
const WhatsAppDiffusionPage = lazy(() => import("./pages/WhatsAppDiffusionPage"));

// SEO Pages
const PricingPage = lazy(() => import("./pages/PricingPage").then(module => ({ default: module.PricingPage })));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const RecettePage = lazy(() => import("./pages/RecettePage"));

// Payment Pages
const PaymentHistoryPage = lazy(() => import("./pages/PaymentHistoryPage").then(module => ({ default: module.PaymentHistoryPage })));
const PaymentTestPage = lazy(() => import("./pages/PaymentTestPage").then(module => ({ default: module.PaymentTestPage })));

// Admin Pages
const NotificationTestPage = lazy(() => import("./pages/admin/NotificationTestPage").then(module => ({ default: module.NotificationTestPage })));
const FAQPage = lazy(() => import("./pages/FAQPage").then(module => ({ default: module.FAQPage })));
const BlogPage = lazy(() => import("./pages/BlogPage").then(module => ({ default: module.BlogPage })));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage").then(module => ({ default: module.BlogPostPage })));
const TestimonialsPage = lazy(() => import("./pages/TestimonialsPage").then(module => ({ default: module.TestimonialsPage })));
const UseCaseEcommercePage = lazy(() => import("./pages/UseCaseEcommercePage").then(module => ({ default: module.UseCaseEcommercePage })));
const UseCaseSupportPage = lazy(() => import("./pages/UseCaseSupportPage").then(module => ({ default: module.UseCaseSupportPage })));

// Documentation Portal
const DocumentationPortalPage = lazy(() => import("./pages/DocumentationPortalPage"));

// YOVO Gallery
const YovoGallery = lazy(() => import("./pages/YovoGallery"));

// WAOUH module
const WaouhPage = lazy(() => import("./pages/waouh/WaouhPage"));
const WaouhDemoPage = lazy(() => import("./pages/waouh/WaouhDemoPage"));

const WaouhRadarPage = lazy(() => import("./pages/admin/WaouhRadarPage"));
const WaouhWhatsAppOpsPage = lazy(() => import("./pages/admin/WaouhWhatsAppOpsPage"));
const AdminDiffusionApprovalsPage = lazy(() => import("./pages/admin/AdminDiffusionApprovalsPage"));
const AdminWaouhPartnersPage = lazy(() => import("./pages/admin/AdminWaouhPartnersPage"));
const AdminWaouhDataControlPage = lazy(() => import("./pages/admin/AdminWaouhDataControlPage"));
const AdminWaouhMonitoringPage = lazy(() => import("./pages/admin/AdminWaouhMonitoringPage"));
const AdminWaouhBusinessesPage = lazy(() => import("./pages/admin/AdminWaouhBusinessesPage"));
const AdminWaouhDealsPage = lazy(() => import("./pages/admin/AdminWaouhDealsPage"));
const AdminWaouhHistoriquePage = lazy(() => import("./pages/admin/AdminWaouhHistoriquePage"));
const AdminWaouhHealthCheckPage = lazy(() => import("./pages/admin/AdminWaouhHealthCheckPage"));
const PartnerDashboardPage = lazy(() => import("./pages/partner/PartnerDashboardPage"));
const PartnerBusinessesPage = lazy(() => import("./pages/partner/PartnerBusinessesPage"));
const PartnerProductsPage = lazy(() => import("./pages/partner/PartnerProductsPage"));
const PartnerSalesPage = lazy(() => import("./pages/partner/PartnerSalesPage"));
const PartnerPayoutsPage = lazy(() => import("./pages/partner/PartnerPayoutsPage"));

// Module Support Technique SIGDSTS (isolé, sans layout principal)
const SupportTechniquePage = lazy(() => import("./pages/SupportTechniquePage").then(m => ({ default: (m as any).default ?? (m as any).SupportTechniquePage })));
const SupportGuidePage = lazy(() => import("./pages/SupportGuidePage"));
const SupportTicketsPage = lazy(() => import("./pages/SupportTicketsPage").then(m => ({ default: (m as any).default ?? (m as any).SupportTicketsPage })));
const SupportTicketDetailPage = lazy(() => import("./pages/SupportTicketDetailPage").then(m => ({ default: (m as any).default ?? (m as any).SupportTicketDetailPage })));
const SupportTicketExpressPage = lazy(() => import("./pages/SupportTicketExpressPage"));
const SupportGuestTicketPage = lazy(() => import("./pages/SupportGuestTicketPage"));
const SupportAdminDashboardPage = lazy(() => import("./pages/admin/SupportAdminDashboardPage").then(m => ({ default: (m as any).default ?? (m as any).SupportAdminDashboardPage })));
const SupportAdminTicketsPage = lazy(() => import("./pages/admin/SupportAdminTicketsPage").then(m => ({ default: (m as any).default ?? (m as any).SupportAdminTicketsPage })));
const SupportKnowledgePage = lazy(() => import("./pages/admin/SupportKnowledgePage").then(m => ({ default: (m as any).default ?? (m as any).SupportKnowledgePage })));
const SigdstsQuizIndexPage = lazy(() => import("./pages/SigdstsQuizIndexPage"));
const SigdstsQuizPlayerPage = lazy(() => import("./pages/SigdstsQuizPlayerPage"));
const SigdstsQuizResultPage = lazy(() => import("./pages/SigdstsQuizResultPage"));
const SigdstsQuizGuestHistoryPage = lazy(() => import("./pages/SigdstsQuizGuestHistoryPage"));
const SigdstsCertificateVerifyPage = lazy(() => import("./pages/SigdstsCertificateVerifyPage"));
const AdminQuizAttemptsPage = lazy(() => import("./pages/admin/AdminQuizAttemptsPage"));

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
import { IACreatorAdminPage } from "./pages/admin/IACreatorAdminPage";
const SystemLogsPage = lazy(() => import("./pages/admin/SystemLogsPage"));
const AdminKnowledgeBasesPage = lazy(() => import("./pages/modules/AdminKnowledgeBasesPage").then(module => ({ default: module.AdminKnowledgeBasesPage })));
import { AdminRoute } from "./components/auth/AdminRoute";
import { PartnerRoute, AuthRoute } from "./components/auth/PartnerRoute";
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.ShortLinkRedirectPage })));
const WidgetPage = lazy(() => import("./pages/WidgetPage").then(module => ({ default: module.WidgetPage })));
const NotFound = lazy(() => import("./pages/NotFound"));

// WaouhApp — Mobile native shell (Capacitor)
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MobileErrorFallback } from "./app-mobile/components/MobileErrorFallback";
import { OfflineBanner } from "./components/OfflineBanner";
const MobileShell = lazy(() => import("./app-mobile/layouts/MobileShell"));
const MobileWaouhChat = lazy(() => import("./app-mobile/screens/WaouhChatScreen"));
const MobileConversations = lazy(() => import("./app-mobile/screens/ChatListScreen"));
const MobileChatThread = lazy(() => import("./app-mobile/screens/ChatScreen"));
const MobileBots = lazy(() => import("./app-mobile/screens/bots/AiAgentsListScreen"));
const MobileCreateBot = lazy(() => import("./app-mobile/screens/bots/KnowledgeBaseCreateWizard"));
const MobileBotDetail = lazy(() => import("./app-mobile/screens/bots/KnowledgeBaseDetailScreen"));
const MobileBotEntryForm = lazy(() => import("./app-mobile/screens/bots/NativeEntryFormScreen"));
const MobileWhatsApp = lazy(() => import("./app-mobile/screens/WhatsAppScreen"));
const MobileDiffusion = lazy(() => import("./app-mobile/screens/DiffusionScreen"));
const MobilePartner = lazy(() => import("./app-mobile/screens/partner/PartnerHomeScreen"));
const MobilePartnerBusinesses = lazy(() => import("./app-mobile/screens/partner/PartnerBusinessesScreen"));
const MobilePartnerProducts = lazy(() => import("./app-mobile/screens/partner/PartnerProductsScreen"));
const MobilePartnerSales = lazy(() => import("./app-mobile/screens/partner/PartnerSalesScreen"));
const MobilePartnerPayouts = lazy(() => import("./app-mobile/screens/partner/PartnerPayoutsScreen"));
const MobilePartnerPayments = lazy(() => import("./app-mobile/screens/partner/PartnerPaymentsScreen"));
const MobileAuthHome = lazy(() => import("./app-mobile/screens/auth/AuthHomeScreen"));
const MobileAuthEmail = lazy(() => import("./app-mobile/screens/auth/EmailAuthScreen"));
const MobileAuthOtp = lazy(() => import("./app-mobile/screens/auth/WhatsAppOtpScreen"));
const MobileProfile = lazy(() => import("./app-mobile/screens/ProfileScreen"));
const MobileNotifications = lazy(() => import("./app-mobile/screens/NotificationsScreen"));
const RequireMobileAuth = lazy(() => import("./app-mobile/guards/RequireMobileAuth"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const AppContent = () => {
  useActivityTracking();
  
  return (
    <Suspense fallback={<DeferredRouteFallback />}>
      <OfflineBanner />
      <Routes>
                  {/* Routes avec layout principal */}
                  <Route element={<MainLayout />}>
                    {/* Route d'accueil */}
                    <Route path="/" element={<Navigate to="/app/chat" replace />} />
                    <Route path="/legacy" element={<Index />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/chat" element={<KpakpatoPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    
                    {/* Gestion des bots */}
                    <Route path="/bots" element={<BotManagementPage />} />
                    
                    {/* Campagnes de partage */}
                    <Route path="/social-campaigns" element={<SocialSharingCampaignsPage />} />
                    
                    {/* WhatsApp Connect */}
                    <Route path="/whatsapp-connect" element={<WhatsAppConnectPage />} />
                    <Route path="/whatsapp-diffusion" element={<WhatsAppDiffusionPage />} />
                    
                    {/* SEO Pages */}
                    <Route path="/features" element={<FeaturesPage />} />
                    <Route path="/recette" element={<RecettePage />} />
                    <Route path="/app/recette" element={<RecettePage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/payment-history" element={<PaymentHistoryPage />} />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogPostPage />} />
                    <Route path="/testimonials" element={<TestimonialsPage />} />
                    <Route path="/use-case/ecommerce" element={<UseCaseEcommercePage />} />
                    <Route path="/use-case/support" element={<UseCaseSupportPage />} />
                    
                    {/* Modules IA */}
                    <Route path="/modules/business" element={<BusinessModule />} />
                    <Route path="/knowledge-bases" element={<KnowledgeBasesPage />} />
                    <Route path="/modules/visual-creator" element={<VisualCreatorModule />} />
                    <Route path="/visual-gallery" element={<VisualGalleryPage />} />
                    
                    {/* Marketing */}
                    <Route path="/marketing-gallery" element={<MarketingGallery />} />
                    <Route path="/video-production" element={<VideoProductionPage />} />
                    <Route path="/video-production/calendar" element={<VideoProductionCalendar />} />
                    <Route path="/video-production/generate" element={<VideoGenerationPage />} />
          <Route path="/video-library" element={<VideoLibraryPage />} />
          <Route path="/promotional-text/:videoId" element={<PromotionalTextGeneratorPage />} />
          <Route path="/video-assets" element={<VideoAssetsPage />} />
                    
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
          <Route path="/admin/ia-creator" element={<AdminRoute><IACreatorAdminPage /></AdminRoute>} />
          <Route path="/admin/knowledge-bases" element={<AdminRoute><AdminKnowledgeBasesPage /></AdminRoute>} />
          <Route path="/admin/notification-test" element={<AdminRoute><NotificationTestPage /></AdminRoute>} />
          <Route path="/admin/payment-tests" element={<AdminRoute><PaymentTestPage /></AdminRoute>} />
                    
                     {/* CRM & Prospects */}
                     <Route path="/prospects" element={<ProspectsLayout />} />
                     <Route path="/ia-prospect-precall" element={<IAProspectPreCallPage />} />
                     <Route path="/prospect-preparation" element={<ProspectPreparationPage />} />
                     <Route path="/evaluation-results" element={<EvaluationResultsPage />} />
                     <Route path="/admin/waouh" element={<AdminRoute><WaouhPage /></AdminRoute>} />
                     <Route path="/waouh" element={<Navigate to="/admin/waouh" replace />} />
                     <Route path="/admin/waouh/demo" element={<AdminRoute><WaouhDemoPage /></AdminRoute>} />
                     <Route path="/waouh/demo" element={<Navigate to="/admin/waouh/demo" replace />} />
                     <Route path="/admin/waouh/radar" element={<AdminRoute><WaouhRadarPage /></AdminRoute>} />
                     <Route path="/admin/waouh/whatsapp-ops" element={<AdminRoute><WaouhWhatsAppOpsPage /></AdminRoute>} />
                     <Route path="/admin/waouh/diffusion-approvals" element={<AdminRoute><AdminDiffusionApprovalsPage /></AdminRoute>} />
                     <Route path="/admin/waouh/partners" element={<AdminRoute><AdminWaouhPartnersPage /></AdminRoute>} />
                     <Route path="/admin/waouh/data-control" element={<AdminRoute><AdminWaouhDataControlPage /></AdminRoute>} />
                     <Route path="/admin/waouh/monitoring" element={<AdminRoute><AdminWaouhMonitoringPage /></AdminRoute>} />
                     <Route path="/admin/waouh/businesses" element={<AdminRoute><AdminWaouhBusinessesPage /></AdminRoute>} />
                     <Route path="/admin/waouh/deals" element={<AdminRoute><AdminWaouhDealsPage /></AdminRoute>} />
                    <Route path="/admin/waouh/historique" element={<AdminRoute><AdminWaouhHistoriquePage /></AdminRoute>} />
                    <Route path="/admin/waouh/health-check" element={<AdminRoute><AdminWaouhHealthCheckPage /></AdminRoute>} />
                     <Route path="/partner" element={<AuthRoute><PartnerDashboardPage /></AuthRoute>} />
                     <Route path="/partner/businesses" element={<PartnerRoute><PartnerBusinessesPage /></PartnerRoute>} />
                     <Route path="/partner/b/:code/produits" element={<PartnerRoute><PartnerProductsPage /></PartnerRoute>} />
                     <Route path="/partner/businesses/:businessId/products" element={<PartnerRoute><PartnerProductsPage /></PartnerRoute>} />
                     <Route path="/partner/sales" element={<PartnerRoute><PartnerSalesPage /></PartnerRoute>} />
                     <Route path="/partner/payouts" element={<PartnerRoute><PartnerPayoutsPage /></PartnerRoute>} />
                  </Route>
                  
                  {/* Routes publiques sans layout */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/widget" element={<WidgetPage />} />
                  <Route path="/s/:shortCode" element={<ShortLinkRedirectPage />} />
                  <Route path="/bot-test/:botId" element={<BotTestPage />} />
                  <Route path="/bot/:botId" element={<PublicBotChatPage />} />
                  <Route path="/documentation" element={<DocumentationPortalPage />} />
                  <Route path="/yovo-gallery" element={<YovoGallery />} />
                  <Route path="/waouh-chat" element={<Navigate to="/app/chat" replace />} />

                  {/* WaouhApp — Mobile shell (Capacitor + web preview) */}
                  <Route path="/app/auth" element={<MobileAuthHome />} />
                  <Route path="/app/auth/email" element={<MobileAuthEmail />} />
                  <Route path="/app/auth/whatsapp" element={<MobileAuthOtp />} />
                  <Route path="/app" element={<ErrorBoundary fallback={<MobileErrorFallback />}><MobileShell /></ErrorBoundary>}>
                    <Route index element={<Navigate to="/app/chat" replace />} />
                    <Route path="chat" element={<MobileConversations />} />
                    <Route path="chat/waouh" element={<MobileWaouhChat />} />
                    <Route path="conversations" element={<Navigate to="/app/chat" replace />} />
                  </Route>
                  <Route path="/app" element={<RequireMobileAuth><ErrorBoundary fallback={<MobileErrorFallback />}><MobileShell /></ErrorBoundary></RequireMobileAuth>}>
                    <Route path="chat/:id" element={<MobileChatThread />} />
                    <Route path="bots" element={<MobileBots />} />
                    <Route path="bots/new" element={<MobileCreateBot />} />
                    <Route path="bots/:id" element={<MobileBotDetail />} />
                    <Route path="bots/:id/table/:tableId/entry/:index" element={<MobileBotEntryForm />} />
                    <Route path="whatsapp" element={<MobileWhatsApp />} />
                    <Route path="diffusion" element={<MobileDiffusion />} />
                    <Route path="partner" element={<MobilePartner />} />
                    <Route path="partner/businesses" element={<MobilePartnerBusinesses />} />
                    <Route path="partner/businesses/:businessId/products" element={<MobilePartnerProducts />} />
                    <Route path="partner/b/:code/produits" element={<MobilePartnerProducts />} />
                    <Route path="partner/sales" element={<MobilePartnerSales />} />
                    <Route path="partner/payouts" element={<MobilePartnerPayouts />} />
                    <Route path="partner/payments" element={<MobilePartnerPayments />} />
                    <Route path="profile" element={<MobileProfile />} />
                    <Route path="notifications" element={<MobileNotifications />} />
                  </Route>

                  {/* Module Support Technique SIGDSTS — ISOLÉ, sans sidebar/header */}
                  <Route path="/sigdsts" element={<SupportTechniquePage />} />
                  <Route path="/sigdsts/guide" element={<SupportGuidePage />} />
                  <Route path="/sigdsts/tickets" element={<SupportTicketsPage />} />
                  <Route path="/sigdsts/tickets/:id" element={<SupportTicketDetailPage />} />
                  {/* Ticket Express : parcours public sans inscription */}
                  <Route path="/sigdsts/ticket-express" element={<SupportTicketExpressPage />} />
                  <Route path="/sigdsts/t/:token" element={<SupportGuestTicketPage />} />
                  {/* Quiz formation SIGDSTS — public, sans inscription */}
                  <Route path="/sigdsts/quiz" element={<SigdstsQuizIndexPage />} />
                  <Route path="/sigdsts/quiz/:moduleId" element={<SigdstsQuizPlayerPage />} />
                  <Route path="/sigdsts/quiz/:moduleId/result" element={<SigdstsQuizResultPage />} />
                  <Route path="/sigdsts/quiz/suivi/:token" element={<SigdstsQuizGuestHistoryPage />} />
                  <Route path="/sigdsts/quiz/verify" element={<SigdstsCertificateVerifyPage />} />
                  <Route path="/sigdsts/quiz/verify/:code" element={<SigdstsCertificateVerifyPage />} />
                  <Route path="/sigdsts/admin" element={<AdminRoute><SupportAdminDashboardPage /></AdminRoute>} />
                  <Route path="/sigdsts/admin/tickets" element={<AdminRoute><SupportAdminTicketsPage /></AdminRoute>} />
                  <Route path="/sigdsts/admin/quiz" element={<AdminRoute><AdminQuizAttemptsPage /></AdminRoute>} />
                  <Route path="/sigdsts/admin/knowledge" element={<AdminRoute><SupportKnowledgePage /></AdminRoute>} />

                  {/* Route 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
  );
};

const App = () => {
  // Initialisation différée pour ne pas bloquer le premier paint
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const run = () => {
      registerServiceWorker();
      initPerformanceMonitoring();
    };
    if (ric) ric(run, { timeout: 3000 });
    else setTimeout(run, 1500);
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
