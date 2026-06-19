"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "#/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "#/components/ui/sidebar";
import {
  LayoutDashboard,
  Settings,
  FolderKanban,
  Plus,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const projects = useQuery(api.projects.list, isLoaded && isSignedIn ? {} : "skip");
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg"
          onClick={() => setOpenMobile(false)}
        >
          <FolderKanban className="h-5 w-5 text-primary" />
          RemindMe
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/" onClick={() => setOpenMobile(false)}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.map((project) => (
                <SidebarMenuItem key={project._id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/projects/${project._id}`}
                  >
                    <Link
                      href={`/projects/${project._id}`}
                      onClick={() => setOpenMobile(false)}
                    >
                      <span className="truncate">{project.repoName}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"}>
              <Link href="/settings" onClick={() => setOpenMobile(false)}>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2 px-2 mt-2">
          <UserButton />
          <span className="text-sm text-muted-foreground">Account</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
