"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileCode, PartyPopper, Plus } from "lucide-react"

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in the useEffect
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm mr-2">Welcome, {user.name}</span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/* KPI Cards */}
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Blueprints</CardTitle>
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Step-by-step AI guides
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Interactive learning paths
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Events</CardTitle>
                <PartyPopper className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Upcoming community events
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="blueprints" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="blueprints">Blueprints</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>
            
            {/* Blueprints Tab */}
            <TabsContent value="blueprints" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No Blueprints Yet</CardTitle>
                  <CardDescription className="mb-6 max-w-md">
                    Blueprints are step-by-step guides generated by AI to help you accomplish specific tasks. 
                    Create your first blueprint to get started.
                  </CardDescription>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Create Blueprint
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Courses Tab */}
            <TabsContent value="courses" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No Courses Yet</CardTitle>
                  <CardDescription className="mb-6 max-w-md">
                    Courses are comprehensive learning paths designed to build your skills from beginner to expert.
                    Create your first course to start teaching.
                  </CardDescription>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Create Course
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Events Tab */}
            <TabsContent value="events" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <PartyPopper className="h-12 w-12 text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No Events Scheduled</CardTitle>
                  <CardDescription className="mb-6 max-w-md">
                    Events bring the community together for learning, networking, and collaboration.
                    Schedule your first event to engage with your audience.
                  </CardDescription>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" /> Create Event
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
