"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ContentItem } from "../types";
import StepList from "./step-list";
import FlowDiagram from "./flow-diagram";
import ViewToggle from "./view-toggle";

interface BlueprintContentProps {
  content: ContentItem[];
}

export default function BlueprintContent({ content }: BlueprintContentProps) {
  const [view, setView] = useState<"list" | "flow">("list");
  
  // Find step items from the content
  const stepItems = content.filter(item => item.type === 'step' && item.step);
  const steps = stepItems.map(item => item.step!);
  
  const handleStepClick = (index: number) => {
    console.log(`Clicked on step ${index + 1}`);
    // Implement step regeneration logic here
  };
  
  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">System Architecture Implementation Steps</h2>
        <ViewToggle view={view} onChange={setView} />
      </div>
      
      {/* Content display based on view */}
      {steps.length > 0 && (
        <Card className={`${view === 'list' ? 'p-6' : 'p-0 overflow-hidden'} h-[calc(100vh-220px)]`}>
          {view === "list" ? (
            <StepList steps={steps} />
          ) : (
            <FlowDiagram steps={steps} onNodeClick={handleStepClick} />
          )}
        </Card>
      )}
    </div>
  );
} 