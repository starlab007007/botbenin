
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

// Lazy loading optimisé avec syntaxe correcte pour les exports
const HomePage = lazy(() => import("./pages/HomePage").then(module => ({ default: module.default })));
const ChatPage = lazy(() => import("./pages/ChatPage").then(module => ({ default: module.ChatPage })));
const ShortLinkRedirectPage = lazy(() => import("./pages/ShortLinkRedirectPage").then(module => ({ default: module.ShortLinkRedirectPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then(module => ({ default: module.DashboardPage })));
const BotManagementPage = lazy(() => import("./pages/BotManagementPage").then(module => ({ default: module.BotManagementPage })));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage").then(module => ({ default: module.default })));
const ProspectsPage = lazy(() => import("./pages/ProspectsPage").then(module => ({ default: module.ProspectsPage })));
const SupportPage = lazy(() => import("./pages/SupportPage").then(module => ({ default: module.default })));
const AccountPage = lazy(() => import("./pages/AccountPage").then(module => ({ default: module.default })));
const UsersManagementPage = lazy(() => import("./pages/UsersManagementPage").then(module => ({ default: module.UsersManagementPage })));
const NotFound = lazy(() => import("./pages/NotFound"));
const BotTestPage = lazy(() => import("./pages/BotTestPage").then(module => ({ default: module.default })));
const PublicBotChatPage = lazy(() => import("./pages/PublicBotChatPage").then(module => ({ default: module.default })));

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
              <Routes>
                {/* Route d'accueil sans layout */}
                <Route path="/" element={<Index />} />
                
                {/* Toutes les autres routes avec layout */}
                <Route element={<Layout />}>
                  <Route path="/home" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <HomePage />
                    </Suspense>
                  } />
                  <Route path="/chat" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <ChatPage />
                    </Suspense>
                  } />
                  <Route path="/s/:shortCode" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <ShortLinkRedirectPage />
                    </Suspense>
                  } />
                  <Route path="/dashboard" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <DashboardPage />
                    </Suspense>
                  } />
                  <Route path="/bots" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <BotManagementPage />
                    </Suspense>
                  } />
                  <Route path="/automations" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <AutomationsPage />
                    </Suspense>
                  } />
                  <Route path="/prospects" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <ProspectsPage />
                    </Suspense>
                  } />
                  <Route path="/support" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <SupportPage />
                    </Suspense>
                  } />
                  <Route path="/account" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <AccountPage />
                    </Suspense>
                  } />
                  <Route path="/users" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <UsersManagementPage />
                    </Suspense>
                  } />
                  <Route path="/bot-test/:botId" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <BotTestPage />
                    </Suspense>
                  } />
                  <Route path="/bot/:botId" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <PublicBotChatPage />
                    </Suspense>
                  } />
                  
                  {/* Modules IA */}
                  <Route path="/business" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <BusinessModule />
                    </Suspense>
                  } />
                  <Route path="/marketing" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <MarketingModule />
                    </Suspense>
                  } />
                  <Route path="/gestion" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <GestionModule />
                    </Suspense>
                  } />
                  <Route path="/citoyen" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <CitoyenModule />
                    </Suspense>
                  } />
                  
                  <Route path="*" element={
                    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div></div>}>
                      <NotFound />
                    </Suspense>
                  } />
                </Route>
              </Routes>
            </UserProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
