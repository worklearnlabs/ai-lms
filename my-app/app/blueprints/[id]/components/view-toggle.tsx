"use client";

import { Button } from "@/components/ui/button";
import { ListOrdered, Network } from "lucide-react";

interface ViewToggleProps {
  view: "list" | "flow";
  onChange: (view: "list" | "flow") => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex bg-muted rounded-md p-1 w-fit">
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("list")}
        className="flex items-center gap-1"
      >
        <ListOrdered className="h-4 w-4" />
        <span>List</span>
      </Button>
      <Button
        variant={view === "flow" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("flow")}
        className="flex items-center gap-1"
      >
        <Network className="h-4 w-4" />
        <span>Flow</span>
      </Button>
    </div>
  );
} 