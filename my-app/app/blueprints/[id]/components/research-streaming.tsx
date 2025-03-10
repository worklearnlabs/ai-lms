"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { streamResearchSteps } from "@/utils/research-api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ResearchStreamingProps {
  blueprintId: string;
  searchQuery: string;
  onComplete?: () => void;
  regenerateStep?: number;
}

export default function ResearchStreaming({ 
  blueprintId, 
  searchQuery, 
  onComplete,
  regenerateStep 
}: ResearchStreamingProps) {
  const router = useRouter();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const streamEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when new content is streamed
  useEffect(() => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamText]);
  
  // Start streaming when component mounts
  useEffect(() => {
    if (!isStreaming && searchQuery) {
      handleStartStreaming();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle starting the streaming process
  const handleStartStreaming = async () => {
    if (isStreaming) return;
    
    try {
      setIsStreaming(true);
      setStreamText("");
      
      // Call the research API to generate steps
      const response = await streamResearchSteps(blueprintId, {
        searchQuery,
        regenerateStep,
      });
      
      // Check if response is OK
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      // Get response reader for streaming
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }
      
      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk and append to the stream text
        const chunk = new TextDecoder().decode(value);
        setStreamText((prev) => prev + chunk);
      }
      
      // Call onComplete when streaming is done
      if (onComplete) {
        toast.success(regenerateStep 
          ? "Step regenerated successfully" 
          : "Blueprint steps generated successfully");
        onComplete();
      }
      
      // Refresh the page or router to show the updated steps
      router.refresh();
      
    } catch (error) {
      console.error("Error streaming research steps:", error);
      toast.error("Failed to generate steps", {
        description: error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsStreaming(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="border rounded-lg p-4 flex-1 bg-muted/10 overflow-y-auto mb-4">
        {streamText ? (
          <div className="whitespace-pre-wrap">
            {streamText}
            <div ref={streamEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div className="text-sm text-muted-foreground">
                <div>Generating implementation steps...</div>
                <p className="text-xs mt-2">This may take a moment</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={handleStartStreaming}
          disabled={isStreaming}
          variant="outline"
          className="mr-2"
        >
          {isStreaming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            "Regenerate"
          )}
        </Button>
        
        <Button
          onClick={() => {
            if (onComplete) onComplete();
            router.refresh();
          }}
          disabled={isStreaming || !streamText}
        >
          {regenerateStep ? "Apply Changes" : "View Implementation"}
        </Button>
      </div>
    </div>
  );
} 