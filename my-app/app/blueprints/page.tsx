"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BlueprintsSection } from "@/components/dashboard/blueprints-section"
import { CreateBlueprintButton } from "./components/create-blueprint-button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelativeTime } from "@/utils/misc"
import { createClientSupabase } from "@/utils/supabase"
import { Button } from "@/components/ui/button"
import { CreateBlueprintModal } from "./components/create-blueprint-modal"
import { blueprintApi } from "@/utils/blueprints-api"
import { useSearchParams } from "next/navigation"
import { Trash2 } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { toast } from "sonner"

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

// Create a wrapper component for the search params functionality
function BlueprintSearchParamsHandler({ onTemporaryBlueprint }: { onTemporaryBlueprint: (id: string) => void }) {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const tempId = searchParams.get('temporaryBlueprintId');
    if (tempId) {
      onTemporaryBlueprint(tempId);
    }
  }, [searchParams, onTemporaryBlueprint]);
  
  return null;
}

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noBlueprints, setNoBlueprints] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [temporaryBlueprintId, setTemporaryBlueprintId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBlueprints, setSelectedBlueprints] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false)

  const handleTemporaryBlueprint = (tempId: string) => {
    console.log("Temporary blueprint ID found in URL:", tempId);
    setTemporaryBlueprintId(tempId);
    setIsModalOpen(true);
  };

  // Log authentication status for debugging
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientSupabase();
        const { data } = await supabase.auth.getUser();
        console.log("🔐 Blueprints Auth:", data.user ? 
          `Authenticated as ${data.user.id}` : 
          "Not authenticated");
        
        // Temporary blueprint cleanup logic removed - this was legacy code
        // that conflicts with the new workspace-based architecture
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
              updated_at: !!firstBlueprint.updated_at,
              is_temporary: !!firstBlueprint.is_temporary
            });
          }
          
          // Log temporary blueprints for debugging
          const temporaryBlueprints = data.filter(blueprint => blueprint.is_temporary === true);
          if (temporaryBlueprints.length > 0) {
            console.log(`Found ${temporaryBlueprints.length} temporary blueprint(s):`, 
              temporaryBlueprints.map(bp => ({
                id: bp.id,
                title: bp.title,
                is_temporary: bp.is_temporary
              }))
            );
          }
          
          // Include ALL blueprints, including temporary ones
          setBlueprints(data);
          setNoBlueprints(data.length === 0);
          
          // Log ALL blueprints with their temporary status for debugging
          console.log("All blueprints with temporary status:", 
            data.map(bp => ({
              id: bp.id,
              title: bp.title,
              is_temporary: bp.is_temporary || false,
              has_temporary_in_title: bp.title?.toLowerCase().includes('temporary'),
              mismatch: (bp.is_temporary || false) !== bp.title?.toLowerCase().includes('temporary')
            }))
          );
          
          // Log blueprints where the temporary flag doesn't match the title
          const mismatchedBlueprints = data.filter(bp => 
            (bp.is_temporary || false) !== bp.title?.toLowerCase().includes('temporary')
          );
          
          if (mismatchedBlueprints.length > 0) {
            console.log("⚠️ Found blueprints where 'temporary' in title doesn't match is_temporary flag:", 
              mismatchedBlueprints.map(bp => ({
                id: bp.id,
                title: bp.title,
                is_temporary: bp.is_temporary || false
              }))
            );
          }
          
          // Just log temporary blueprints for debugging but don't automatically open the modal
          const temporaryBlueprint = data.find((blueprint) => blueprint.is_temporary === true);
          if (temporaryBlueprint) {
            console.log("Found temporary blueprint:", temporaryBlueprint.id);
            console.log("Temporary blueprint details:", JSON.stringify(temporaryBlueprint, null, 2));
            // We no longer automatically open the modal here - only URL params should trigger it
          } else {
            console.log("No temporary blueprints found in the response");
          }
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
    setIsCreating(true);
    try {
      const supabase = createClientSupabase();
      const { data: userData } = await supabase.auth.getUser();
      
      // Set up sample blueprint template
      const sampleBlueprint = {
        title: "Social Media Automation",
        description: "A workflow to automate social media posting across platforms.",
        content: {
          questions: [
            { id: 1, title: "Platforms", content: "Which social media platforms do you need to automate?" },
            { id: 2, title: "Content Type", content: "What kind of content do you typically share?" },
            { id: 3, title: "Frequency", content: "How often do you need to post content?" }
          ],
          responses: {
            "1": "Twitter, LinkedIn, Facebook",
            "2": "Blog articles, company news, and industry trends",
            "3": "2-3 times per week"
          }
        },
        prompt: "Create a workflow to automate posting to Twitter, LinkedIn, and Facebook, sharing blog articles, company news, and industry trends 2-3 times per week.",
        search_query: "Social media automation workflow for Twitter, LinkedIn, and Facebook",
        visibility: "private",
        skill_level: "beginner",
        user_skill_level: "beginner",
        blueprint_learning_focus: "Learn automation with APIs",
        complexity: "low",
        is_temporary: false,
        user_id: userData.user?.id
      };
      
      // Create sample blueprint via API
      const response = await fetch('/api/blueprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sampleBlueprint),
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
      setIsCreating(false);
    }
  }
  
  // Function to create a temporary blueprint for testing
  async function createTemporaryBlueprint() {
    setIsCreating(true);
    try {
      console.log('Creating temporary blueprint...');
      
      // Get the authenticated user
      const supabase = createClientSupabase();
      const { data: authData } = await supabase.auth.getUser();
      
      if (!authData.user) {
        console.error('Authentication required to create a blueprint');
        alert('You need to be logged in to create a blueprint');
        setIsCreating(false);
        return;
      }
      
      const userId = authData.user.id;
      
      // Create a temporary blueprint for in-progress creation workflow
      const tempBlueprint = {
        title: 'Untitled Blueprint',
        prompt: '',
        content: {}, // Empty content to start
        visibility: 'private' as const,
        skill_level: 'beginner' as const,
        user_skill_level: 'beginner' as const,
        learning_objective: '',
        blueprint_learning_focus: '',
        is_temporary: true,
        user_id: userId
      };
      
      // Create temporary blueprint via API
      const response = await fetch('/api/blueprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tempBlueprint),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create temporary blueprint: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Temporary blueprint created:", data);
      
      // Reload the page to show the new blueprint
      window.location.reload();
    } catch (error) {
      console.error("Error creating temporary blueprint:", error);
      alert("Failed to create temporary blueprint. See console for details.");
    } finally {
      setIsCreating(false);
    }
  }

  // Handle bulk delete
  const handleBulkDeleteClick = () => {
    if (selectedBlueprints.length === 0) {
      toast.warning("Please select at least one blueprint to delete");
      return;
    }
    
    setShowDeleteConfirmation(true);
  };

  // Handle the bulk delete after confirmation
  const handleConfirmedBulkDeletion = async () => {
    if (selectedBlueprints.length === 0) return;
    
    try {
      setIsDeletingMultiple(true);
      
      // Create an array to track deletion results
      const results = [];
      
      // Process each selected blueprint
      for (const blueprintId of selectedBlueprints) {
        // Find the blueprint title for better user feedback
        const blueprint = blueprints.find(b => b.id === blueprintId);
        const blueprintTitle = blueprint?.title || "Untitled";
        
        try {
          // Delete the blueprint
          console.log(`Initiating deletion for blueprint: ${blueprintId} (${blueprintTitle})`);
          const response = await blueprintApi.deleteBlueprint(blueprintId);
          
          if (response && response.success) {
            console.log(`Successfully deleted blueprint: ${blueprintId} (${blueprintTitle})`);
            results.push({
              id: blueprintId,
              title: blueprintTitle,
              success: true
            });
          } else {
            // Handle error in response object format
            const errorMessage = response?.error || "Deletion returned unsuccessful status";
            console.log(`Error deleting blueprint ${blueprintId}:`, errorMessage);
            
            results.push({
              id: blueprintId,
              title: blueprintTitle,
              success: false,
              error: errorMessage
            });
          }
        } catch (error) {
          // This should only happen if there's an exception during the deleteBlueprint call itself
          // The function should normally return an error object instead of throwing
          console.log(`Exception during deletion of blueprint ${blueprintId}:`, error);
          
          const errorMessage = error instanceof Error ? error.message : 
                               typeof error === 'string' ? error : 
                               'Unknown error during deletion';
          
          results.push({
            id: blueprintId,
            title: blueprintTitle,
            success: false,
            error: errorMessage
          });
        }
      }
      
      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      // First, close the confirmation dialog
      setShowDeleteConfirmation(false);
      
      // Then exit selection mode
      setSelectionMode(false);
      setSelectedBlueprints([]);
      
      // Show toast notification with appropriate message
      if (failureCount === 0) {
        toast.success(
          `Successfully deleted ${successCount} blueprint${successCount !== 1 ? 's' : ''}`
        );
      } else if (successCount === 0) {
        toast.error(
          `Failed to delete ${failureCount} blueprint${failureCount !== 1 ? 's' : ''}`
        );
      } else {
        toast.warning(
          `Deleted ${successCount} blueprint${successCount !== 1 ? 's' : ''}, but failed to delete ${failureCount}`
        );
      }
      
      // Reload the page to refresh the blueprint list
      // We use setTimeout to ensure the toast is visible first
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.log("Bulk deletion operation error:", error);
      toast.error("An error occurred during the deletion process");
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  // Cancel selection mode
  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedBlueprints([]);
  };

  // Handle selection change from BlueprintsSection
  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedBlueprints(selectedIds);
  };

  // Transform Blueprint to format expected by BlueprintsSection
  // Now include temporary blueprints but mark them specially
  const formattedBlueprints = blueprints.map(blueprint => ({
    id: blueprint.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
    title: blueprint.title || "Untitled Blueprint",
    stepsCount: blueprint.steps_count || 0,
    details: blueprint.details || blueprint.description || "No description available",
    isVerified: blueprint.is_verified || false,
    cloneCount: blueprint.clone_count || 0,
    lastUpdated: blueprint.updated_at ? formatRelativeDate(blueprint.updated_at) : "recently",
    isTemporary: blueprint.is_temporary || false
  }));
  
  // Handle clicking on a temporary blueprint to open the modal
  const handleBlueprintClick = (blueprintId: string, isTemporary: boolean) => {
    console.log("📣 handleBlueprintClick called with:", { blueprintId, isTemporary });
    
    if (isTemporary) {
      console.log("🔶 Opening temporary blueprint in modal:", blueprintId);
      
      // For temporary blueprints:
      // 1. Set the ID to be loaded by the modal component
      setTemporaryBlueprintId(blueprintId);
      
      // 2. Open the modal to continue editing where the user left off
      setIsModalOpen(true);
      
      console.log("🔷 Modal state updated:", { temporaryBlueprintId: blueprintId, isModalOpen: true });
      return;
    }
    
    console.log("Regular blueprint - navigation handled by Next.js Link component");
    // For regular blueprints, navigation is handled by the Next.js Link component
    // No action needed here as the Link component will handle the routing
  };

  // Handle blueprint creation callback
  const handleBlueprintCreated = async (blueprintId: string) => {
    console.log("✅ Blueprint created successfully with ID:", blueprintId);
    
    // Always close the modal first
    setIsModalOpen(false);
    
    // Refresh the blueprints list without a full page reload
    try {
      setLoading(true);
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // Maximum retry attempts if we don't find the new blueprint
      const maxRetries = 3;
      let retryCount = 0;
      let newBlueprintFound = false;
      
      // Retry function that will attempt to refresh until we find the new blueprint
      const attemptRefresh = async (): Promise<void> => {
        if (retryCount >= maxRetries) {
          console.warn(`Maximum retries (${maxRetries}) reached. Blueprint may not appear immediately.`);
          toast.info("Blueprint created successfully, but may not appear in the list yet. Refresh the page if needed.");
          return;
        }
        
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const apiUrl = isDevelopment 
          ? `/api/blueprints?fetchAll=true&t=${timestamp}` 
          : `/api/blueprints?t=${timestamp}`;
        
        console.log(`Refreshing blueprint list (attempt ${retryCount + 1}) from: ${apiUrl}`);
        
        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          console.log(`Received ${data.length} blueprints from API`);
          
          // Check if our newly created blueprint is in the list
          newBlueprintFound = data.some((b: Blueprint) => b.id === blueprintId);
          console.log(`Created blueprint (${blueprintId}) found in response: ${newBlueprintFound}`);
          
          // Update state with new data
          setBlueprints(data);
          setNoBlueprints(data.length === 0);
          
          // If we didn't find the new blueprint, try again after a delay
          if (!newBlueprintFound && blueprintId) {
            retryCount++;
            console.log(`Blueprint not found, retrying in ${500 * retryCount}ms (attempt ${retryCount})`);
            setTimeout(attemptRefresh, 500 * retryCount); // Increasing backoff delay
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error("Error in refresh attempt:", error);
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(attemptRefresh, 500 * retryCount);
          } else {
            setLoading(false);
            toast.error("Error refreshing blueprint list. Please reload the page.");
          }
        }
      };
      
      // Start the first attempt
      await attemptRefresh();
    } catch (err) {
      console.error("Error in handleBlueprintCreated:", err);
      setLoading(false);
      toast.error("Blueprint created but list refresh failed. Please reload the page.");
    }
  };
  
  return (
    <>
      <Suspense fallback={null}>
        <BlueprintSearchParamsHandler onTemporaryBlueprint={handleTemporaryBlueprint} />
      </Suspense>
      <div className="flex flex-col w-full max-w-screen-xl mx-auto gap-8 p-4 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold">Blueprints</h1>
            <p className="text-muted-foreground mt-1">Create and manage your AI automation blueprints</p>
          </div>
          <div className="flex gap-2">
            {!selectionMode && <CreateBlueprintButton />}
          </div>
        </div>
        
        {/* Create Blueprint Modal */}
        <CreateBlueprintModal 
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          temporaryBlueprintId={temporaryBlueprintId}
          onBlueprintCreated={handleBlueprintCreated}
        />
        
        {/* Bulk Delete Confirmation Dialog */}
        {showDeleteConfirmation && (
          <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete {selectedBlueprints.length} Blueprints?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {selectedBlueprints.length} selected blueprint{selectedBlueprints.length !== 1 ? 's' : ''}? 
                  This action cannot be undone and all associated data will be permanently removed.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={isDeletingMultiple}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleConfirmedBulkDeletion}
                  disabled={isDeletingMultiple}
                >
                  {isDeletingMultiple ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
        <Card className="rounded-xl">
          <CardHeader className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Blueprints</CardTitle>
                <CardDescription>
                  Your saved and generated blueprints
                </CardDescription>
              </div>
              {selectionMode ? (
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleBulkDeleteClick}
                    disabled={selectedBlueprints.length === 0 || isDeletingMultiple}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedBlueprints.length > 0 ? `(${selectedBlueprints.length})` : ''}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancelSelection}
                    disabled={isDeletingMultiple}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setSelectionMode(true)}
                >
                  Select
                </Button>
              )}
            </div>
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
                  <div className="mt-4 flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      onClick={createSampleBlueprint} 
                      disabled={isCreating}
                      className="mb-2"
                    >
                      {isCreating ? 'Creating...' : 'Create Sample Blueprint (Debug)'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={createTemporaryBlueprint} 
                      disabled={isCreating}
                    >
                      {isCreating ? 'Creating...' : 'Create Temporary Blueprint (Debug)'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      This will create a sample blueprint directly in the database for testing.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <BlueprintsSection 
                blueprints={formattedBlueprints} 
                onBlueprintClick={handleBlueprintClick}
                onSelectionChange={handleSelectionChange}
                selectionEnabled={selectionMode} 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
} 