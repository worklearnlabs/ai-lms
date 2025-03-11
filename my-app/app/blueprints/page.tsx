"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BlueprintsSection } from "@/components/dashboard/blueprints-section"
import { CreateBlueprintButton } from "./components/create-blueprint-button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelativeTime } from "@/utils/misc"
import { createClientSupabase } from "@/utils/supabase"

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

        // Use the existing API endpoint that handles user mapping properly
        const response = await fetch('/api/blueprints', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log("API response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched blueprints from API:", data);
        console.log("Number of blueprints received:", Array.isArray(data) ? data.length : "Not an array");
        
        if (!data || data.length === 0) {
          console.log("No blueprints found in API response");
          setBlueprints([]);
          setNoBlueprints(true);
        } else {
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

  // Transform Blueprint to format expected by BlueprintsSection
  const formattedBlueprints = blueprints.map(blueprint => ({
    id: blueprint.id,
    title: blueprint.title,
    stepsCount: blueprint.steps_count || 0,
    details: blueprint.details || '',
    isVerified: blueprint.is_verified || false,
    cloneCount: blueprint.clone_count || 0,
    lastUpdated: formatRelativeDate(blueprint.updated_at || new Date().toISOString())
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
            </div>
          ) : (
            <BlueprintsSection blueprints={formattedBlueprints} />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 