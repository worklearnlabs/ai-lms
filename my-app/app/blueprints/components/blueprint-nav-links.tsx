"use client"

import { useRouter } from "next/navigation"
import { CreateBlueprintModal } from "./create-blueprint-modal"

interface BlueprintNavLinkProps {
  url: string
  title: string
}

export function BlueprintNavLink({ url, title }: BlueprintNavLinkProps) {
  const router = useRouter()
  
  // If this is the "Create Blueprint" link, render the modal
  if (title === "Create Blueprint") {
    return <CreateBlueprintModal />
  }
  
  // For My Blueprints or any other link, just navigate
  const handleClick = () => {
    router.push(url)
  }
  
  return (
    <div onClick={handleClick} className="cursor-pointer w-full">
      {title}
    </div>
  )
} 