"use client";

import { Card } from "@/components/ui/card";
import { ContentItem } from "../types";
import StepList from "./step-list";

interface BlueprintContentProps {
  content: ContentItem[];
}

export default function BlueprintContent({ content }: BlueprintContentProps) {
  // Find step items from the content
  const stepItems = content.filter(item => item.type === 'step' && item.step);
  const steps = stepItems.map(item => item.step!);
  
  return (
    <div className="space-y-6">
      {/* Steps list */}
      {steps.length > 0 && (
        <Card className="p-6">
          <StepList steps={steps} />
        </Card>
      )}
    </div>
  );
} 