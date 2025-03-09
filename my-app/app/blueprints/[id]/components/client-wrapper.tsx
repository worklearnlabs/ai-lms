"use client";

import { useState, useEffect } from "react";
import BlueprintContent from "./blueprint-content";
import BlueprintSidebar from "./blueprint-sidebar";
import { ContentItem } from "../types";

interface ClientWrapperProps {
  blueprintId: string;
  originalPrompt: string;
  content: ContentItem[];
}

export default function ClientWrapper({ blueprintId, originalPrompt, content }: ClientWrapperProps) {
  // Keep track of mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // Add state for selected subtask
  const [selectedSubtask, setSelectedSubtask] = useState<{
    stepNumber: number;
    taskIndex: number;
    text: string;
  } | null>(null);
  
  // Add state for tasks expanded/collapsed
  const [tasksExpanded, setTasksExpanded] = useState(true);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle blueprint recreation with modal
  const handleRecreateBlueprint = (prompt: string) => {
    console.log("Opening blueprint creation modal with:", prompt);
    // In a real implementation, you would:
    // 1. Open a modal with the prompt pre-filled
    // 2. Start the AI-driven Q&A process
    // 3. Create a new blueprint or update the existing one
    
    // For demo purposes, we're just logging the action
    alert(`Recreating blueprint with prompt: ${prompt}`);
  };
  
  // Handle subtask selection
  const handleSubtaskSelect = (stepNumber: number, taskIndex: number, text: string) => {
    setSelectedSubtask({
      stepNumber,
      taskIndex,
      text
    });
  };
  
  // Handle toggle all tasks
  const handleToggleAllTasks = (expanded: boolean) => {
    setTasksExpanded(expanded);
  };
  
  // Don't render until client-side to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-170px)]">
        <div className="flex-1 p-6">
          <div className="h-12 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Implementation Plan</h2>
          </div>
          <div className="h-[calc(100%-60px)] bg-muted/20 rounded-lg flex items-center justify-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-170px)]">
      {/* Main content area - takes full width */}
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden p-6">
          {/* Always show flow view content without conditional rendering */}
          <BlueprintContent 
            content={content} 
            originalPrompt={originalPrompt}
            onRecreateBlueprint={handleRecreateBlueprint}
            onSubtaskSelect={handleSubtaskSelect}
            tasksExpanded={tasksExpanded}
            onToggleAllTasks={handleToggleAllTasks}
          />
        </div>
      </div>

      {/* Blueprint sidebar with tools information - increased width */}
      <div className="w-96 bg-muted/5 border-l border-border overflow-y-auto">
        <BlueprintSidebar 
          blueprintId={blueprintId} 
          originalPrompt={originalPrompt}
          selectedSubtask={selectedSubtask}
          tasksExpanded={tasksExpanded}
          onToggleAllTasks={handleToggleAllTasks}
        />
      </div>
    </div>
  );
} 