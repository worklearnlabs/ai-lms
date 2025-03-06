"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useEffect, useState } from "react"
import { getBlueprintById } from "@/utils/models"

export function PageBreadcrumb() {
  const pathname = usePathname()
  const [blueprintTitle, setBlueprintTitle] = useState<string | null>(null)
  
  // Extract the page name from the pathname
  const getPageName = (path: string) => {
    // Remove trailing slash if present
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path
    
    // Get the last segment of the path
    const segments = cleanPath.split('/')
    const lastSegment = segments[segments.length - 1]
    
    // Capitalize and format the page name
    if (!lastSegment) return 'Home'
    
    // Handle ID segment specially
    if (lastSegment === '[id]' || lastSegment.match(/^[0-9a-fA-F-]+$/)) {
      return blueprintTitle || 'Blueprint Details'
    }
    
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
  }
  
  // Check if this is a blueprint detail page
  const isBlueprintDetail = pathname.match(/\/blueprints\/([^\/]+)$/)
  
  // Fetch blueprint title if we're on a blueprint detail page
  useEffect(() => {
    if (isBlueprintDetail) {
      const blueprintId = isBlueprintDetail[1]
      const fetchBlueprintTitle = async () => {
        const blueprint = await getBlueprintById(blueprintId)
        if (blueprint) {
          setBlueprintTitle(blueprint.title)
        }
      }
      
      fetchBlueprintTitle()
    }
  }, [pathname])
  
  // Check if we're in the settings section
  const isSettingsSection = pathname.includes('/settings')
  
  // If in settings section, show Settings > [Tab]
  if (isSettingsSection) {
    const pageName = getPageName(pathname)
    
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }
  
  // If in blueprint detail page
  if (isBlueprintDetail) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/blueprints">My Blueprints</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{blueprintTitle || 'Loading...'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }
  
  // If in blueprints page
  if (pathname === '/blueprints') {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>My Blueprints</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
  }
  
  // Default breadcrumb for other pages
  const pageName = getPageName(pathname)
  
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>{pageName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
} 