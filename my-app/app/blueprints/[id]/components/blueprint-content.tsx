"use client";

import { ContentItem, Step } from "../types";
import dynamic from "next/dynamic";

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
  originalPrompt?: string;
  onRecreateBlueprint?: (originalPrompt: string) => void;
  onNodeClick?: (index: number, regeneratePrompt?: string) => void;
  onSubtaskSelect?: (stepNumber: number, taskIndex: number, text: string) => void;
}

export default function BlueprintContent({ 
  content, 
  originalPrompt,
  onRecreateBlueprint,
  onNodeClick,
  onSubtaskSelect
}: BlueprintContentProps) {
  // Extract step items from content and filter out any non-step items
  const steps: Step[] = content
    .filter(item => item.type === 'step' && item.step)
    .map(item => item.step as Step);

  // Log the content structure to debug
  console.log("BlueprintContent - content:", content);

  // Extract title and description from content
  const titleItem = content.find(item => item.type === "heading");
  const descriptionItem = content.find(item => item.type === "paragraph");
  
  // Get the title and description directly from content
  const title = titleItem?.content;
  const description = descriptionItem?.content;
  
  console.log("BlueprintContent - extracted:", { title, description });

  const handleRecreateBlueprint = (prompt: string) => {
    if (onRecreateBlueprint) {
      onRecreateBlueprint(prompt);
    }
  };
  
  // Handle subtask selection
  const handleSubtaskSelect = (stepNumber: number, taskIndex: number, text: string) => {
    if (onSubtaskSelect) {
      onSubtaskSelect(stepNumber, taskIndex, text);
    }
  };

  // Always render the flow diagram without any conditional view logic
  return (
    <div className="h-full w-full">
      <FlowDiagram 
        steps={steps} 
        onNodeClick={onNodeClick}
        originalPrompt={originalPrompt}
        title={title}
        description={description}
        onRecreateBlueprint={handleRecreateBlueprint}
        onSubtaskSelect={handleSubtaskSelect}
      />
    </div>
  );
} 