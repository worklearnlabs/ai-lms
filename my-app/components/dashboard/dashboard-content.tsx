import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, BookOpen, Calendar, Plus, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KpiCard } from "./kpi-card"
import { BlueprintsSection } from "./blueprints-section"
import { CoursesSection } from "./courses-section"
import { EventsSection } from "./events-section"

// Types for our data
interface DashboardData {
  kpis: {
    blueprints: {
      count: number
      description: string
    }
    courses: {
      count: number
      description: string
    }
    events: {
      count: number
      description: string
    }
  }
  blueprints: Array<{
    id: string
    title: string
    stepsCount: number
    details: string
    isVerified: boolean
    cloneCount?: number
    lastUpdated: string
  }>
  courses: Array<{
    id: string
    name: string
    progress: number
    level: string
    modules: number
  }>
  events: Array<{
    id: string
    name: string
    date: {
      month: string
      day: string
    }
    location: string
    time: string
  }>
}

interface DashboardContentProps {
  data: DashboardData
}

export function DashboardContent({ data }: DashboardContentProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <KpiCard 
          title="Blueprints" 
          value={data.kpis.blueprints.count} 
          description={data.kpis.blueprints.description} 
          icon={Code} 
        />
        <KpiCard 
          title="Courses" 
          value={data.kpis.courses.count} 
          description={data.kpis.courses.description} 
          icon={BookOpen} 
        />
        <KpiCard 
          title="Events" 
          value={data.kpis.events.count} 
          description={data.kpis.events.description} 
          icon={Calendar} 
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 grid md:grid-cols-3 gap-4 md:min-h-min">
        {/* Blueprints Section (2 columns) */}
        <Card className="md:col-span-2 rounded-xl">
          <CardHeader className="px-4 py-4 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle>Blueprints</CardTitle>
              <CardDescription>
                Your AI workflows and blueprints
              </CardDescription>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> Create Blueprint
            </Button>
          </CardHeader>
          <CardContent className="p-4 max-h-[60vh] overflow-y-auto">
            <BlueprintsSection blueprints={data.blueprints} />
          </CardContent>
        </Card>

        {/* Courses and Events Section (1 column with tabs) */}
        <Card className="rounded-xl">
          <CardHeader className="px-4 py-4 border-b">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your courses and upcoming events
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 max-h-[60vh] overflow-y-auto">
            <Tabs defaultValue="courses" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="courses">Courses ({data.courses.length})</TabsTrigger>
                <TabsTrigger value="events">Events ({data.events.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="courses" className="space-y-4">
                <CoursesSection courses={data.courses} />
                <Button variant="link" className="px-0 flex items-center text-sm font-medium">
                  Browse all courses <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </TabsContent>
              <TabsContent value="events" className="space-y-4">
                <EventsSection events={data.events} />
                <Button variant="link" className="px-0 flex items-center text-sm font-medium">
                  Explore all events <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 