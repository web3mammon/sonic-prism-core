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
  MessageSquare,
  Users,
  Calendar,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useCurrentClient } from "@/hooks/useCurrentClient";
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
  const { client } = useCurrentClient();
  const location = useLocation();
  const { theme } = useTheme();
  const isCollapsed = state === "collapsed";

  // Determine if we're in a tenant context
  const isInTenantContext = isValid && region && industry && clientName;
  const basePath = isInTenantContext ? `/${region}/${industry}/${clientName}` : '';
  const isOnCentralHQ = location.pathname === '/' && !isInTenantContext;

  // Get channel type - defaults to 'phone' if not set
  const channelType = client?.channel_type || 'phone';

  const navigationItems = [
    // For Central HQ - only show when actually on Central HQ
    ...(isOnCentralHQ ? [
      { title: "Central HQ", url: "/", icon: Home }
    ] : isInTenantContext ? [
      // Universal pages - always show
      {
        title: "Dashboard",
        url: basePath,
        icon: Home
      },
      { title: "Business Details", url: `${basePath}/business-details`, icon: Building2 },

      // Phone-specific pages (show for 'phone' or 'both')
      ...(channelType === 'phone' || channelType === 'both' ? [
        { title: "Testing", url: `${basePath}/testing`, icon: TestTube },
        { title: "Call Data", url: `${basePath}/call-data`, icon: Database },
      ] : []),

      // Website-specific pages (show for 'website' or 'both')
      ...(channelType === 'website' || channelType === 'both' ? [
        { title: "Widget Settings", url: `${basePath}/widget-settings`, icon: Settings },
        { title: "Chat Data", url: `${basePath}/chat-data`, icon: MessageSquare },
      ] : []),

      // Logs page with dynamic label
      {
        title: channelType === 'both' ? "Conversation Logs" :
               channelType === 'phone' ? "Call Logs" : "Chat Logs",
        url: `${basePath}/logs`,
        icon: ScrollText
      },

      // Universal pages - always show
      { title: "Analytics", url: `${basePath}/analytics`, icon: BarChart3 },
      { title: "Calendar", url: `${basePath}/calendar`, icon: Calendar },
      { title: "Leads", url: `${basePath}/leads`, icon: Users },
      { title: "Integrations", url: `${basePath}/integrations`, icon: Plug },
      { title: "Billing", url: `${basePath}/billing`, icon: CreditCard },
    ] : [])
  ];

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider font-medium px-4">
            {isValid ? `${region.toUpperCase()} - ${industry.toUpperCase()}` : 'Management'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {navigationItems.map((item) => {
                // For Dashboard, only match exact path. For other pages, allow subpaths
                const isActive = item.title === "Dashboard"
                  ? location.pathname === item.url
                  : location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url));

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={() => isActive
                          ? "relative flex items-center gap-2 px-3 py-2 rounded-md text-primary font-medium transition-all duration-200"
                          : "relative flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:text-primary transition-all duration-200"
                        }
                        style={isActive ? { color: 'hsl(var(--primary))' } : { color: 'hsl(var(--muted-foreground))' }}
                      >
                        <item.icon className="h-4 w-4" style={isActive ? { color: 'hsl(var(--primary))' } : { color: 'hsl(var(--muted-foreground))' }} />
                        {!isCollapsed && (
                          <span className="flex items-center gap-2 ml-1">
                            {item.title}
                            {item.badge && (
                              <Badge
                                variant="secondary"
                                className={`text-xs px-1.5 py-0.5 transition-colors ${
                                  isActive
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'bg-white/5 text-muted-foreground border-white/10'
                                }`}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </span>
                        )}
                        {/* Active indicator dot for collapsed state */}
                        {isCollapsed && isActive && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
