"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Database } from "lucide-react";
import { toast } from "sonner";

interface SeedButtonProps {
  userId: string;
}

export function SeedButton({ userId }: SeedButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    try {
      setLoading(true);
      
      const response = await fetch("/api/blueprints/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Blueprints seeded", {
          description: `${data.results.length} blueprints seeded successfully.`
        });
        
        // Reload the page to show new data
        window.location.reload();
      } else {
        throw new Error(data.message || "Failed to seed blueprints");
      }
    } catch (error) {
      toast.error("Error seeding blueprints", {
        description: (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleSeed} 
      disabled={loading}
    >
      <Database className="h-4 w-4 mr-2" /> 
      {loading ? "Seeding..." : "Seed Blueprints"}
    </Button>
  );
} 