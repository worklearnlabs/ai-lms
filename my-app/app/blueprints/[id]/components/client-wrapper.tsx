"use client";

import { useState, useEffect } from "react";
import BlueprintContent from "./blueprint-content";
import BlueprintSidebar from "./blueprint-sidebar";
import { ContentItem } from "../types";
import ViewToggle from "./view-toggle";

interface ClientWrapperProps {
  blueprintId: string;
  originalPrompt: string;
  content: ContentItem[];
}

export default function ClientWrapper({ blueprintId, originalPrompt, content }: ClientWrapperProps) {
  const [currentView, setCurrentView] = useState<"list" | "flow">("list");
  // Add mounted state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // Only render after component is mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleViewChange = (view: "list" | "flow") => {
    setCurrentView(view);
  };
  
  // Don't render until client-side to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6">
          <div className="h-12 mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold">Implementation Plan</h2>
            <div className="flex items-center">
              <div className="h-10 w-28 rounded-md bg-muted/20 animate-pulse"></div>
            </div>
          </div>
          <div className="h-[calc(100vh-220px)] bg-muted/20 rounded-lg flex items-center justify-center">
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content area - takes full width in both views */}
      <div className="w-full overflow-auto p-6">
        {/* Fixed Implementation Plan title and view toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Implementation Plan</h2>
          <ViewToggle view={currentView} onChange={handleViewChange} />
        </div>
        
        {currentView === "list" ? (
          <div className="flex gap-6">
            {/* Sidebar */}
            <div className="w-64 shrink-0">
              <h3 className="text-md font-medium mb-4">Blueprint Info</h3>
              <BlueprintSidebar 
                blueprintId={blueprintId}
                originalPrompt={originalPrompt} 
              />
            </div>
            
            {/* Steps List */}
            <div className="flex-1">
              <h3 className="text-md font-medium mb-4">Steps</h3>
              <BlueprintContent 
                content={content} 
                onViewChange={handleViewChange}
                view={currentView}
                showViewToggle={false}
              />
            </div>
          </div>
        ) : (
          /* Flow Diagram View - full height for better diagram visibility */
          <div className="h-[calc(100vh-150px)]">
            <BlueprintContent 
              content={content} 
              onViewChange={handleViewChange}
              view={currentView}
              showViewToggle={false}
            />
          </div>
        )}
      </div>
    </div>
  );
} 