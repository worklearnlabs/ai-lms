"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useBlueprintContext } from "../context/blueprint-context";

interface BlueprintSidebarProps {
  blueprintId: string;
  originalPrompt: string;
}

export default function BlueprintSidebar({ blueprintId, originalPrompt }: BlueprintSidebarProps) {
  const [newPrompt, setNewPrompt] = useState("");
  const { 
    isRegenerating, 
    regenerationError, 
    regenerateBlueprint 
  } = useBlueprintContext();

  const handleRegenerateBlueprint = async () => {
    if (!newPrompt.trim()) return;
    await regenerateBlueprint(blueprintId, newPrompt);
    
    // Only reset the form if successful (if there was an error, user may want to edit and retry)
    if (!regenerationError) {
      setNewPrompt("");
    }
  };

  return (
    <div className="w-full overflow-y-auto flex flex-col space-y-6">
      {/* Original Prompt Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Original Prompt</h4>
        <div className="text-sm">
          {originalPrompt}
        </div>
      </div>

      {/* Regenerate Blueprint Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">Regenerate Blueprint</h4>
        <Textarea
          placeholder="Enter a new prompt to regenerate this blueprint..."
          className="min-h-[120px] resize-none text-sm"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
        />
        
        {regenerationError && (
          <div className="text-sm text-red-500 mt-2">
            {regenerationError}
          </div>
        )}
        
        <Button 
          className="w-full" 
          size="sm"
          variant="secondary"
          onClick={handleRegenerateBlueprint}
          disabled={isRegenerating || !newPrompt.trim()}
        >
          {isRegenerating ? "Regenerating..." : "Regenerate Blueprint"}
        </Button>
      </div>
    </div>
  );
} 