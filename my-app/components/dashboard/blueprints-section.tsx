import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import BlueprintCard from "./blueprint-card"

interface DashboardBlueprint {
  id: string
  title: string
  stepsCount: number
  details: string
  isVerified: boolean
  cloneCount?: number
  lastUpdated: string
}

interface BlueprintsSectionProps {
  blueprints: DashboardBlueprint[]
}

export function BlueprintsSection({ blueprints }: BlueprintsSectionProps) {
  return (
    <div className="space-y-4">
      {blueprints.length > 0 ? (
        blueprints.map((blueprint) => (
          <BlueprintCard
            key={blueprint.id}
            blueprint={{
              id: blueprint.id,
              title: blueprint.title,
              stepsCount: blueprint.stepsCount,
              details: blueprint.details,
              isVerified: blueprint.isVerified,
              cloneCount: blueprint.cloneCount,
              status: "completed",
              prompt: "",
              content: [],
              userId: "user-1",
              createdAt: new Date().toISOString(),
              updatedAt: blueprint.lastUpdated || new Date().toISOString(),
            }}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No blueprints found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first AI workflow blueprint to get started
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Create New Blueprint
          </Button>
        </div>
      )}
    </div>
  )
} 