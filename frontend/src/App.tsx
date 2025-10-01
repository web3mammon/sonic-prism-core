import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { BusinessProvider } from "@/lib/theme";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRedirect } from "@/components/RoleBasedRedirect";
import { DashboardLayout } from "./components/DashboardLayout";
import MarketingHome from "./pages/MarketingHome";
import Pricing from "./pages/Pricing";
import CentralHQ from "./pages/CentralHQ";
import TenantDashboard from "./pages/TenantDashboard";
import Testing from "./pages/Testing";
import CallData from "./pages/CallData";
import AudioFiles from "./pages/AudioFiles";
import Analytics from "./pages/Analytics";
import Logs from "./pages/Logs";
import System from "./pages/System";
import BusinessDetails from "./pages/BusinessDetails";
import Auth from "./pages/Auth";
import BusinessSetup from "./pages/BusinessSetup";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BusinessProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/marketing" element={<MarketingHome />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/business-setup" element={<BusinessSetup />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
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
                          <Route path="/testing" element={<Testing />} />
                          <Route path="/call-data" element={<CallData />} />
                          <Route path="/audio-files" element={<AudioFiles />} />
                          <Route path="/analytics" element={<Analytics />} />
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
        </AuthProvider>
      </BusinessProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
