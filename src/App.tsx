
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ChatPage } from "./pages/ChatPage";
import { AutomationsPage } from "./pages/AutomationsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BusinessModule } from "./pages/modules/BusinessModule";
import { MarketingModule } from "./pages/modules/MarketingModule";
import { GestionModule } from "./pages/modules/GestionModule";
import { CitoyenModule } from "./pages/modules/CitoyenModule";
import { AccountPage } from "./pages/AccountPage";
import { SupportPage } from "./pages/SupportPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="automatisations" element={<AutomationsPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="modules/business" element={<BusinessModule />} />
              <Route path="modules/marketing" element={<MarketingModule />} />
              <Route path="modules/gestion" element={<GestionModule />} />
              <Route path="modules/citoyen" element={<CitoyenModule />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
