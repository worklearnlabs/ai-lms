"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  NodeTypes,
  NodeProps,
  MarkerType,
  Position,
  useReactFlow,
  ConnectionLineType,
  addEdge,
  Handle,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Step } from '../types';
import { Clock, Sparkles, Copy, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Define a custom StepNode component
function StepNode({ data, id }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [regenerationNodeVisible, setRegenerationNodeVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(true);
  const nodeRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  
  // Use a mouseout listener on document to handle hover state
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!nodeRef.current) return;
      
      // Get bounding box of node including buttons area
      const rect = nodeRef.current.getBoundingClientRect();
      const extendedRect = {
        left: rect.left,
        top: rect.top,
        right: rect.right + 40, // Extend right side to include buttons
        bottom: rect.bottom,
        width: rect.width + 40,
        height: rect.height
      };
      
      // Check if mouse is within the extended area
      const isInExtendedArea = 
        e.clientX >= extendedRect.left && 
        e.clientX <= extendedRect.right && 
        e.clientY >= extendedRect.top && 
        e.clientY <= extendedRect.bottom;
      
      setIsHovered(isInExtendedArea);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Add a regeneration node creation function
  const createRegenerationNode = () => {
    const newRegenerateNodeId = `regenerate-${id}`;
    const currentNode = reactFlowInstance.getNode(id);
    
    if (!currentNode) return;
    
    // Create a new node for regeneration input
    reactFlowInstance.addNodes({
      id: newRegenerateNodeId,
      type: 'regenerateNode',
      position: { 
        x: currentNode.position.x + 550, 
        y: currentNode.position.y 
      },
      data: { 
        stepId: id,
        stepNumber: data.number,
        // Simulate success when clicking Regenerate
        onSubmit: (prompt: string) => {
          console.log(`Regenerating step ${data.number} with prompt: ${prompt}`);
          data.onClick?.(data.index, prompt);
        },
        // Close the regeneration UI
        onClose: () => {
          reactFlowInstance.deleteElements({ nodes: [{ id: newRegenerateNodeId }] });
          setRegenerationNodeVisible(false);
          setButtonsVisible(true);
        },
        // Handle text field focus to show buttons again
        onFocus: () => {
          setButtonsVisible(true);
        }
      },
    });
    
    // Add an edge connecting the nodes
    reactFlowInstance.addEdges({
      id: `edge-${id}-${newRegenerateNodeId}`,
      source: id,
      sourceHandle: 'right',
      target: newRegenerateNodeId,
      targetHandle: 'left',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5, 5' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#64748b',
      },
    });
  };
  
  // Handle regeneration request
  const handleRegenerateClick = () => {
    // Don't create multiple regeneration nodes
    if (regenerationNodeVisible || isLoading) return;
    
    // Start loading state
    setIsLoading(true);
    
    // Hide buttons during loading
    setButtonsVisible(false);
    
    // Simulate a loading delay
    setTimeout(() => {
      setIsLoading(false);
      setRegenerationNodeVisible(true);
      
      // Create the regeneration node after loading
      createRegenerationNode();
      
    }, 1500); // 1.5 second delay to simulate loading
  };

  const handleCopy = () => {
    const stepText = `Step ${data.number}: ${data.title}\n${data.instructions?.join('\n')}`;
    navigator.clipboard.writeText(stepText)
      .then(() => console.log('Copied step to clipboard'))
      .catch(err => console.error('Failed to copy: ', err));
  };
  
  return (
    <div 
      ref={nodeRef}
      className="relative bg-background border rounded-lg shadow-sm p-6 w-96 max-w-[384px]"
    >
      {/* Add explicit handles for better connection points */}
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
        id="right"
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 !bg-primary/80 border-2 border-background" 
      />
      
      {/* Position step number on the left side middle */}
      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center z-10">
        <div className="text-sm font-medium bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center">
          {data.number}
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute -right-12 top-1/2 transform -translate-y-1/2 z-20">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shadow-md">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
        </div>
      )}
      
      {/* Floating action buttons on hover - positioned outside with spacing */}
      {isHovered && buttonsVisible && !isLoading && (
        <div className="absolute -right-12 top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-20">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 rounded-full shadow-md hover:shadow-lg transition-shadow"
                  onClick={handleCopy}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Copy step</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="h-8 w-8 rounded-full shadow-md hover:shadow-lg transition-shadow"
                  onClick={handleRegenerateClick}
                  disabled={regenerationNodeVisible}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Regenerate step with AI</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      <div className="space-y-3 pl-2">
        {/* Header with title and time */}
        <div>
          <h3 className="font-semibold text-base">{data.title}</h3>
          <div className="mt-1 flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            <span>{data.estimatedTime}</span>
          </div>
        </div>

        {/* Tools section with tooltips */}
        <div className="flex flex-wrap gap-1">
          {data.toolTags && data.toolTags.length > 0 && (
            <TooltipProvider>
              {data.toolTags.map((tag: string, i: number) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground">
                      {tag}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tool: {tag}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          )}
        </div>

        {/* View Details */}
        <div>
          <HoverCard openDelay={100} closeDelay={200}>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs px-2">
                View Details
              </Button>
            </HoverCardTrigger>
            <HoverCardContent side="left" align="start" className="w-80">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Step {data.number}: {data.title}</h4>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Instructions:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {data.instructions && data.instructions.map((instruction: string, i: number) => (
                      <li key={i}>{instruction}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </div>
    </div>
  );
}

// Regeneration input node component
function RegenerateNode({ data }: NodeProps) {
  const [prompt, setPrompt] = useState('');
  
  return (
    <div className="bg-background border rounded-lg shadow-sm p-6 w-96 max-w-[384px]">
      {/* Add handles for connection */}
      <Handle 
        id="left"
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 !bg-primary/80 border-2 border-background" 
      />
      
      <div className="space-y-4">
        <div className="flex items-center">
          <h3 className="text-base font-semibold">Regenerate Step {data.stepNumber}</h3>
        </div>
        
        <Textarea
          className="min-h-[100px] text-sm"
          placeholder="Provide instructions to improve or modify this step..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={data.onFocus}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={data.onClose}>
            Cancel
          </Button>
          <Button 
            size="sm" 
            disabled={!prompt.trim()}
            onClick={() => data.onSubmit(prompt)}
          >
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FlowDiagramProps {
  steps: Step[];
  onNodeClick?: (stepIndex: number, regeneratePrompt?: string) => void;
}

// Register custom node types
const nodeTypes: NodeTypes = {
  step: StepNode,
  regenerateNode: RegenerateNode,
};

export default function FlowDiagram({ steps, onNodeClick }: FlowDiagramProps) {
  // Convert steps to nodes and edges
  const initialNodes: Node[] = useMemo(() => 
    steps.map((step, index) => ({
      id: `step-${step.number}`,
      type: 'step',
      position: { x: 350, y: index * 350 }, // Much more spacing between nodes
      data: { 
        ...step,
        index,
        onClick: onNodeClick,
      },
    })),
    [steps, onNodeClick]
  );

  // Create edges between nodes with nice styling
  const initialEdges: Edge[] = useMemo(() => 
    steps.slice(0, -1).map((_, index) => ({
      id: `edge-${index}`,
      source: `step-${index + 1}`,
      target: `step-${index + 2}`,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 3 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#94a3b8',
      },
    })),
    [steps]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => 
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

  // For debugging
  const onInit = useCallback((reactFlowInstance: unknown) => {
    console.log('Flow loaded:', reactFlowInstance);
  }, []);

  return (
    <ReactFlowProvider>
      <TooltipProvider>
        <div className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onInit={onInit}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { stroke: '#94a3b8', strokeWidth: 3 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#94a3b8',
              },
            }}
            attributionPosition="bottom-right"
          >
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable
              pannable
              nodeBorderRadius={10}
            />
            <Background color="#aaa" gap={16} size={1} />
          </ReactFlow>
        </div>
      </TooltipProvider>
    </ReactFlowProvider>
  );
} 