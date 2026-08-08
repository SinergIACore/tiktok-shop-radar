import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  LayoutDashboard,
  Package,
  Clapperboard,
  LineChart,
  Library,
  Settings,
  Radar,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { appConfig } from "@/config/app";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { title: "Produtos", url: "/products", icon: Package, exact: false },
  { title: "Descoberta", url: "/discovery", icon: Compass, exact: false },
  { title: "Criativos", url: "/creatives", icon: Clapperboard, exact: false },
  { title: "Análises", url: "/analytics", icon: LineChart, exact: false },
  { title: "Biblioteca", url: "/library", icon: Library, exact: false },
  { title: "Configurações", url: "/settings", icon: Settings, exact: false },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (router) => router.location.pathname });

  const isActive = (url: string, exact: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(`${url}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Radar className="size-4" />
          </span>
          {!collapsed && (
            <span className="flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold">{appConfig.name}</span>
              <span className="text-[11px] text-muted-foreground">{appConfig.tagline}</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Inteligência</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
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
