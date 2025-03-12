import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import BlueprintCard from "./blueprint-card"
import { ContentItem } from "@/app/blueprints/[id]/types"

// Define a simpler type that matches what we actually need
interface BlueprintCardData {
  id: string
  title: string
  stepsCount: number
  details: string
  isVerified: boolean
  cloneCount?: number
  updatedAt: string
  isTemporary?: boolean
  // Other props needed by Blueprint type
  prompt: string
  content: ContentItem[]
  userId: string
  createdAt: string
}

interface DashboardBlueprint {
  id: string
  title: string
  stepsCount: number
  details: string
  isVerified: boolean
  cloneCount?: number
  lastUpdated: string
  isTemporary?: boolean
}

interface BlueprintsSectionProps {
  blueprints: DashboardBlueprint[]
  onBlueprintClick?: (blueprintId: string, isTemporary: boolean) => void
}

export function BlueprintsSection({ blueprints, onBlueprintClick }: BlueprintsSectionProps) {
  return (
    <div className="space-y-4">
      {blueprints.length > 0 ? (
        blueprints.map((blueprint) => {
          // Convert from dashboard blueprint format to blueprint card format
          const cardData: BlueprintCardData = {
            id: blueprint.id,
            title: blueprint.title,
            stepsCount: blueprint.stepsCount,
            details: blueprint.details,
            isVerified: blueprint.isVerified,
            cloneCount: blueprint.cloneCount,
            prompt: "", // Default empty string
            content: [], // Default empty array
            userId: "user-1", // Default value
            createdAt: new Date().toISOString(),
            updatedAt: blueprint.lastUpdated || new Date().toISOString(),
            isTemporary: blueprint.isTemporary || false
          };
          
          return (
            <BlueprintCard
              key={blueprint.id}
              blueprint={cardData}
              onBlueprintClick={onBlueprintClick}
            />
          );
        })
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