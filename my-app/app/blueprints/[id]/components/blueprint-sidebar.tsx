"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="w-[350px] border-r bg-muted/10 overflow-y-auto flex flex-col">
      <div className="p-4">
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Original Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              {originalPrompt}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Regenerate Blueprint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Enter a new prompt to regenerate this blueprint..."
                className="min-h-[120px] resize-none"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
              />
              {regenerationError && (
                <div className="text-sm text-red-500">
                  {regenerationError}
                </div>
              )}
              <Button 
                className="w-full" 
                onClick={handleRegenerateBlueprint}
                disabled={isRegenerating || !newPrompt.trim()}
              >
                {isRegenerating ? "Regenerating..." : "Regenerate Blueprint"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 