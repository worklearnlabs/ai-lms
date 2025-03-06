"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BlueprintsSection } from "@/components/dashboard/blueprints-section"
import { CreateBlueprintButton } from "./components/create-blueprint-button"
import { getBlueprints, Blueprint } from "@/utils/models"
import { Skeleton } from "@/components/ui/skeleton"
import { formatRelativeTime } from "@/utils/misc"

// Create a wrapper function to handle string dates
function formatRelativeDate(dateString: string): string {
  return formatRelativeTime(new Date(dateString));
}

export default function BlueprintsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBlueprints() {
      try {
        setLoading(true)
        // In a real app, you'd get the user ID from auth context
        const userId = "user-1"
        const data = await getBlueprints(userId)
        setBlueprints(data)
        setError(null)
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
    stepsCount: blueprint.stepsCount,
    details: blueprint.details,
    isVerified: blueprint.isVerified,
    cloneCount: blueprint.cloneCount,
    lastUpdated: formatRelativeDate(blueprint.updatedAt)
  }))

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Blueprints</h1>
          <p className="text-muted-foreground">View and manage your custom AI workflow blueprints</p>
        </div>
        <div className="flex space-x-2">
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
          ) : (
            <BlueprintsSection blueprints={formattedBlueprints} />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 