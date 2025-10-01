import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    if (isValid) {
      return `${displayName} Dashboard`;
    }
    // For clients on Central HQ page, show their business name if available
    if (isOnCentralHQ && profile?.business_name) {
      return `${profile.business_name} Dashboard`;
    }
    return 'Central HQ';
  };
  
  const headerTitle = getHeaderTitle();

  // Set browser tab title based on the same logic as header title
  const getBrowserTitle = () => {
    // Wait for client data to load before setting dynamic title
    if (clientLoading) {
      return 'Klariqo - AI Phone Agent';
    }

    if (isValid && displayName) {
      return `${displayName} AI Dashboard`;
    }
    // For clients on Central HQ page, show their business name if available
    if (isOnCentralHQ && profile?.business_name) {
      return `${profile.business_name} AI Dashboard`;
    }
    return 'Klariqo - AI Phone Agent';
  };

  const browserTitle = getBrowserTitle();
  usePageTitle(browserTitle);

  // Don't show sidebar on Central HQ page
  if (isOnCentralHQ) {
    return (
      <div className="min-h-screen bg-background font-manrope">
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{headerTitle}</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {profile && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{profile.full_name || profile.email}</span>
                <Badge variant="secondary" className="text-xs">
                  {profile.role === 'team_member' ? 'Team' : profile.role}
                </Badge>
              </div>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    );
  }

  // Show sidebar layout for tenant pages
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full font-manrope">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <div className="flex flex-col">
                <h1 className="text-xl font-semibold">{headerTitle}</h1>
                {isValid && (
                  <span className="text-xs text-muted-foreground">
                    {region.toUpperCase()} • {industry.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {profile && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">{profile.full_name || profile.email}</span>
                  <Badge variant="secondary" className="text-xs">
                    {profile.role === 'team_member' ? 'Team' : profile.role}
                  </Badge>
                </div>
              )}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="h-8 w-8 p-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}