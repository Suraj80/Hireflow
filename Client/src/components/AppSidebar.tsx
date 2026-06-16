import {
  LayoutDashboard,
  Briefcase,
  Users,
  GitBranch,
  CalendarDays,
  CircleDollarSign,
  BarChart3,
  Settings,
  FileText,
  LogOut,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/AuthProvider";
import { settingsApi } from "@/features/settings/api";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Jobs", url: "/jobs", icon: Briefcase },
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: GitBranch },
  { title: "Interviews", url: "/interviews", icon: CalendarDays },
  { title: "Offers", url: "/offers", icon: CircleDollarSign },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const adminItems = [
  { title: "Users", url: "/users", icon: Users },
  { title: "Audit Log", url: "/audit-log", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const [workspaceName, setWorkspaceName] = useState("HireFlow");
  const [workspaceLogo, setWorkspaceLogo] = useState("");
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const visibleMainItems = mainItems.filter(
    (item) =>
      (item.title !== "Analytics" && item.title !== "Offers") ||
      user?.role === "admin" ||
      user?.role === "recruiter"
  );

  useEffect(() => {
    const loadWorkspaceName = async () => {
      try {
        const settings = await settingsApi.getWorkspace();
        setWorkspaceName(settings.workspaceName?.trim() || "HireFlow");
        setWorkspaceLogo(settings.brandingLogo?.trim() || "");
      } catch (_error) {
        setWorkspaceName("HireFlow");
        setWorkspaceLogo("");
      }
    };

    void loadWorkspaceName();
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          {workspaceLogo ? (
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
              <img src={workspaceLogo} alt={`${workspaceName} logo`} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-foreground">{workspaceName}</span>
          )}
        </NavLink>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="mt-auto p-4 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void logout()}
              className="justify-start rounded-xl text-destructive hover:text-destructive"
              tooltip="Logout"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
