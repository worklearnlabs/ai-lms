"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface BlueprintContextType {
  isRegenerating: boolean;
  setIsRegenerating: (value: boolean) => void;
  regenerationError: string | null;
  setRegenerationError: (error: string | null) => void;
  regenerateBlueprint: (id: string, prompt: string) => Promise<void>;
}

const BlueprintContext = createContext<BlueprintContextType | undefined>(undefined);

export function useBlueprintContext() {
  const context = useContext(BlueprintContext);
  if (!context) {
    throw new Error("useBlueprintContext must be used within a BlueprintProvider");
  }
  return context;
}

interface BlueprintProviderProps {
  children: ReactNode;
}

export function BlueprintProvider({ children }: BlueprintProviderProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);

  const regenerateBlueprint = async (id: string, prompt: string) => {
    if (!prompt.trim()) return;
    
    setIsRegenerating(true);
    setRegenerationError(null);
    
    try {
      const response = await fetch(`/api/blueprints/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate blueprint');
      }

      // Refresh the page after a successful regeneration
      window.location.reload();
    } catch (error) {
      console.error("Failed to regenerate blueprint:", error);
      setRegenerationError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <BlueprintContext.Provider
      value={{
        isRegenerating,
        setIsRegenerating,
        regenerationError,
        setRegenerationError,
        regenerateBlueprint
      }}
    >
      {children}
    </BlueprintContext.Provider>
  );
} 