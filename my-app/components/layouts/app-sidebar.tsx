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
  
  // Create a user object for NavUser component
  const userForNav = user ? {
    name: user.email, // Simplified to match our auth structure
    email: user.email,
    avatar: "/avatars/shadcn.jpg", // Default avatar path
  } : {
    name: "Guest",
    email: "guest@example.com",
    avatar: "/avatars/shadcn.jpg",
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