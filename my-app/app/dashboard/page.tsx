"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/layouts/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { PageBreadcrumb } from "@/components/layouts/page-breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { BlueprintModalProvider } from "@/app/blueprints/components/blueprint-modal-context"
import { getDashboardData, DashboardData } from "@/utils/dashboard/dashboard-service"
import { Skeleton } from "@/components/ui/skeleton"
import { createClientSupabase } from '@/utils/supabase'

export default function Page() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Debug authentication status
    const checkAuth = async () => {
      try {
        const supabase = createClientSupabase()
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error in dashboard:', error.message);
        } else if (data.user) {
          console.log('🔐 Dashboard Auth: Authenticated as ', data.user.id);
        } else {
          console.log('❌ Dashboard Auth: Not authenticated');
        }
      } catch (e) {
        console.error('Exception checking auth:', e);
      }
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        const data = await getDashboardData()
        setDashboardData(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("Failed to load dashboard data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <BlueprintModalProvider>
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
          
          {loading ? (
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
              <div className="flex-1 grid md:grid-cols-3 gap-4">
                <Skeleton className="md:col-span-2 h-[60vh]" />
                <Skeleton className="h-[60vh]" />
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-red-500">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : dashboardData && (
            <DashboardContent data={dashboardData} />
          )}
        </SidebarInset>
      </SidebarProvider>
    </BlueprintModalProvider>
  )
}
