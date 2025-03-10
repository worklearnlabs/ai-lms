"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ResearchStreaming from "./research-streaming";

interface RegenerateStepModalProps {
  blueprintId: string;
  searchQuery: string;
  stepNumber: number;
  children: React.ReactNode;
  onComplete?: () => void;
}

export default function RegenerateStepModal({
  blueprintId,
  searchQuery,
  stepNumber,
  children,
  onComplete,
}: RegenerateStepModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleComplete = () => {
    setIsOpen(false);
    if (onComplete) onComplete();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[85vh] w-[800px] h-[600px] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-8 py-4 border-b">
          <DialogTitle>Regenerating Step {stepNumber}</DialogTitle>
          <DialogDescription>
            The AI is generating an improved version of this step. This may take a moment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 p-8 overflow-hidden">
          <ResearchStreaming
            blueprintId={blueprintId}
            searchQuery={searchQuery}
            regenerateStep={stepNumber}
            onComplete={handleComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 