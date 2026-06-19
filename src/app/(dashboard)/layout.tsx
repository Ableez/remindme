"use client";

import { AppSidebar } from "#/components/layout/sidebar";
import { Topbar } from "#/components/layout/topbar";
import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar";
import { CommandPalette } from "#/components/ui/command-palette";
import { PageTransition } from "#/components/ui/page-transition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Topbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
