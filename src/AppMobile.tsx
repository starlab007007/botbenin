import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { MobileErrorFallback } from './app-mobile/components/MobileErrorFallback';

const MobileShell = lazy(() => import('./app-mobile/layouts/MobileShell'));
const MobileWaouhChat = lazy(() => import('./app-mobile/screens/WaouhChatScreen'));
const MobileConversations = lazy(() => import('./app-mobile/screens/ChatListScreen'));
const MobileChatThread = lazy(() => import('./app-mobile/screens/ChatScreen'));
const MobileBots = lazy(() => import('./app-mobile/screens/bots/KnowledgeBasesListScreen'));
const MobileCreateBot = lazy(() => import('./app-mobile/screens/bots/KnowledgeBaseCreateWizard'));
const MobileBotDetail = lazy(() => import('./app-mobile/screens/bots/KnowledgeBaseDetailScreen'));
const MobileBotEntryForm = lazy(() => import('./app-mobile/screens/bots/NativeEntryFormScreen'));
const MobileWhatsApp = lazy(() => import('./app-mobile/screens/WhatsAppScreen'));
const MobileDiffusion = lazy(() => import('./app-mobile/screens/DiffusionScreen'));
const MobilePartner = lazy(() => import('./app-mobile/screens/partner/PartnerHomeScreen'));
const MobilePartnerBusinesses = lazy(() => import('./app-mobile/screens/partner/PartnerBusinessesScreen'));
const MobilePartnerProducts = lazy(() => import('./app-mobile/screens/partner/PartnerProductsScreen'));
const MobilePartnerSales = lazy(() => import('./app-mobile/screens/partner/PartnerSalesScreen'));
const MobilePartnerPayouts = lazy(() => import('./app-mobile/screens/partner/PartnerPayoutsScreen'));
const MobilePartnerPayments = lazy(() => import('./app-mobile/screens/partner/PartnerPaymentsScreen'));
const MobileAuthHome = lazy(() => import('./app-mobile/screens/auth/AuthHomeScreen'));
const MobileAuthEmail = lazy(() => import('./app-mobile/screens/auth/EmailAuthScreen'));
const MobileAuthOtp = lazy(() => import('./app-mobile/screens/auth/WhatsAppOtpScreen'));
const MobileProfile = lazy(() => import('./app-mobile/screens/ProfileScreen'));
const MobileNotifications = lazy(() => import('./app-mobile/screens/NotificationsScreen'));
const RequireMobileAuth = lazy(() => import('./app-mobile/guards/RequireMobileAuth'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const Fallback = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-background">
    <LoadingSpinner />
  </div>
);

const AppMobile = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <LanguageProvider>
        <AuthProvider>
          <UserProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<Fallback />}>
                  <Routes>
                    <Route path="/app/auth" element={<MobileAuthHome />} />
                    <Route path="/app/auth/email" element={<MobileAuthEmail />} />
                    <Route path="/app/auth/whatsapp" element={<MobileAuthOtp />} />
                    <Route
                      path="/app"
                      element={
                        <RequireMobileAuth>
                          <ErrorBoundary fallback={<MobileErrorFallback />}>
                            <MobileShell />
                          </ErrorBoundary>
                        </RequireMobileAuth>
                      }
                    >
                      <Route index element={<Navigate to="/app/chat" replace />} />
                      <Route path="chat" element={<MobileConversations />} />
                      <Route path="chat/waouh" element={<MobileWaouhChat />} />
                      <Route path="conversations" element={<Navigate to="/app/chat" replace />} />
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
                    </Route>
                    <Route path="*" element={<Navigate to="/app/chat" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </UserProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default AppMobile;
