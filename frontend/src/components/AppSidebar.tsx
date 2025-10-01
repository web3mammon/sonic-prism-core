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
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const { hasRole } = useAuth();
  const { region, industry, clientName, isValid } = useTenant();
  const location = useLocation();
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
      { title: "Audio Files", url: `${basePath}/audio-files`, icon: FileAudio },
      { title: "Analytics", url: `${basePath}/analytics`, icon: BarChart3 },
      { title: "Logs", url: `${basePath}/logs`, icon: ScrollText },
      { title: "System", url: `${basePath}/system`, icon: Settings },
    ] : [])
  ];

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wider">
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
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}