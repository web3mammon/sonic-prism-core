import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { BusinessProvider } from "@/lib/theme";
import { AuthProvider } from "@/hooks/useAuth";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRedirect } from "@/components/RoleBasedRedirect";
import { DashboardLayout } from "./components/DashboardLayout";
import { PageViewTracker } from "@/components/PageViewTracker";
import MarketingHome from "./pages/MarketingHome";
import Pricing from "./pages/Pricing";
import CentralHQ from "./pages/CentralHQ";
import TenantDashboard from "./pages/TenantDashboard";
import Testing from "./pages/Testing";
import CallData from "./pages/CallData";
import ChatData from "./pages/ChatData";
import WidgetSettings from "./pages/WidgetSettings";
import AudioFiles from "./pages/AudioFiles";
import Analytics from "./pages/Analytics";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import Logs from "./pages/Logs";
import System from "./pages/System";
import BusinessDetails from "./pages/BusinessDetails";
import Integrations from "./pages/Integrations";
import Billing from "./pages/Billing";
// import BillingPayment from "./pages/BillingPayment"; // Removed: Payment now handled directly on /billing page
import Leads from "./pages/Leads";
import Calendar from "./pages/Calendar";
import ContactUs from "./pages/ContactUs";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import BusinessSetup from "./pages/BusinessSetup";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import AuthCallback from "./pages/AuthCallback";
import AuthVerify from "./pages/AuthVerify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BusinessProvider>
        <AuthProvider>
          <OnboardingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <PageViewTracker />
                <Routes>
                  {/* Public routes */}
                  <Route path="/marketing" element={<MarketingHome />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth" element={<Auth />} /> {/* Legacy - redirects handled in Auth.tsx */}
                  <Route path="/auth/callback" element={<AuthCallback />} /> {/* Email verification callback */}
                  <Route path="/auth/verify" element={<AuthVerify />} /> {/* Custom email verification with branding */}
                  <Route path="/business-setup" element={<BusinessSetup />} /> {/* Legacy - kept for existing users */}
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Onboarding route - single page with step transitions */}
                  <Route path="/onboarding" element={<Onboarding />} />
                
                {/* Protected routes */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <RoleBasedRedirect>
                      <DashboardLayout>
                        <Routes>
                          {/* Central HQ - Root path for internal users only */}
                          <Route path="/" element={<CentralHQ />} />
                          
                          {/* Legacy routes - only accessible from Central HQ context */}
                          <Route path="/testing" element={<Testing />} />
                          <Route path="/call-data" element={<CallData />} />
                          <Route path="/audio-files" element={<AudioFiles />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/analytics/advanced" element={<AdvancedAnalytics />} />
                          <Route path="/logs" element={<Logs />} />
                          <Route path="/system" element={<System />} />
                          
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </DashboardLayout>
                    </RoleBasedRedirect>
                  </ProtectedRoute>
                } />
                
                {/* Tenant-specific routes: /:region/:industry/:clientname */}
                <Route path="/:region/:industry/:clientname/*" element={
                  <ProtectedRoute>
                    <RoleBasedRedirect>
                      <DashboardLayout>
                        <Routes>
                          <Route path="/" element={<TenantDashboard />} />
                          <Route path="/business-details" element={<BusinessDetails />} />
                          <Route path="/integrations" element={<Integrations />} />
                          <Route path="/billing" element={<Billing />} />
                          {/* <Route path="/billing/payment" element={<BillingPayment />} /> */}
                          <Route path="/calendar" element={<Calendar />} />
                          <Route path="/leads" element={<Leads />} />
                          <Route path="/contact" element={<ContactUs />} />
                          <Route path="/testing" element={<Testing />} />
                          <Route path="/call-data" element={<CallData />} />
                          <Route path="/chat-data" element={<ChatData />} />
                          <Route path="/widget-settings" element={<WidgetSettings />} />
                          <Route path="/audio-files" element={<AudioFiles />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/analytics/advanced" element={<AdvancedAnalytics />} />
                          <Route path="/logs" element={<Logs />} />
                          <Route path="/system" element={<System />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </DashboardLayout>
                    </RoleBasedRedirect>
                  </ProtectedRoute>
                } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </OnboardingProvider>
      </AuthProvider>
    </BusinessProvider>
  </ThemeProvider>
</QueryClientProvider>
);

export default App;
