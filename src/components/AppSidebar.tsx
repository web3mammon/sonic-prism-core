import {
  BarChart3,
  FileAudio,
  Home,
  Database,
  Activity,
  ScrollText,
  Settings,
  TestTube,
  Building2,
  Command,
  TrendingUp,
  Sparkles,
  Plug,
  CreditCard,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "next-themes";

export function AppSidebar() {
  const { state } = useSidebar();
  const { hasRole } = useAuth();
  const { region, industry, clientName, isValid } = useTenant();
  const location = useLocation();
  const { theme } = useTheme();
  const isCollapsed = state === "collapsed";

  // Determine if we're in a tenant context
  const isInTenantContext = isValid && region && industry && clientName;
  const basePath = isInTenantContext ? `/${region}/${industry}/${clientName}` : '';
  const isOnCentralHQ = location.pathname === '/' && !isInTenantContext;

  const navigationItems = [
    // For Central HQ - only show when actually on Central HQ
    ...(isOnCentralHQ ? [
      { title: "Central HQ", url: "/", icon: Home }
    ] : isInTenantContext ? [
      // For tenant routes - show client-specific navigation
      {
        title: "Dashboard",
        url: basePath,
        icon: Home
      },
      { title: "Business Details", url: `${basePath}/business-details`, icon: Building2 },
      { title: "Testing", url: `${basePath}/testing`, icon: TestTube },
      { title: "Call Data", url: `${basePath}/call-data`, icon: Database },
      { title: "Call Logs", url: `${basePath}/logs`, icon: ScrollText },
      { title: "Analytics", url: `${basePath}/analytics`, icon: BarChart3 },
      { title: "Integrations", url: `${basePath}/integrations`, icon: Plug },
      { title: "Billing", url: `${basePath}/billing`, icon: CreditCard },
      // TODO: Hidden until we convert .ulaw files to .mp3 for browser playback
      // { title: "Audio Files", url: `${basePath}/audio-files`, icon: FileAudio },
      // TODO: Hidden until we implement GPT-OSS (Groq) AI analysis for call quality scoring,
      // sentiment analysis, and actionable insights. Currently shows statistical analysis only.
      // Will add transcript analysis, call ratings, and improvement suggestions in V2.
      // { title: "Advanced Analytics", url: `${basePath}/analytics/advanced`, icon: TrendingUp, badge: "AI" },
      // TODO: Hidden - System monitoring page is not relevant for serverless architecture.
      // Clients don't need to see infrastructure metrics (CPU, memory, ports) since Supabase
      // manages all serverless resources. Consider implementing a simplified version in Central HQ
      // dashboard in V2 to show edge function health, integration status, and service quotas.
      // { title: "System", url: `${basePath}/system`, icon: Settings },
    ] : [])
  ];

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            {isValid ? `${region.toUpperCase()} - ${industry.toUpperCase()}` : 'Management'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={getNavClassName}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <span className="flex items-center gap-2">
                          {item.title}
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary">
                              {item.badge}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-6">
          {!isCollapsed && (
            <img
              src={theme === 'dark' ? '/assets/images/klariqo-logov1-white.png' : '/assets/images/klariqo-logov1.png'}
              alt="Klariqo"
              className="w-1/2 h-auto"
            />
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}