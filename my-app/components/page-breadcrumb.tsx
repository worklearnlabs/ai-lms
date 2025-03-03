import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

export function PageBreadcrumb() {
  const pathname = usePathname()
  
  // Extract the page name from the pathname
  const getPageName = (path: string) => {
    // Remove trailing slash if present
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path
    
    // Get the last segment of the path
    const segments = cleanPath.split('/')
    const lastSegment = segments[segments.length - 1]
    
    // Capitalize and format the page name
    if (!lastSegment) return 'Home'
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
  }
  
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