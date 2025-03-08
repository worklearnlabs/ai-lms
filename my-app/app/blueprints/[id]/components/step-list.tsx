"use client";

import { useState } from "react";
import { Step } from "../types";
import StepCard from "./step-card";

interface StepListProps {
  steps: Step[];
}

export default function StepList({ steps: initialSteps }: StepListProps) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const toggleStep = (index: number) => {
    setActiveStepIndex(activeStepIndex === index ? null : index);
  };

  const handleCompleteStep = (index: number, completed: boolean) => {
    setSteps(prevSteps => 
      prevSteps.map((step, i) => 
        i === index ? { ...step, completed } : step
      )
    );
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <StepCard
          key={index}
          step={step}
          isActive={activeStepIndex === index}
          onToggle={() => toggleStep(index)}
          onComplete={(completed) => handleCompleteStep(index, completed)}
        />
      ))}
    </div>
  );
} 