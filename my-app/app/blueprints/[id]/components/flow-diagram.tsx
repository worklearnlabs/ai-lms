"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  NodeProps,
  MarkerType,
  Position,
  useReactFlow,
  ConnectionLineType,
  addEdge,
  Handle,
  Connection,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Step } from '../types';
import { Eye, EyeOff, Minimize2, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

// Prompt Node component to display original prompt
function PromptNode() {
  return (
    <div className="relative bg-background border border-border rounded-md shadow-md p-5 w-[400px]">
      {/* Bottom source handle to connect to first step - hidden if there's an edge */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-primary/80 border-2 border-background" 
      />
      
      <div className="space-y-4">
        <div className="flex flex-col">
          <h3 className="font-semibold text-lg mb-2">LinkedIn Data Scraper</h3>
          <p className="text-sm text-muted-foreground">
            Automated daily search of LinkedIn posts containing specific keywords, followed by extraction and summarization.
          </p>
        </div>
      </div>
    </div>
  );
}

// Define a custom StepNode component
function StepNode({ data, id }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [regenerationNodeVisible, setRegenerationNodeVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subtasksCollapsed, setSubtasksCollapsed] = useState(!data.showSubtasks);
  const nodeRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  
  // Update subtasksCollapsed when data.showSubtasks changes
  useEffect(() => {
    setSubtasksCollapsed(!data.showSubtasks);
  }, [data.showSubtasks]);
  
  // Use a combination of event handlers and mousemove to ensure hover detection works
  // Direct event handlers
  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
  };
  
  // Handle click to select this step
  const handleClick = () => {
    // If onNodeClick is provided, call it with the step number
    if (data.onNodeClick) {
      data.onNodeClick(data.number);
    }
  };
  
  // Fallback mouse position tracking with extended bounds for reliable hover
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!nodeRef.current) return;
      
      // Get bounding box of node
      const rect = nodeRef.current.getBoundingClientRect();
      
      // Add extended area around the node to make hover more forgiving
      const extendedRect = {
        left: rect.left - 20,
        top: rect.top - 20,
        right: rect.right + 20,
        bottom: rect.bottom + 50, // Extra space below for the action bar
      };
      
      // Check if mouse is within the extended area
      const isInExtendedArea = 
        e.clientX >= extendedRect.left && 
        e.clientX <= extendedRect.right && 
        e.clientY >= extendedRect.top && 
        e.clientY <= extendedRect.bottom;
      
      setIsHovered(isInExtendedArea);
    };
    
    // Add listener and remove on cleanup
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []); // Empty dependency array - only add/remove once
  
  // Function to create regeneration node
  const createRegenerationNode = () => {
    // Check if it's already visible
    if (regenerationNodeVisible) return;
    
    setRegenerationNodeVisible(true);
    setIsLoading(true);
    
    // Get the current node position
    const currentNode = reactFlowInstance.getNode(id as string);
    if (!currentNode) return;
    
    // Calculate position for regeneration node (to the right)
    const position = {
      x: currentNode.position.x + 450,
      y: currentNode.position.y,
    };
    
    // Create unique IDs for the new node and edge
    const regenerationNodeId = `regenerate-${id}`;
    const edgeId = `edge-to-regenerate-${id}`;
    
    // Add the new node
    reactFlowInstance.addNodes({
      id: regenerationNodeId,
      type: 'regenerateNode',
      position,
      data: { 
        stepIndex: data.index,
        prompt: data.prompt || "",
        originalTitle: data.title,
        onClose: () => {
          reactFlowInstance.deleteElements({ nodes: [{ id: regenerationNodeId }], edges: [{ id: edgeId }] });
          setRegenerationNodeVisible(false);
        },
        onSubmit: (regeneratePrompt: string) => {
          if (data.onRegenerateClick) {
            data.onRegenerateClick(data.index, regeneratePrompt);
          }
          // We keep the node open until generation completes
          setIsLoading(false);
        }
      },
    });
    
    // Add an edge connecting the step to the regeneration node
    reactFlowInstance.addEdges({
      id: edgeId,
      source: id as string,
      target: regenerationNodeId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5, 5' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#94a3b8',
      },
    });
    
    // Auto-fit the view after nodes are added
    setTimeout(() => {
      reactFlowInstance.fitView({
        padding: 0.2,
        includeHiddenNodes: false,
        duration: 200,
      });
    }, 50);
  };

  // Handle regenerate click
  const handleRegenerateClick = () => {
    createRegenerationNode();
  };

  // Copy function
  const handleCopy = () => {
    const content = `Step ${data.number}: ${data.title}\n\n${data.instructions.join('\n')}`;
    navigator.clipboard.writeText(content)
      .then(() => {
        console.log('Content copied to clipboard');
        // In a real application, you would show a toast notification
      })
      .catch(err => {
        console.error('Failed to copy content: ', err);
      });
  };

  // Number of subtasks (demo calculation - would come from data)
  const subtaskCount = data.instructions ? data.instructions.length : 0;

  // Toggle subtasks
  const toggleSubtasks = (stepNumber: number) => {
    console.log(`Toggling subtasks for step ${stepNumber}`);
    setSubtasksCollapsed(!subtasksCollapsed);
    
    // Call the onToggleSubtasks function passed through data
    if (data.onToggleSubtasks) {
      data.onToggleSubtasks(stepNumber);
    }
  };

  // Handler for clicking on subtask count
  const handleSubtasksClick = () => {
    console.log(`Show subtasks for step ${data.number}`);
    // Toggle the visibility of subtasks for this step
    toggleSubtasks(data.number);
  };

  return (
    <div 
      ref={nodeRef}
      className="relative bg-background border border-border rounded-md shadow-md p-5 w-[400px] hover:shadow-lg transition-shadow"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      data-node-id={id}
    >
      {/* Connection handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-primary/80 border-2 border-background" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-primary/80 border-2 border-background" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="subtasksHandle"
        className="w-3 h-3 !bg-primary/80 border-2 border-background" 
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-full bg-background/50 flex items-center justify-center z-30 rounded-md">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}
      
      <div className="space-y-3">
        {/* Title with step number */}
        <div>
          <h3 className="font-semibold text-base">{data.number}. {data.title}</h3>
        </div>
        
        {/* Simplified card content: Just estimated time */}
        <div className="flex items-center text-xs text-muted-foreground">
          <span>Estimated time: {data.estimatedTime}</span>
        </div>
        
        {/* Tool Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.toolTags.map((tag: string, i: number) => (
            <span key={i} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      {/* Action bar - Always rendered but visibility controlled by CSS */}
      <div 
        className={`absolute -bottom-14 left-0 right-0 flex justify-center gap-3 z-20 transition-opacity duration-150 ${
          isHovered && !isLoading && !regenerationNodeVisible 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 bg-background border border-border rounded-full shadow-md py-1.5 px-3">
          {/* Copy action */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full hover:bg-muted"
            onClick={handleCopy}
            title="Copy step content"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          
          {/* Divider */}
          <div className="h-4 w-px bg-border"></div>
          
          {/* Regenerate action */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-full hover:bg-muted"
            onClick={handleRegenerateClick}
            title="Regenerate with AI"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          
          {/* Only show subtasks toggle if there are subtasks */}
          {subtaskCount > 0 && (
            <>
              {/* Divider */}
              <div className="h-4 w-px bg-border"></div>
              
              {/* Subtasks action */}
              <Button 
                variant="ghost"
                size="sm"
                className="text-xs font-medium h-7 px-2 hover:bg-muted"
                onClick={handleSubtasksClick}
                title={subtasksCollapsed ? "Expand subtasks" : "Collapse subtasks"}
              >
                {subtasksCollapsed ? (
                  <span className="flex items-center gap-1">
                    Expand Tasks ({subtaskCount})
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    Collapse Tasks ({subtaskCount})
                  </span>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Regeneration node component definition
function RegenerateNode({ data }: NodeProps) {
  const [prompt, setPrompt] = useState(data.prompt || "");
  
  const handleSubmit = () => {
    if (data.onSubmit) {
      data.onSubmit(prompt);
    }
  };
  
  const handleClose = () => {
    if (data.onClose) {
      data.onClose();
    }
  };
  
  return (
    <div className="bg-background border border-border rounded-md shadow-md p-5 w-[300px]">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-primary/80 border-2 border-background"
      />
      
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-sm">Regenerate Step</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Original: {data.originalTitle}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleClose}
          >
            <span className="sr-only">Close</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
            >
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
        
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] text-sm resize-none"
          placeholder="Enter a prompt to regenerate this step..."
        />
        
        <Button
          className="w-full"
          size="sm"
          onClick={handleSubmit}
        >
          Regenerate
        </Button>
      </div>
    </div>
  );
}

// Update SubtaskBubble component
function SubtaskBubble({ data }: NodeProps) {
  const handleClick = () => {
    // Display task details in the sidebar
    if (data.onSelect) {
      data.onSelect(data.stepNumber, data.taskIndex, data.text);
    }
  };

  return (
    <div 
      className="bg-secondary/70 border border-border rounded-md px-4 py-3 shadow-sm cursor-pointer hover:bg-secondary transition-colors"
      onClick={handleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 !bg-primary/80 border-2 border-background" 
      />
      
      <span className="text-sm font-medium">{data.stepNumber}.{data.taskIndex + 1} {data.text}</span>
    </div>
  );
}

interface FlowDiagramProps {
  steps: Step[];
  originalPrompt?: string;
  onNodeClick?: (stepIndex: number, regeneratePrompt?: string) => void;
  onRecreateBlueprint?: (originalPrompt: string) => void;
  onSubtaskSelect?: (stepNumber: number, taskIndex: number, text: string) => void;
}

export default function FlowDiagram({ 
  steps, 
  originalPrompt, 
  onNodeClick, 
  onRecreateBlueprint,
  onSubtaskSelect
}: FlowDiagramProps) {
  // Register node types
  const nodeTypes = useMemo(() => ({ 
    promptNode: PromptNode,
    stepNode: StepNode,
    regenerateNode: RegenerateNode,
    subtaskBubble: SubtaskBubble
  }), []);

  // Define initial nodes and edges
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    // Add prompt node if originalPrompt is provided
    if (originalPrompt) {
      nodes.push({
        id: 'original-prompt',
        type: 'promptNode',
        position: { x: 350, y: 0 },
        data: { 
          originalPrompt: originalPrompt,
          onRecreateBlueprint
        }
      });
    }
    
    // Add step nodes
    steps.forEach((step, index) => {
      // Position first step node at y: 300 and maintain equal spacing for subsequent nodes
      const yPosition = originalPrompt ? 300 + (index * 300) : index * 300;
      
      // Log step info to debug
      console.log(`Creating node for step ${step.number} at index ${index}`);
      
      nodes.push({
        id: `step-${step.number}`,
        type: 'stepNode',
        position: { x: 350, y: yPosition },
        data: { 
          ...step,
          index,
          onNodeClick: onNodeClick,
          onRegenerateClick: (stepIndex: number, regeneratePrompt?: string) => {
            if (onNodeClick) {
              onNodeClick(stepIndex, regeneratePrompt);
            }
          },
          onToggleSubtasks: () => {},  // We'll handle this in FlowContent
          showSubtasks: true
        }
      });
      
      // Add subtask nodes if they exist and tasks are expanded
      if (step.instructions && step.instructions.length > 0) {
        // Calculate the minimum height needed for each subtask to have 1rem (16px) spacing
        const subtaskMinHeight = 16; // 1rem = 16px
        const subtaskCount = step.instructions.length;
        
        // Estimate height of each subtask (based on the bubble component height - roughly 40px + 16px spacing)
        const estimatedSubtaskHeight = 56; // Base height + spacing
        
        // Calculate total height needed for all subtasks
        const totalSubtaskAreaHeight = Math.max(
          subtaskCount * estimatedSubtaskHeight,
          subtaskCount * subtaskMinHeight + (subtaskCount - 1) * 16 // Ensure minimum spacing
        );
        
        // Starting position for the first subtask (above the center of the step node)
        const subtaskStartY = yPosition - (totalSubtaskAreaHeight / 2);
        
        step.instructions.forEach((instruction, taskIndex) => {
          // Position each subtask with even spacing
          const subtaskY = subtaskStartY + (taskIndex * estimatedSubtaskHeight);
          
          nodes.push({
            id: `subtask-${step.number}-${taskIndex}`,
            type: 'subtaskBubble',
            position: { 
              x: 1050, // Increased horizontal spacing for better arrow visibility
              y: subtaskY
            },
            data: {
              text: instruction,
              stepNumber: step.number,
              taskIndex,
              onSelect: onSubtaskSelect
            }
          });
        });
      }
    });
    
    return nodes;
  }, [steps, onNodeClick, originalPrompt, onRecreateBlueprint, onSubtaskSelect]);

  // Create edges between nodes with nice styling
  const initialEdges: Edge[] = useMemo(() => {
    // Main flow edges
    const edges: Edge[] = [];
    
    // First edge connects prompt to first step if there's an original prompt
    if (originalPrompt && steps.length > 0) {
      edges.push({
        id: 'prompt-first-step',
        source: 'original-prompt',
        target: `step-1`,
        sourceHandle: null, // Use default bottom handle
        targetHandle: null, // Use default top handle
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#94a3b8',
        },
      });
    }
    
    // Rest of edges connect steps to each other (top to bottom)
    steps.slice(0, -1).forEach((step, index) => {
      edges.push({
        id: `edge-${index}`,
        source: `step-${step.number}`,
        target: `step-${steps[index + 1].number}`,
        sourceHandle: null, // Use default bottom handle
        targetHandle: null, // Use default top handle
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#94a3b8',
        },
      });
    });
    
    // Subtask edges 
    steps.forEach((step) => {
      if (step.instructions) {
        step.instructions.forEach((_, taskIndex) => {
          edges.push({
            id: `step-${step.number}-subtask-${taskIndex}`,
            source: `step-${step.number}`,
            target: `subtask-${step.number}-${taskIndex}`,
            sourceHandle: "subtasksHandle", // Use right-middle handle
            targetHandle: null, // Use left-middle handle for subtasks
            type: 'smoothstep',
            style: { 
              stroke: '#94a3b8', 
              strokeWidth: 2,
              opacity: 1, // Show if tasks are expanded
              strokeDasharray: '5, 5' // Make subtask connections dashed
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: '#94a3b8',
            },
            hidden: false, // Hide if tasks are collapsed
          });
        });
      }
    });
    
    return edges;
  }, [steps]);

  return (
    <ReactFlowProvider>
      <FlowContent 
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        nodeTypes={nodeTypes}
      />
    </ReactFlowProvider>
  );
}

// Add this interface before the FlowContent function
interface FlowContentProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  nodeTypes: {
    promptNode: React.ComponentType<NodeProps>;
    stepNode: React.ComponentType<NodeProps>;
    regenerateNode: React.ComponentType<NodeProps>;
    subtaskBubble: React.ComponentType<NodeProps>;
  };
}

// Inner component that uses ReactFlow hooks safely inside the provider
function FlowContent({ 
  initialNodes, 
  initialEdges, 
  nodeTypes
}: FlowContentProps) {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [minimapMinimized, setMinimapMinimized] = useState(false);
  const [allSubtasksVisible, setAllSubtasksVisible] = useState(true);

  // Toggle minimap state
  const toggleMinimap = useCallback(() => {
    setMinimapMinimized(prev => !prev);
  }, []);

  // Toggle all subtasks visibility
  const toggleAllSubtasks = useCallback(() => {
    if (reactFlowInstance) {
      // Find all subtask edges
      const subtaskEdges = reactFlowInstance.getEdges().filter(e => 
        e.id.includes('-subtask-')
      );
      
      // Toggle visibility based on current state
      const newVisibilityState = !allSubtasksVisible;
      
      // Update all subtask edges
      subtaskEdges.forEach(() => {
        setEdges(eds => eds.map(e => {
          if (e.id.includes('-subtask-')) {
            return {
              ...e,
              hidden: !newVisibilityState,
              style: { 
                ...e.style, 
                opacity: newVisibilityState ? 1 : 0 
              }
            };
          }
          return e;
        }));
      });
      
      // Update subtask nodes visibility
      setNodes(nds => nds.map(node => {
        if (node.id.includes('subtask-')) {
          return {
            ...node,
            hidden: !newVisibilityState
          };
        }
        return node;
      }));
      
      // Update state
      setAllSubtasksVisible(newVisibilityState);
      
      // Also update node data to reflect the new state
      setNodes(nds => nds.map(node => {
        if (node.type === 'stepNode') {
          return {
            ...node,
            data: {
              ...node.data,
              showSubtasks: newVisibilityState
            }
          };
        }
        return node;
      }));
    }
  }, [reactFlowInstance, setEdges, setNodes, allSubtasksVisible]);

  // Toggle subtasks visibility for a specific step
  const toggleSubtasks = useCallback((stepNumber: number) => {
    console.log(`Toggling subtasks for step ${stepNumber}`);
    
    if (reactFlowInstance) {
      // Find edges connected to this step's subtasks
      const subtaskEdges = reactFlowInstance.getEdges().filter(e => 
        e.id.startsWith(`step-${stepNumber}-subtask-`)
      );
      
      // Check the current visibility state of the first edge to determine the toggle action
      const currentVisibility = subtaskEdges.length > 0 ? !subtaskEdges[0].hidden : true;
      
      // Toggle visibility for this specific step's subtasks
      subtaskEdges.forEach(edge => {
        setEdges(eds => eds.map(e => {
          if (e.id === edge.id) {
            return {
              ...e,
              hidden: currentVisibility,
              style: { 
                ...e.style, 
                opacity: currentVisibility ? 0 : 1 
              }
            };
          }
          return e;
        }));
      });
      
      // Also toggle visibility of this step's subtask nodes
      const subtaskNodes = reactFlowInstance.getNodes().filter(node => 
        node.id.startsWith(`subtask-${stepNumber}-`)
      );
      
      subtaskNodes.forEach(node => {
        setNodes(nds => nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              hidden: currentVisibility
            };
          }
          return n;
        }));
      });
      
      // Update local state in this specific step node to reflect new subtask visibility
      setNodes(nds => nds.map(n => {
        if (n.id === `step-${stepNumber}`) {
          return {
            ...n,
            data: {
              ...n.data,
              showSubtasks: !currentVisibility
            }
          };
        }
        return n;
      }));
    }
  }, [reactFlowInstance, setEdges, setNodes]);

  // Update node data to include the toggle function
  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.type === 'stepNode') {
        return {
          ...node,
          data: {
            ...node.data,
            onToggleSubtasks: () => toggleSubtasks(node.data.number)
          }
        };
      }
      return node;
    }));
  }, [toggleSubtasks, setNodes]);

  // Handle connection
  const onConnect = useCallback((params: Connection) => 
    setEdges((eds) => 
      addEdge({
        ...params,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 3 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#94a3b8',
        },
      }, eds)
    ),
    [setEdges]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ 
          padding: 0.2,
          includeHiddenNodes: false,
          minZoom: 0.15,
          maxZoom: 0.8,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.35 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        zoomOnScroll={true}
        panOnScroll={true}
        elementsSelectable={false}
        nodesDraggable={false}
        selectNodesOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="#94a3b8" 
          gap={16} 
          size={1}
          variant={BackgroundVariant.Dots}
          style={{ opacity: 0.3 }}
        />
        <Controls 
          showInteractive={false}
          position="bottom-right"
        />
        
        {/* Flow controls positioned at bottom left */}
        <div className="absolute bottom-[0.75rem] left-[0.75rem] z-10 flex flex-col gap-3">
          {/* Subtasks toggle button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleAllSubtasks}
                  className="rounded-full bg-background hover:bg-background/90 border border-border flex items-center justify-center shadow-sm transition-all"
                  style={{ width: 40, height: 40 }}
                  aria-label={allSubtasksVisible ? "Hide all subtasks" : "Show all subtasks"}
                >
                  {allSubtasksVisible ? 
                    <EyeOff size={18} className="text-foreground/80" /> : 
                    <Eye size={18} className="text-foreground/80" />
                  }
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {allSubtasksVisible ? "Hide all subtasks" : "Show all subtasks"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Minimap components - Container always present, content conditionally rendered */}
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {!minimapMinimized ? (
                    <div className="relative cursor-pointer group" onClick={toggleMinimap}>
                      <MiniMap
                        position="bottom-left"
                        nodeStrokeWidth={3}
                        zoomable
                        pannable
                        nodeColor={(node) => {
                          switch (node.type) {
                            case 'promptNode':
                              return 'var(--purple-500, #8b5cf6)';
                            case 'stepNode':
                              return 'var(--blue-500, #3b82f6)';
                            case 'subtaskBubble':
                              return 'var(--emerald-500, #10b981)';
                            default:
                              return 'var(--slate-400, #94a3b8)';
                          }
                        }}
                        nodeStrokeColor="var(--foreground)"
                        nodeBorderRadius={4}
                        style={{ 
                          backgroundColor: 'var(--background)', 
                          border: '1px solid var(--border)',
                          borderRadius: '0.5rem',
                          height: 100,
                          width: 150,
                          boxShadow: 'var(--shadow-sm)',
                          margin: '0',
                          transition: 'opacity 0.2s ease'
                        }}
                        maskColor="var(--minimap-mask-color, rgba(128, 128, 128, 0.3))"
                        className="minimap-custom"
                      />
                      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 flex items-center justify-center rounded-lg transition-colors">
                        <div className="bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Minimize2 size={16} className="text-foreground/80" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={toggleMinimap}
                      className="rounded-full bg-background hover:bg-background/90 border border-border flex items-center justify-center shadow-sm transition-all"
                      style={{ width: 40, height: 40 }}
                      aria-label="Show minimap"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="4" width="6" height="6" rx="1" className="fill-purple-500" />
                        <rect x="4" y="14" width="6" height="6" rx="1" className="fill-blue-500" />
                        <rect x="14" y="4" width="6" height="6" rx="1" className="fill-emerald-500" />
                        <rect x="14" y="14" width="6" height="6" rx="1" className="fill-slate-400" />
                      </svg>
                    </button>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right">
                  {minimapMinimized ? "Show minimap" : "Hide minimap"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </ReactFlow>
    </div>
  );
}