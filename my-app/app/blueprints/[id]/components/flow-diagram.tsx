"use client";

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Step } from '../types';
import StepNode from './step-node';

interface FlowDiagramProps {
  steps: Step[];
  onNodeClick?: (stepIndex: number) => void;
}

// Register custom node types
const nodeTypes = {
  step: StepNode,
};

export default function FlowDiagram({ steps, onNodeClick }: FlowDiagramProps) {
  // Convert steps to nodes and edges
  const initialNodes: Node[] = useMemo(() => 
    steps.map((step, index) => ({
      id: `step-${step.number}`,
      type: 'step',
      position: { x: 250, y: index * 200 }, // Vertical layout with spacing
      data: { 
        ...step,
        index,
        onClick: () => onNodeClick?.(index) 
      },
    })),
    [steps, onNodeClick]
  );

  const initialEdges: Edge[] = useMemo(() => 
    steps.slice(0, -1).map((_, index) => ({
      id: `edge-${index}`,
      source: `step-${index + 1}`,
      target: `step-${index + 2}`,
      type: 'smoothstep',
      animated: true,
    })),
    [steps]
  );

  // Using _ and __ to indicate unused variables
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // For debugging
  const onInit = useCallback((reactFlowInstance: unknown) => {
    console.log('Flow loaded:', reactFlowInstance);
  }, []);

  return (
    <ReactFlowProvider>
      <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
} 