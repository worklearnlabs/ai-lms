"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Step } from "../types";

interface BlueprintSidebarProps {
  originalPrompt: string;
  selectedStep?: Step | null;
  selectedSubtask?: {
    stepNumber: number;
    taskIndex: number;
    text: string;
  } | null;
  onBackToOverview?: () => void;
  onRegenerateStep?: (stepIndex: number, regeneratePrompt?: string) => void;
  steps?: Step[]; // Add steps array prop to access all steps
}

export default function BlueprintSidebar({ 
  originalPrompt,
  selectedStep,
  selectedSubtask,
  onBackToOverview,
  onRegenerateStep,
  steps = [] // Default to empty array if not provided
}: BlueprintSidebarProps) {
  const [regeneratePrompt, setRegeneratePrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // State for collapsible sections
  const [sectionsState, setSectionsState] = useState({
    details: true,
    sources: false,
    tools: false,
    courses: false,
    certifications: false
  });

  // Toggle section expanded state
  const toggleSection = (section: keyof typeof sectionsState) => {
    setSectionsState(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle navigation to next step
  const handleNextStep = () => {
    // If we're in general view (no selected step)
    if (!selectedStep) {
      // Find the first step
      if (steps.length > 0) {
        // Get the first step number (not index)
        const firstStepNumber = steps[0].number;
        console.log("Navigation: Moving to first step (number):", firstStepNumber);
        
        // Call parent handler with the step number (this will update parent state)
        if (onRegenerateStep) {
          onRegenerateStep(firstStepNumber);
        }
      }
      return;
    }
    
    // If we're already in a step, find the next one by index
    const currentIndex = steps.findIndex(s => s.number === selectedStep.number);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      // Get the next step by index
      const nextStepNumber = steps[currentIndex + 1].number;
      console.log("Navigation: Moving to next step (number):", nextStepNumber);
      
      // Call parent handler with the step number
      if (onRegenerateStep) {
        onRegenerateStep(nextStepNumber);
      }
    }
  };

  // Handle navigation to previous step
  const handlePrevStep = () => {
    // If no step is selected, nothing to go back to
    if (!selectedStep) {
      return;
    }
    
    // If we're on the first step, go back to general view
    if (selectedStep.number === steps[0]?.number) {
      console.log("Navigation: Going back to general view");
      if (onBackToOverview) {
        onBackToOverview();
      }
      return;
    }
    
    // Otherwise find the previous step
    const currentIndex = steps.findIndex(s => s.number === selectedStep.number);
    if (currentIndex > 0) {
      // Get the previous step by index
      const prevStepNumber = steps[currentIndex - 1].number;
      console.log("Navigation: Moving to previous step (number):", prevStepNumber);
      
      // Call parent handler with the step number
      if (onRegenerateStep) {
        onRegenerateStep(prevStepNumber);
      }
    }
  };

  // Mock function for handling regeneration (UI only)
  const handleRegenerateStep = () => {
    if (!selectedStep) return;
    
    setIsRegenerating(true);
    
    // Simulate regeneration process
    setTimeout(() => {
      setIsRegenerating(false);
      setRegeneratePrompt("");
      
      if (onRegenerateStep) {
        onRegenerateStep(selectedStep.number, regeneratePrompt);
      }
    }, 2000);
  };

  // Mock function for returning to overview (UI only)
  const handleBackToOverview = () => {
    if (onBackToOverview) {
      onBackToOverview();
    }
  };

  // Mock function for edit blueprint
  const handleEditBlueprint = () => {
    console.log("Editing blueprint");
  };

  // Tools used in this blueprint
  const tools = ["n8n", "Google Doc", "LinkedIn API", "OpenAI"];

  // If a subtask is selected, show the subtask view
  if (selectedSubtask && !selectedStep) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Main content - flex-grow to push tools to bottom */}
        <div className="flex-1 p-4 flex flex-col space-y-6 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between">
            <button 
              onClick={handleBackToOverview}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Back</span>
            </button>
          </div>
          
          <h4 className="text-sm font-semibold">
            Task {selectedSubtask.stepNumber}.{selectedSubtask.taskIndex + 1}
          </h4>
          
          <div className="text-sm border border-border p-3 rounded-md bg-muted/5">
            {selectedSubtask.text}
          </div>
          
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground">Actions</h4>
            </div>
            <Button variant="outline" size="sm" className="w-full flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              Mark Complete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If we're in step view, show the step-specific sidebar
  if (selectedStep) {
    return (
      <div className="w-full h-full flex flex-col">
        {/* Header with step navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button 
            className="p-1 rounded-sm hover:bg-muted/40 transition-colors focus:outline-none" 
            onClick={handlePrevStep}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-medium">Step {selectedStep.number}</h1>
          <button 
            className="p-1 rounded-sm hover:bg-muted/40 transition-colors focus:outline-none"
            onClick={handleNextStep}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Main content - regenerate prompt */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="rounded-md border border-border p-4 mb-4">
              <Textarea
                placeholder="Enter a prompt to regenerate this step..."
                className="border-none focus-visible:ring-0 p-0 resize-none h-40"
                value={regeneratePrompt}
                onChange={(e) => setRegeneratePrompt(e.target.value)}
              />
            </div>
            
            <Button
              variant="default"
              size="sm"
              className="w-full h-9 text-sm font-medium"
              onClick={handleRegenerateStep}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate Step"
              )}
            </Button>
          </div>

          {/* Collapsible sections */}
          <div className="px-4">
            {/* Details section - Step specific instructions */}
            <div className="border-b border-border">
              <button 
                className="flex items-center justify-between w-full py-3 focus:outline-none"
                onClick={() => toggleSection('details')}
              >
                <h2 className="text-base font-medium">Details</h2>
                {sectionsState.details ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </button>
              
              {sectionsState.details && (
                <div className="pb-3">
                  <ul className="list-disc pl-5 space-y-2">
                    {selectedStep.instructions?.map((instruction, index) => (
                      <li key={index} className="text-sm">
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sources section */}
            <div className="border-b border-border">
              <button 
                className="flex items-center justify-between w-full py-3 focus:outline-none"
                onClick={() => toggleSection('sources')}
              >
                <h2 className="text-base font-medium">Sources</h2>
                {sectionsState.sources ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </button>
              
              {sectionsState.sources && (
                <div className="pb-3">
                  <p className="text-sm text-muted-foreground">
                    LinkedIn API documentation
                  </p>
                </div>
              )}
            </div>

            {/* Tools section */}
            <div className="border-b border-border">
              <button 
                className="flex items-center justify-between w-full py-3 focus:outline-none"
                onClick={() => toggleSection('tools')}
              >
                <h2 className="text-base font-medium">Tools</h2>
                {sectionsState.tools ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </button>
              
              {sectionsState.tools && (
                <div className="pb-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Tools needed for this step:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStep.toolTags?.map((tool, index) => (
                      <Badge key={index} variant="outline" className="bg-muted/10 text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Courses section */}
            <div className="border-b border-border">
              <button 
                className="flex items-center justify-between w-full py-3 focus:outline-none"
                onClick={() => toggleSection('courses')}
              >
                <h2 className="text-base font-medium">Courses</h2>
                {sectionsState.courses ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </button>
              
              {sectionsState.courses && (
                <div className="pb-3">
                  <p className="text-sm text-muted-foreground">
                    No courses required for this step.
                  </p>
                </div>
              )}
            </div>

            {/* Certifications section */}
            <div className="border-b border-border">
              <button 
                className="flex items-center justify-between w-full py-3 focus:outline-none"
                onClick={() => toggleSection('certifications')}
              >
                <h2 className="text-base font-medium">Certifications</h2>
                {sectionsState.certifications ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </button>
              
              {sectionsState.certifications && (
                <div className="pb-3">
                  <p className="text-sm text-muted-foreground">
                    No certifications required for this step.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default General view
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button className="p-1 rounded-sm hover:bg-muted/40 transition-colors invisible focus:outline-none">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-medium">General</h1>
        <button 
          className="p-1 rounded-sm hover:bg-muted/40 transition-colors focus:outline-none"
          onClick={handleNextStep}  
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Main content area with scrolling */}
      <div className="flex-1 overflow-y-auto">
        {/* Blueprint prompt */}
        <div className="p-4">
          <div className="rounded-md border border-border p-4 mb-4">
            <p className="text-sm leading-relaxed">
              {originalPrompt || "Run a daily search of LinkedIn posts for any post that has the keywords &quot;venture studio&quot; or &quot;venture studios&quot;. I only want posts from the last 24 hours. I want the name of the poster, post content, # of comments, timestamp, date stamp and post URL. Once I have that information I want an agent to summarize each post and put it all in a Google Doc."}
            </p>
          </div>
          
          {/* Edit Blueprint button */}
          <Button
            variant="default"
            size="sm"
            className="w-full h-9 text-sm font-medium"
            onClick={handleEditBlueprint}
          >
            Edit Blueprint
          </Button>
        </div>

        {/* Collapsible sections */}
        <div className="px-4">
          {/* Details section - For general view, show steps and complexity */}
          <div className="border-b border-border">
            <button 
              className="flex items-center justify-between w-full py-3 focus:outline-none"
              onClick={() => toggleSection('details')}
            >
              <h2 className="text-base font-medium">Details</h2>
              {sectionsState.details ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </button>
            
            {sectionsState.details && (
              <div className="pb-3">
                <p className="text-sm text-muted-foreground mb-3">
                  This is an automation for daily search of LinkedIn posts containing the keywords &quot;venture studio&quot;, followed by extraction and summarization.
                </p>
                
                <div className="flex gap-2 mb-1">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {steps.length} steps
                  </Badge>
                  
                  <div className="relative group">
                    <Badge 
                      variant="outline" 
                      className={`
                        ${steps.length <= 3 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                          steps.length <= 6 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                          'bg-red-500/10 text-red-500 border-red-500/20'}
                      `}
                    >
                      {steps.length <= 3 ? 'Low' : 
                       steps.length <= 6 ? 'Medium' : 
                       'High'}
                    </Badge>
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      Complexity level
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sources section */}
          <div className="border-b border-border">
            <button 
              className="flex items-center justify-between w-full py-3 focus:outline-none"
              onClick={() => toggleSection('sources')}
            >
              <h2 className="text-base font-medium">Sources</h2>
              {sectionsState.sources ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </button>
            
            {sectionsState.sources && (
              <div className="pb-3">
                <p className="text-sm text-muted-foreground">
                  LinkedIn API for data extraction.
                </p>
              </div>
            )}
          </div>

          {/* Tools section */}
          <div className="border-b border-border">
            <button 
              className="flex items-center justify-between w-full py-3 focus:outline-none"
              onClick={() => toggleSection('tools')}
            >
              <h2 className="text-base font-medium">Tools</h2>
              {sectionsState.tools ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </button>
            
            {sectionsState.tools && (
              <div className="pb-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Tools needed for this automation:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tools.map((tool, index) => (
                    <Badge key={index} variant="outline" className="bg-muted/10 text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Courses section */}
          <div className="border-b border-border">
            <button 
              className="flex items-center justify-between w-full py-3 focus:outline-none"
              onClick={() => toggleSection('courses')}
            >
              <h2 className="text-base font-medium">Courses</h2>
              {sectionsState.courses ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </button>
            
            {sectionsState.courses && (
              <div className="pb-3">
                <p className="text-sm text-muted-foreground">
                  No courses required for this automation.
                </p>
              </div>
            )}
          </div>

          {/* Certifications section */}
          <div className="border-b border-border">
            <button 
              className="flex items-center justify-between w-full py-3 focus:outline-none"
              onClick={() => toggleSection('certifications')}
            >
              <h2 className="text-base font-medium">Certifications</h2>
              {sectionsState.certifications ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </button>
            
            {sectionsState.certifications && (
              <div className="pb-3">
                <p className="text-sm text-muted-foreground">
                  No certifications required for this automation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 