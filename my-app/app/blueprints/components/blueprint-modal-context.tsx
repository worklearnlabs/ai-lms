"use client"

import React, { createContext, useContext, useState } from "react"
import { CreateBlueprintModal } from "./create-blueprint-modal"

interface BlueprintModalContextType {
  openModal: () => void
}

const BlueprintModalContext = createContext<BlueprintModalContextType | undefined>(undefined)

export function useBlueprintModal() {
  const context = useContext(BlueprintModalContext)
  if (context === undefined) {
    throw new Error("useBlueprintModal must be used within a BlueprintModalProvider")
  }
  return context
}

export function BlueprintModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const openModal = () => {
    setIsOpen(true)
  }
  
  return (
    <BlueprintModalContext.Provider value={{ openModal }}>
      {children}
      
      <CreateBlueprintModal 
        isOpen={isOpen} 
        onOpenChange={setIsOpen}
        triggerButton={null}
      />
    </BlueprintModalContext.Provider>
  )
} 