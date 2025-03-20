"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LinkIcon,
  BookOpenIcon,
  RefreshCw,
  ListIcon,
  ShareIcon,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ReactFlow, { 
  Controls, 
  Background, 
  Node, 
  Edge, 
  ReactFlowProvider 
} from "reactflow";
import "reactflow/dist/style.css";
import {
  PerplexityResearchResponse,
  BlueprintStep,
} from "@/utils/perplexity-api";
import { toast } from "sonner";

// Define visualization modes
type VisualizationMode = "linear" | "complex";

interface BlueprintResearchProps {
  blueprintId: string;
}

export default function BlueprintResearch({
  blueprintId,
}: BlueprintResearchProps) {
  const [research, setResearch] = useState<PerplexityResearchResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("linear");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const fetchResearch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/blueprints/${blueprintId}/research`);

      if (!response.ok) {
        if (response.status === 404) {
          setResearch(null);
          return;
        }
        throw new Error("Failed to fetch research");
      }

      const data = await response.json();
      
      // Validate that we have proper research data structure
      if (data) {
        try {
          // Verify the required properties exist in the response
          const researchData = data.research_data || {};
          const sources = data.sources || [];
          const usageMetrics = data.usage_metrics || {
            citation_tokens: 0,
            search_queries: 0
          };
          
          // Validate that steps array exists
          if (!researchData.steps || !Array.isArray(researchData.steps)) {
            console.warn("Invalid research data structure: missing steps array", researchData);
            setError("Research data is in an invalid format. Missing steps array.");
            setIsLoading(false);
            return;
          }
          
          // Validate complexity field
          if (!researchData.complexity || !["low", "medium", "high"].includes(researchData.complexity)) {
            console.warn("Invalid research data structure: missing or invalid complexity", researchData);
            // Set a default rather than failing
            researchData.complexity = "medium";
          }
          
          // Reconstruct the full research data from the database format
          const fullResearch: PerplexityResearchResponse = {
            ...researchData,
            sources: sources,
            usage_metrics: usageMetrics
          };
          
          setResearch(fullResearch);
        } catch (validationError) {
          console.error("Error validating research data:", validationError);
          setError("Research data structure is invalid");
        }
      } else {
        setResearch(null);
      }
    } catch (err) {
      setError("Could not load research data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateResearch = async () => {
    setIsGenerating(true);
    setError(null);
    
    toast.info("Generating research...");

    try {
      const response = await fetch(`/api/blueprints/${blueprintId}/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          complexity: "medium",
          maxSteps: 10
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate research");
      }

      const data = await response.json();
      setResearch(data.data);
      toast.success("Research generated successfully!");
    } catch (err) {
      setError("Failed to generate research");
      console.error(err);
      toast.error("Failed to generate research");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (blueprintId) {
      fetchResearch();
    }
  }, [blueprintId]);

  // Generate flow diagram based on steps and visualization mode
  const generateFlowDiagram = (
    steps: BlueprintStep[],
    mode: VisualizationMode
  ) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create nodes from steps
    steps.forEach((step, index) => {
      newNodes.push({
        id: `step-${step.number}`,
        type: "default", // Using default node type for simplicity
        position: { x: 250, y: index * 150 },
        data: { 
          label: `${step.number}. ${step.title}`,
          step 
        },
      });
    });

    // Create edges based on visualization mode
    if (mode === "linear") {
      // Simple linear connections
      steps.forEach((step, index) => {
        if (index > 0) {
          newEdges.push({
            id: `edge-${index - 1}-to-${index}`,
            source: `step-${steps[index - 1].number}`,
            target: `step-${step.number}`,
            type: "smoothstep",
            label: "Next",
          });
        }
      });
    } else {
      // Complex connections with dependencies
      // For demonstration purposes, we'll create some non-linear connections
      steps.forEach((step, index) => {
        if (index > 0) {
          // Always connect to previous step
          newEdges.push({
            id: `edge-${index - 1}-to-${index}`,
            source: `step-${steps[index - 1].number}`,
            target: `step-${step.number}`,
            type: "smoothstep",
          });

          // Add some cross-connections for complexity
          if (index > 2 && index % 2 === 0) {
            newEdges.push({
              id: `edge-${index - 2}-to-${index}`,
              source: `step-${steps[index - 2].number}`,
              target: `step-${step.number}`,
              type: "smoothstep",
              style: { stroke: "#555" },
              label: "Depends on",
            });
          }
        }
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Update flow when research or mode changes
  useEffect(() => {
    if (research?.steps) {
      generateFlowDiagram(research.steps, visualizationMode);
    }
  }, [research, visualizationMode]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[250px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[300px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!research) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Blueprint Research</CardTitle>
          <CardDescription>
            Generate research to enhance this blueprint
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <BookOpenIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground mb-4">
            No research has been generated for this blueprint yet.
          </p>
          <Button onClick={generateResearch} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Research"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Blueprint Research</CardTitle>
            <CardDescription>
              AI-generated research for this blueprint
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateResearch}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh Research"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Implementation Steps</h3>
            <ToggleGroup
              type="single"
              value={visualizationMode}
              onValueChange={(value: string) =>
                value && setVisualizationMode(value as VisualizationMode)
              }
            >
              <ToggleGroupItem value="linear" aria-label="Linear flow">
                <ListIcon className="h-4 w-4 mr-2" />
                Linear
              </ToggleGroupItem>
              <ToggleGroupItem value="complex" aria-label="Complex flow">
                <ShareIcon className="h-4 w-4 mr-2" />
                Complex
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="h-[500px] border rounded-md">
            <ReactFlowProvider>
              <ReactFlow nodes={nodes} edges={edges} fitView>
                <Controls />
                <Background />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </div>

        <Tabs defaultValue="steps">
          <TabsList className="mb-4">
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="sources">
              Sources ({research?.sources?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="steps">
            {research?.steps.map((step, index) => (
              <div key={index} className="mb-6 border-b pb-4 last:border-b-0">
                <h4 className="text-lg font-semibold mb-2">
                  {step.number}. {step.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Estimated time: {step.estimated_time} minutes
                </p>

                {step.tools?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium mb-1">Tools</h5>
                    <div className="flex flex-wrap gap-2">
                      {step.tools.map((tool, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <h5 className="text-sm font-medium mb-1">Instructions</h5>
                  <ul className="list-disc pl-5 space-y-1">
                    {step.instructions.map((instruction, i) => (
                      <li key={i} className="text-sm">
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>

                {step.subtasks && step.subtasks.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-1">Subtasks</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {step.subtasks.map((subtask) => (
                        <li key={subtask.task_number} className="text-sm">
                          {subtask.description} ({subtask.estimated_time} min)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sources">
            <div className="space-y-4">
              {research?.sources.map((source, index) => (
                <div key={index} className="border rounded-md p-3">
                  <div className="flex items-center mb-2">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {source.title}
                    </a>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {source.snippet}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 