"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BlueprintsSection } from "@/components/dashboard/blueprints-section"
import { CreateBlueprintButton } from "./components/create-blueprint-button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelativeTime } from "@/utils/misc"
import { createClientSupabase } from "@/utils/supabase"
import { Button } from "@/components/ui/button"

// Define Blueprint interface locally
interface Blueprint {
  id: string;
  title: string;
  details?: string;
  content?: Record<string, unknown>;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  prompt?: string;
  clone_count?: number;
  steps_count?: number;
  search_query?: string;
  visibility?: string;
  team_id?: string;
  skill_level?: string;
  learning_objective?: string;
  complexity?: string;
  estimated_time?: string;
  is_temporary?: boolean;
  description?: string;
}

// Create a wrapper function to handle string dates
function formatRelativeDate(dateString: string): string {
  return formatRelativeTime(new Date(dateString));
}

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noBlueprints, setNoBlueprints] = useState(false)
  const [isCreatingSample, setIsCreatingSample] = useState(false)

  // Log authentication status for debugging
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientSupabase();
        const { data } = await supabase.auth.getUser();
        console.log("🔐 Blueprints Auth:", data.user ? 
          `Authenticated as ${data.user.id}` : 
          "Not authenticated");
      } catch (err) {
        console.error("Auth check error:", err);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    async function fetchBlueprints() {
      try {
        setLoading(true)
        console.log("Starting to fetch blueprints from API...");

        // Get the authenticated user first to ensure we have a session
        const supabase = createClientSupabase();
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData.user) {
          console.log("No authenticated user found, showing public blueprints only");
        } else {
          console.log("Fetching blueprints for authenticated user:", authData.user.id);
        }

        // In development mode, we'll add a query param to fetch all blueprints to diagnose issues
        const isDevelopment = process.env.NODE_ENV === 'development';
        const apiUrl = isDevelopment 
          ? '/api/blueprints?fetchAll=true' 
          : '/api/blueprints';
          
        console.log(`Using API URL: ${apiUrl}`);

        // Use the API endpoint that handles user mapping properly
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Make sure we're using fresh data and not a cached response
          cache: 'no-store'
        });
        
        console.log("API response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched blueprints from API:", data);
        console.log("Number of blueprints received:", Array.isArray(data) ? data.length : "Not an array");
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log("No blueprints found in API response");
          setBlueprints([]);
          setNoBlueprints(true);
        } else {
          // Log the first blueprint structure to help diagnose formatting issues
          if (data.length > 0) {
            console.log("First blueprint structure:", JSON.stringify(data[0], null, 2));
            
            // Check if it has the necessary fields for display
            const firstBlueprint = data[0];
            console.log("Blueprint has required fields:", {
              id: !!firstBlueprint.id,
              title: !!firstBlueprint.title,
              steps_count: firstBlueprint.steps_count,
              details: !!firstBlueprint.details,
              is_verified: firstBlueprint.is_verified,
              updated_at: !!firstBlueprint.updated_at
            });
          }
          
          setBlueprints(data);
          setNoBlueprints(false);
        }
        
        setError(null);
      } catch (err) {
        console.error("Error fetching blueprints:", err)
        setError("Failed to load blueprints. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchBlueprints()
  }, [])

  // Function to create a sample blueprint for debugging
  async function createSampleBlueprint() {
    try {
      setIsCreatingSample(true);
      
      // Get the authenticated user
      const supabase = createClientSupabase();
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        alert("You need to be logged in to create a blueprint");
        return;
      }
      
      const userId = authData.user.id;
      console.log("Creating sample blueprint for user:", userId);
      
      // Create a sample blueprint through the API
      const response = await fetch('/api/blueprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: "Sample LinkedIn Data Scraper",
          prompt: "Create a LinkedIn post scraper for AI news",
          content: {}, // Empty content to start
          search_query: "How to build a LinkedIn scraper for AI content using JavaScript",
          visibility: "private",
          skill_level: "beginner",
          learning_objective: "Learn automation with APIs"
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create sample blueprint: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Sample blueprint created:", data);
      
      // Reload the page to show the new blueprint
      window.location.reload();
    } catch (error) {
      console.error("Error creating sample blueprint:", error);
      alert("Failed to create sample blueprint. See console for details.");
    } finally {
      setIsCreatingSample(false);
    }
  }

  // Transform Blueprint to format expected by BlueprintsSection
  const formattedBlueprints = blueprints.map(blueprint => ({
    id: blueprint.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
    title: blueprint.title || "Untitled Blueprint",
    stepsCount: blueprint.steps_count || 0,
    details: blueprint.details || blueprint.description || "No description available",
    isVerified: blueprint.is_verified || false,
    cloneCount: blueprint.clone_count || 0,
    lastUpdated: blueprint.updated_at ? formatRelativeDate(blueprint.updated_at) : "recently"
  }))
  
  return (
    <div className="flex flex-col w-full max-w-screen-xl mx-auto gap-8 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold">Blueprints</h1>
          <p className="text-muted-foreground mt-1">Create and manage your AI automation blueprints</p>
        </div>
        <div className="flex gap-2">
          <CreateBlueprintButton />
        </div>
      </div>
      
      <Card className="rounded-xl">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle>All Blueprints</CardTitle>
          <CardDescription>
            Your saved and generated blueprints
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
              >
                Retry
              </button>
            </div>
          ) : noBlueprints ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">No Blueprints Found</h3>
              <p className="text-muted-foreground mb-6">
                You don&apos;t have any blueprints yet. Get started by creating your first blueprint.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={createSampleBlueprint} 
                    disabled={isCreatingSample}
                  >
                    {isCreatingSample ? 'Creating...' : 'Create Sample Blueprint (Debug)'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will create a sample blueprint directly in the database for testing.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <BlueprintsSection blueprints={formattedBlueprints} />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 