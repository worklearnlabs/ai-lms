"use client";

import { useState } from "react";
import { ContentItem } from "../types";
import StepList from "./step-list";
import dynamic from "next/dynamic";
import ViewToggle from "./view-toggle";

// Use dynamic import with no SSR for React Flow component
const FlowDiagram = dynamic(() => import("./flow-diagram"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-muted-foreground">Loading diagram...</div>
    </div>
  )
});

interface BlueprintContentProps {
  content: ContentItem[];
  onViewChange?: (view: "list" | "flow") => void;
  view?: "list" | "flow";
  showViewToggle?: boolean;
}

export default function BlueprintContent({ 
  content, 
  onViewChange,
  view: externalView,
  showViewToggle = false
}: BlueprintContentProps) {
  // Use internal state if no external view is provided
  const [internalView, setInternalView] = useState<"list" | "flow">("list");
  
  // Determine which view to use - external takes precedence
  const view = externalView || internalView;
  
  // Find step items from the content
  const stepItems = content.filter(item => item.type === 'step' && item.step);
  const steps = stepItems.map(item => item.step!);
  
  const handleStepClick = (index: number, regeneratePrompt?: string) => {
    console.log(`Clicked on step ${index + 1}${regeneratePrompt ? ` with prompt: ${regeneratePrompt}` : ''}`);
    // Implement step regeneration logic here
    // When regeneratePrompt is provided, this is a regeneration request
  };
  
  const handleViewChange = (newView: "list" | "flow") => {
    // Update internal state if needed
    if (!externalView) {
      setInternalView(newView);
    }
    // Notify parent component about view change
    onViewChange?.(newView);
  };
  
  return (
    <div className="h-full">
      {/* View toggle - only shown if requested */}
      {showViewToggle && (
        <div className="flex justify-end mb-4">
          <ViewToggle view={view} onChange={handleViewChange} />
        </div>
      )}
      
      {/* Content display based on view */}
      {steps.length > 0 && (
        <div className="h-full">
          {view === "list" ? (
            <StepList steps={steps} />
          ) : (
            <div className="w-full h-full rounded-lg overflow-hidden border">
              <FlowDiagram steps={steps} onNodeClick={handleStepClick} />
            </div>
          )}
        </div>
      )}
    </div>
  );
} 