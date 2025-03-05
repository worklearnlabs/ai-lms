"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateBlueprintModal } from "./create-blueprint-modal"

interface CreateBlueprintButtonProps {
  variant?: "default" | "sidebar"
}

export function CreateBlueprintButton({ variant = "default" }: CreateBlueprintButtonProps) {
  if (variant === "sidebar") {
    // For the sidebar menu item - match the styling of SidebarMenuSubButton
    return (
      <CreateBlueprintModal
        triggerButton={
          <div className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground flex h-7 min-w-0 items-center rounded-md px-2 text-sm cursor-pointer overflow-hidden w-full">
            <span className="truncate">Create Blueprint</span>
          </div>
        }
      />
    )
  }
  
  // For the main dashboard button
  return (
    <CreateBlueprintModal
      triggerButton={
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Create New Blueprint
        </Button>
      }
    />
  )
} 