import { AppSidebar } from "@/components/app-sidebar"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>
          </div>
          <Tabs defaultValue="profile" className="px-4 sm:px-6 lg:px-8">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="profile" asChild>
                <Link href="/settings/profile">Profile</Link>
              </TabsTrigger>
              <TabsTrigger value="team" asChild>
                <Link href="/settings/team">Team</Link>
              </TabsTrigger>
              <TabsTrigger value="billing" asChild>
                <Link href="/settings/billing">Billing</Link>
              </TabsTrigger>
              <TabsTrigger value="limits" asChild>
                <Link href="/settings/limits">Limits</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
} 