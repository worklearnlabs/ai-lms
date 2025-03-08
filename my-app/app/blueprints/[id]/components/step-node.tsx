"use client";

import { Handle, Position } from 'reactflow';
import { Badge } from "@/components/ui/badge";
import { Clock, RotateCw } from "lucide-react";
import { Step } from '../types';
import { Button } from '@/components/ui/button';

interface StepNodeProps {
  data: Step & {
    index: number;
    onClick: () => void;
  };
  isConnectable: boolean;
}

export default function StepNode({ data, isConnectable }: StepNodeProps) {
  const truncateInstructions = (instructions: string[]) => {
    if (instructions.length === 0) return '';
    if (instructions.length === 1) return instructions[0];
    return `${instructions[0]}...`;
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm p-4 w-72 max-w-[300px]">
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-primary"
      />

      {/* Node content */}
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center">
                {data.number}
              </span>
              <h3 className="font-semibold text-base">{data.title}</h3>
            </div>
            <div className="mt-1 flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              <span>{data.estimatedTime}</span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0" 
            onClick={data.onClick}
            title="Regenerate step"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          {truncateInstructions(data.instructions)}
        </div>

        <div className="flex flex-wrap gap-1">
          {data.toolTags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-[10px] py-0 h-5">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 !bg-primary"
      />
    </div>
  );
} 