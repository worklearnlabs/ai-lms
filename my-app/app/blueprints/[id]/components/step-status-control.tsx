"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateBlueprintStep, updateBlueprintVerification } from "@/utils/research-api";
import { StepStatusType } from "@/types/schema";

interface StepStatusControlProps {
  blueprintId: string;
  stepId: string;
  stepNumber: number;
  currentStatus: StepStatusType;
  onStatusChange?: (newStatus: StepStatusType) => void;
}

export default function StepStatusControl({
  blueprintId,
  stepId,
  stepNumber,
  currentStatus,
  onStatusChange,
}: StepStatusControlProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleStatusChange = async (newStatus: StepStatusType) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Update the step status
      await updateBlueprintStep(blueprintId, stepId, {
        status: newStatus,
      });
      
      // Show success message
      toast.success(`Step ${stepNumber} marked as ${newStatus.replace('_', ' ')}`);
      
      // If the step is marked as completed, check if all steps are complete to verify the blueprint
      if (newStatus === 'completed') {
        try {
          // This is a simple attempt to update the blueprint verification status
          // The backend will check if all steps are complete and only update if they are
          await updateBlueprintVerification(blueprintId, true);
        } catch (error) {
          // We can ignore errors here as it's not critical to the user experience
          console.error("Error updating blueprint verification:", error);
        }
      }
      
      // Notify parent of status change
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
    } catch (error) {
      console.error("Error updating step status:", error);
      toast.error("Failed to update step status", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <Button variant="ghost" size="sm" disabled>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Updating...
        </Button>
      ) : (
        <>
          {currentStatus === 'not_started' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('in_progress')}
              className="text-amber-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Start Step
            </Button>
          ) : currentStatus === 'in_progress' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('completed')}
              className="text-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('in_progress')}
              className="text-amber-600"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Reopen Step
            </Button>
          )}
        </>
      )}
    </div>
  );
} 