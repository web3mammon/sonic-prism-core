import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { useBusiness } from "@/lib/theme";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useCurrentClient } from "@/hooks/useCurrentClient";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { businessName } = useBusiness();
  const { profile, signOut } = useAuth();
  const { displayName, isValid, region, industry } = useTenant();
  const { client, loading: clientLoading } = useCurrentClient();
  const location = useLocation();
  const isOnCentralHQ = location.pathname === '/';

  // Determine the header title based on context
  const getHeaderTitle = () => {
    // Central HQ should always show "Central HQ"
    if (isOnCentralHQ) {
      return 'Central HQ';
    }
    if (isValid) {
      return `${displayName} Dashboard`;
    }
    return 'Central HQ';
  };

  const headerTitle = getHeaderTitle();

  // Set browser tab title based on the same logic as header title
  const getBrowserTitle = () => {
    // Central HQ should always show "Central HQ"
    if (isOnCentralHQ) {
      return 'Klariqo - Central HQ';
    }

    // Wait for client data to load before setting dynamic title
    if (clientLoading) {
      return 'Klariqo - AI Phone Agent';
    }

    if (isValid && displayName) {
      return `${displayName} AI Dashboard`;
    }
    return 'Klariqo - AI Phone Agent';
  };

  const browserTitle = getBrowserTitle();
  usePageTitle(browserTitle);

  // Get role badge color - red accent for active/important roles
  const getRoleBadgeClass = (role: string) => {
    if (role === 'admin') {
      return 'bg-primary/10 text-primary border-primary/30';
    }
    return 'bg-secondary text-secondary-foreground';
  };

  // Don't show sidebar on Central HQ page
  if (isOnCentralHQ) {
    return (
      <div className="min-h-screen font-manrope">
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 sticky top-0 z-50">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{headerTitle}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {profile && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors duration-200">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{profile.full_name || profile.email}</span>
                <Badge className={getRoleBadgeClass(profile.role)}>
                  {profile.role === 'team_member' ? 'Team' : profile.role}
                </Badge>
              </div>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  // Show sidebar layout for tenant pages
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full font-manrope">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6 sticky top-0 z-50">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="hover:bg-primary/10 hover:text-primary transition-all duration-200" />
            </div>

            <div className="flex items-center space-x-3">
              {profile && (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors duration-200">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{profile.full_name || profile.email}</span>
                  <Badge className={getRoleBadgeClass(profile.role)}>
                    {profile.role === 'team_member' ? 'Team' : profile.role}
                  </Badge>
                </div>
              )}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 group"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
