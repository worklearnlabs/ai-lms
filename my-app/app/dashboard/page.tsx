"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { mockDashboardData } from "@/lib/dashboard/mock-data"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <PageBreadcrumb />
          </div>
          <div>
            <ThemeToggle />
          </div>
        </header>
        <DashboardContent data={mockDashboardData} />
      </SidebarInset>
    </SidebarProvider>
  )
}
