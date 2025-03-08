"use client";

import { useState } from "react";
import { Step } from "../types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, Sparkles } from "lucide-react";
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// Utility function for merging class names
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StepCardProps {
  step: Step;
  isActive: boolean;
  onToggle: () => void;
  onComplete: (completed: boolean) => void;
}

export default function StepCard({ step, isActive, onToggle, onComplete }: StepCardProps) {
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [regeneratePrompt, setRegeneratePrompt] = useState("");

  const handleRegenerateClick = () => {
    setShowRegenerateForm(!showRegenerateForm);
    if (!showRegenerateForm) {
      setRegeneratePrompt("");
    }
  };

  const handleRegenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would call the research agent to regenerate the step
    console.log("Regenerating step with prompt:", regeneratePrompt);
    // Reset the form
    setShowRegenerateForm(false);
    setRegeneratePrompt("");
  };

  return (
    <div className="mb-4">
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-200 ease-in-out overflow-hidden",
          isActive ? "bg-transparent" : "hover:bg-accent/10"
        )}
        onClick={onToggle}
      >
        {/* Header - Always visible */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Number indicator / Completion status - Clickable */}
            <div 
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium cursor-pointer transition-colors",
                step.completed ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50" : 
                "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onComplete(!step.completed);
              }}
              title={step.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.number}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <div className="flex items-center text-muted-foreground text-sm mt-1">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span>{step.estimatedTime}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step.toolTags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {isActive ? 
              <ChevronDown className="h-5 w-5 text-muted-foreground ml-2" /> : 
              <ChevronRight className="h-5 w-5 text-muted-foreground ml-2" />
            }
          </div>
        </div>
        
        {/* Expanded content - Only visible when active */}
        {isActive && (
          <div>
            {/* Implementation Instructions Section */}
            <div className="px-6 py-4 border-t">
              <h4 className="text-sm font-medium mb-2">Implementation Instructions:</h4>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                {step.instructions.map((instruction, index) => (
                  <li key={index} className="text-sm">{instruction}</li>
                ))}
              </ul>
            </div>
            
            <Separator />
            
            {/* Regeneration Section */}
            <div className="p-4">
              {!showRegenerateForm ? (
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerateClick();
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Regenerate with AI
                </Button>
              ) : (
                <form 
                  onSubmit={handleRegenerateSubmit} 
                  className="flex items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Textarea
                    className="flex-1 resize-none h-10 py-2 min-h-0"
                    placeholder="Describe how you want this step to be regenerated..."
                    value={regeneratePrompt}
                    onChange={(e) => setRegeneratePrompt(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button 
                    type="submit" 
                    className="flex-shrink-0 flex items-center gap-2"
                    disabled={!regeneratePrompt.trim()}
                  >
                    <Sparkles className="h-4 w-4" />
                    Update
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 