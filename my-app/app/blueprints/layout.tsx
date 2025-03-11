"use client"

import { AppSidebar } from "@/components/layouts/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { PageBreadcrumb } from "@/components/layouts/page-breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/utils/auth"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function BlueprintsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useAuth()

  const handleLogout = async () => {
    console.log("Blueprints layout: Logout button clicked")
    try {
      await signOut()
      console.log("Blueprints layout: Logout successful - you should be redirected to login page")
      // Force redirect to login page in case the signOut function didn't do it
      window.location.href = '/login'
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

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
          <div className="flex items-center gap-2">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-1"
            >
              <LogOut size={16} />
              <span>Log out</span>
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="h-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 