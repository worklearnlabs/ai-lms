"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface BlueprintSidebarProps {
  blueprintId: string;
  originalPrompt: string;
  selectedSubtask?: {
    stepNumber: number;
    taskIndex: number;
    text: string;
  } | null;
}

export default function BlueprintSidebar({ 
  originalPrompt,
  selectedSubtask
}: BlueprintSidebarProps) {
  // Constants and state setup
  const router = useRouter();

  const handleRegenerateBlueprint = () => {
    // Show loading state would be handled in a real implementation
    
    // Simulate API call delay
    setTimeout(() => {
      router.refresh();
    }, 2000);
  };

  // List of tools used for this blueprint implementation
  const tools = ["n8n", "Google Doc", "LinkedIn API", "OpenAI"];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Main content - flex-grow to push tools to bottom */}
      <div className="flex-1 p-4 flex flex-col space-y-6 min-h-0 overflow-y-auto">
        {/* Original Prompt Section without Edit Icon */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Original Prompt</h4>
          <div className="text-sm border border-border p-3 rounded-md bg-muted/5">
            {originalPrompt}
          </div>
          
          {/* Regenerate Blueprint Button right after prompt box */}
          <Button 
            className="w-full mt-3" 
            size="sm"
            variant="secondary"
            onClick={handleRegenerateBlueprint}
          >
            Regenerate Blueprint
          </Button>
        </div>

        {/* Selected subtask details will show here */}
        {selectedSubtask && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Task {selectedSubtask.stepNumber}.{selectedSubtask.taskIndex + 1} Details
            </h4>
            <div className="text-sm border border-border p-3 rounded-md bg-muted/5">
              {selectedSubtask.text}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="secondary" size="sm" className="w-full">
                Mark Complete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tools Section - Full width border on parent div */}
      <div className="border-t border-border py-4 px-4 mt-auto">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Tools Required</h4>
        <div className="flex flex-wrap gap-2">
          {tools.map((tool, index) => (
            <Badge key={index} variant="outline" className="bg-muted/10">
              {tool}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
} 