"use client";

import { Button } from "@/components/ui/button";
import { Play, PlayCircle } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useState } from "react";

interface BlueprintActionButtonProps {
  blueprintId: string;
}

export default function BlueprintActionButton({ blueprintId }: BlueprintActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const handleExecuteBlueprint = async () => {
    setIsExecuting(true);
    
    try {
      // This would actually call an API to execute the blueprint
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`Executing blueprint ${blueprintId}`);
      
      // Close dialog on success
      setIsOpen(false);
    } catch (error) {
      console.error("Error executing blueprint:", error);
    } finally {
      setIsExecuting(false);
    }
  };
  
  return (
    <div className="flex items-center">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Play className="h-4 w-4 mr-2" />
            Execute Blueprint
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Blueprint</DialogTitle>
            <DialogDescription>
              This will run the blueprint using the Execution Agent. The agent will process each step automatically and report back with results.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              The Execution Agent will:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
              <li>Process each step of the blueprint</li>
              <li>Attempt to handle errors automatically</li>
              <li>Generate a report of actions taken</li>
              <li>Require your final validation before completion</li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleExecuteBlueprint} 
              disabled={isExecuting}
              className="gap-2"
            >
              {isExecuting ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    ></circle>
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Executing...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Start Execution
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 