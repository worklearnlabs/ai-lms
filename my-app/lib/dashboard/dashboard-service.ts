import { getBlueprints } from "../models/blueprint";
import { formatRelativeDate } from "../utils";

// Types for dashboard data
export interface DashboardData {
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

export async function getDashboardData(userId: string = "user-1"): Promise<DashboardData> {
  // Fetch blueprints from the database
  const blueprints = await getBlueprints(userId);
  
  // Format blueprints for dashboard display
  const formattedBlueprints = blueprints.map(blueprint => ({
    id: blueprint.id,
    title: blueprint.title,
    stepsCount: blueprint.stepsCount,
    details: blueprint.details,
    isVerified: blueprint.isVerified,
    cloneCount: blueprint.cloneCount,
    lastUpdated: formatRelativeDate(blueprint.updatedAt)
  }));
  
  // For now, we'll keep using mock data for courses and events
  // In a real application, you would fetch these from their respective APIs/databases
  
  return {
    kpis: {
      blueprints: {
        count: blueprints.length,
        description: "AI workflows and blueprints"
      },
      courses: {
        count: 12,
        description: "3 in progress, 9 completed"
      },
      events: {
        count: 5,
        description: "2 upcoming this week"
      }
    },
    blueprints: formattedBlueprints,
    courses: [
      {
        id: "1",
        name: "AI Prompt Engineering",
        progress: 65,
        level: "Advanced",
        modules: 8
      },
      {
        id: "2",
        name: "Machine Learning",
        progress: 42,
        level: "Intermediate",
        modules: 12
      }
    ],
    events: [
      {
        id: "1",
        name: "AI Ethics Summit",
        date: {
          month: "MAY",
          day: "15"
        },
        location: "Virtual",
        time: "10:00 AM EST"
      },
      {
        id: "2",
        name: "Prompt Engineering Workshop",
        date: {
          month: "MAY",
          day: "22"
        },
        location: "Virtual",
        time: "1:00 PM EST"
      }
    ]
  };
} 