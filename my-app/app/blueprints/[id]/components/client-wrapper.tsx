"use client";

import { useState, useEffect } from "react";
import BlueprintContent from "./blueprint-content";
import BlueprintSidebar from "./blueprint-sidebar";
import { ContentItem, Step } from "../types";
import { BlueprintStep } from "@/utils/perplexity-api";

interface ClientWrapperProps {
  originalPrompt: string;
  content: ContentItem[];
  blueprintId?: string; // Optional blueprint ID for fetching research
}

export default function ClientWrapper({ originalPrompt, content, blueprintId }: ClientWrapperProps) {
  // Keep track of mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // Add state for selected subtask
  const [selectedSubtask, setSelectedSubtask] = useState<{
    stepNumber: number;
    taskIndex: number;
    text: string;
  } | null>(null);
  
  // Add state for selected step
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  
  // Add state for research data
  const [researchData, setResearchData] = useState<BlueprintStep[] | null>(null);
  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  
  // Combined content with research data
  const [combinedContent, setCombinedContent] = useState<ContentItem[]>(content);
  
  // Fetch research data if blueprint ID is provided
  useEffect(() => {
    if (blueprintId) {
      const fetchResearch = async () => {
        setIsLoadingResearch(true);
        setResearchError(null);
        
        try {
          const response = await fetch(`/api/blueprints/${blueprintId}/research`);
          
          if (!response.ok) {
            if (response.status !== 404) { // 404 is expected if research doesn't exist yet
              throw new Error(`Failed to fetch research: ${response.status}`);
            }
            // If 404, just keep using the existing content
            return;
          }
          
          const data = await response.json();
          
          if (data && data.research_data && data.research_data.steps) {
            setResearchData(data.research_data.steps);
          }
        } catch (error) {
          console.error("Error fetching research:", error);
          setResearchError(error instanceof Error ? error.message : "Unknown error");
        } finally {
          setIsLoadingResearch(false);
        }
      };
      
      fetchResearch();
    }
  }, [blueprintId]);
  
  // Convert research data to ContentItem format when it's loaded
  useEffect(() => {
    if (researchData) {
      console.log("ClientWrapper - original content:", content);
      
      // Create content items from research data with the actual blueprint details
      // Use title and details from the parent component
      const researchContentItems: ContentItem[] = [
        {
          type: "heading",
          // Use first item in content if it's a heading, otherwise create one
          content: content.find(item => item.type === "heading")?.content || "Blueprint"
        },
        {
          type: "paragraph",
          // Use first paragraph in content if it exists, otherwise use originalPrompt
          content: content.find(item => item.type === "paragraph")?.content || originalPrompt || "Research based on blueprint data"
        }
      ];
      
      // Add each step from research data
      researchData.forEach(step => {
        researchContentItems.push({
          type: "step",
          step: {
            number: step.number,
            title: step.title,
            estimatedTime: `${step.estimated_time} minutes`,
            instructions: step.instructions,
            toolTags: step.tools,
            completed: false
          }
        });
      });
      
      console.log("ClientWrapper - research content items:", researchContentItems);
      setCombinedContent(researchContentItems);
    } else if (content && content.length > 0) {
      console.log("ClientWrapper - using original content:", content);
      // If there's original content but no research data, use that directly
      // No need to modify or extract from the content
      setCombinedContent(content);
    } else {
      console.log("ClientWrapper - using fallback content");
      // Fallback to default items if there's no content at all
      setCombinedContent([
        {
          type: "heading",
          content: "Blueprint"
        },
        {
          type: "paragraph",
          content: "No content available"
        }
      ]);
    }
  }, [researchData, content, originalPrompt]);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Extract steps from content
  const steps = combinedContent
    .filter(item => item.type === 'step' && item.step)
    .map(item => item.step as Step);
  
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
  
  // Handle node click to select a step
  const handleNodeClick = (stepIndex: number, regeneratePrompt?: string) => {
    console.log(`Selecting step ${stepIndex}`, regeneratePrompt ? `with prompt: ${regeneratePrompt}` : '');
    
    // Clear any selected subtask
    setSelectedSubtask(null);
    
    // Find the step by number or index
    const step = steps.find(s => s.number === stepIndex) || 
                (stepIndex < steps.length ? steps[stepIndex] : null);
    
    if (step) {
      setSelectedStep(step);
    }
  };
  
  // Handle subtask selection
  const handleSubtaskSelect = (stepNumber: number, taskIndex: number, text: string) => {
    // Clear any selected step
    setSelectedStep(null);
    
    setSelectedSubtask({
      stepNumber,
      taskIndex,
      text
    });
  };
  
  // Handle back to overview
  const handleBackToOverview = () => {
    setSelectedStep(null);
    setSelectedSubtask(null);
  };
  
  // Don't render until client-side to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-170px)]">
        <div className="flex-1 p-6">
          <div className="h-12 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Blueprint</h2>
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
          {/* Show a loading state when research is being fetched */}
          {isLoadingResearch ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading research data...</div>
            </div>
          ) : researchError ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-destructive">Error loading research: {researchError}</div>
            </div>
          ) : (
            /* Always show flow view content without conditional rendering */
            <BlueprintContent 
              content={combinedContent} 
              originalPrompt={originalPrompt}
              onRecreateBlueprint={handleRecreateBlueprint}
              onNodeClick={handleNodeClick}
              onSubtaskSelect={handleSubtaskSelect}
            />
          )}
        </div>
      </div>

      {/* Blueprint sidebar with tools information - increased width */}
      <div className="w-96 bg-muted/5 border-l border-border overflow-y-auto">
        <BlueprintSidebar 
          originalPrompt={originalPrompt}
          selectedStep={selectedStep}
          selectedSubtask={selectedSubtask}
          onBackToOverview={handleBackToOverview}
          onRegenerateStep={handleNodeClick}
          steps={steps}
        />
      </div>
    </div>
  );
} 