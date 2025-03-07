"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  PieChart,
  Settings2,
  Waypoints,
  Route,
  LayoutDashboard,
  Sparkles,
} from "lucide-react"

// Updated import paths
import { NavMain } from "@/components/layouts/nav-main"
import { NavProjects } from "@/components/layouts/nav-projects"
import { NavUser } from "@/components/layouts/nav-user"
import { TeamSwitcher } from "@/components/layouts/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/utils/auth"

// This is sample data.
const data = {
  teams: [
    {
      name: "Highline Beta",
      logo: GalleryVerticalEnd,
      plan: "Business",
    },
    {
      name: "Amadeu Ferreira",
      logo: Command,
      plan: "Personal",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      items: null,
    },
    {
      title: "Blueprints",
      url: "/blueprints",
      icon: Sparkles,
      isActive: true,
      items: [
        {
          title: "Create Blueprint",
          url: "/blueprints",
        },
        {
          title: "My Blueprints",
          url: "/blueprints",
        },
      ],
    },
    {
      title: "Guides",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "LLMs",
          url: "#",
        },
        {
          title: "Workflows & Automation",
          url: "#",
        },
        {
          title: "Agents",
          url: "#",
        },
      ],
    },
    {
      title: "Courses",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "No-Code",
          url: "#",
        },
        {
          title: "AI Developer",
          url: "#",
        },
        {
          title: "Data Scientist",
          url: "#",
        },
        ],
    },
    {
      title: "Community Hub",
      url: "#",
      icon: Waypoints,
      items: [
        {
          title: "Explore",
          url: "#",
        },
        {
          title: "Events",
          url: "#",
        },
        {
          title: "News",
          url: "#",
        },
        {
          title: "Marketplace",
          url: "#",
        },
        ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Profile",
          url: "/settings/profile",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Operations",
      url: "#",
      icon: Route,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  
  // Debug log to help diagnose user data issues
  // DO NOT REMOVE: This helps identify what properties are available
  console.log("Full user object:", user);
  
  /**
   * SMART NAME FORMATTING FUNCTION
   *
   * This function handles multiple scenarios for displaying user names based on
   * available data. It's designed to gracefully handle incomplete or missing data.
   *
   * Problem: When the database has issues, user data may be incomplete.
   * Solution: This function provides multiple fallback strategies to ensure
   * something user-friendly always displays.
   */
  const getDisplayName = (user: { 
    first_name?: string | null; 
    last_name?: string | null; 
    email?: string;
  } | null): string => {
    // Safety check - user might be null during auth state changes
    if (!user) return "Guest";
    
    // SCENARIO 1: Generic placeholder detected
    // If first_name is the generic "User" placeholder and last_name is empty,
    // extract a nicer name from the email address instead
    if (user.first_name === "User" && (!user.last_name || user.last_name === "")) {
      // Use email to create a personalized name if available
      if (user.email) {
        // Extract username portion (before @)
        const username = user.email.split('@')[0];
        
        // Format the username by:
        // 1. Splitting by common separators (., _, -)
        // 2. Capitalizing each part
        // 3. Joining with spaces for readability
        const nameParts = username.split(/[._-]/);
        const formattedParts = nameParts.map((part: string) => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        );
        
        return formattedParts.join(' ');
      }
    }
    
    // SCENARIO 2: Complete name available
    // This is the ideal case - use both first and last name
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    
    // SCENARIO 3: Partial name available
    // If only one name component exists, use that
    if (user.first_name) return user.first_name;
    if (user.last_name) return user.last_name;
    
    // SCENARIO 4: Last resort fallback
    // If we have no name data at all, extract from email or use "User"
    return user.email?.split('@')[0] || "User";
  };
  
  // Prepare user data for the navigation component
  // IMPORTANT: Always provide fallbacks for all properties to prevent UI errors
  const userForNav = user ? {
    name: getDisplayName(user),
    email: user.email,
    // The avatar path was causing 404 errors - using empty string triggers the fallback
    avatar: "", // DO NOT use "/avatars/shadcn.jpg" - file doesn't exist
  } : {
    name: "Guest",
    email: "guest@example.com",
    avatar: "", 
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userForNav} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
} 