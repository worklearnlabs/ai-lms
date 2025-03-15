import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import BlueprintCard from "./blueprint-card"
import { ContentItem } from "@/app/blueprints/[id]/types"
import { Checkbox } from "@/components/ui/checkbox"

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
  onSelectionChange?: (selectedIds: string[]) => void
  selectionEnabled?: boolean
}

export function BlueprintsSection({ 
  blueprints, 
  onBlueprintClick,
  onSelectionChange,
  selectionEnabled = false
}: BlueprintsSectionProps) {
  const [selectedBlueprints, setSelectedBlueprints] = useState<string[]>([]);

  // Handle toggling selection for a blueprint
  const toggleBlueprintSelection = (blueprintId: string) => {
    const newSelection = selectedBlueprints.includes(blueprintId)
      ? selectedBlueprints.filter(id => id !== blueprintId)
      : [...selectedBlueprints, blueprintId];
    
    setSelectedBlueprints(newSelection);
    
    // Notify parent component about selection change
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  // Toggle all blueprints selection
  const toggleAllSelection = () => {
    if (selectedBlueprints.length === blueprints.length) {
      // If all are selected, deselect all
      setSelectedBlueprints([]);
    } else {
      // Otherwise, select all
      setSelectedBlueprints(blueprints.map(blueprint => blueprint.id));
    }

    // Notify parent component about selection change
    if (onSelectionChange) {
      onSelectionChange(
        selectedBlueprints.length === blueprints.length 
          ? [] 
          : blueprints.map(blueprint => blueprint.id)
      );
    }
  };

  return (
    <div className="space-y-4">
      {selectionEnabled && blueprints.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="select-all"
              checked={selectedBlueprints.length > 0 && selectedBlueprints.length === blueprints.length}
              onCheckedChange={toggleAllSelection}
            />
            <label 
              htmlFor="select-all" 
              className="text-sm cursor-pointer select-none"
            >
              {selectedBlueprints.length === 0 
                ? "Select all" 
                : selectedBlueprints.length === blueprints.length 
                  ? "Deselect all" 
                  : `Selected ${selectedBlueprints.length} of ${blueprints.length}`}
            </label>
          </div>
        </div>
      )}

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
            <div key={blueprint.id} className="relative">
              {selectionEnabled && (
                <div 
                  className="absolute right-2 top-2 z-10" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleBlueprintSelection(blueprint.id);
                  }}
                >
                  <Checkbox 
                    checked={selectedBlueprints.includes(blueprint.id)} 
                    className="h-5 w-5 rounded-sm bg-white"
                  />
                </div>
              )}
              <BlueprintCard
                blueprint={cardData}
                onBlueprintClick={onBlueprintClick}
                isSelected={selectionEnabled && selectedBlueprints.includes(blueprint.id)}
                onSelect={selectionEnabled ? () => toggleBlueprintSelection(blueprint.id) : undefined}
                selectionMode={selectionEnabled}
              />
            </div>
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