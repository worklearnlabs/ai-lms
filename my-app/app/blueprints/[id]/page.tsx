import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { getBlueprintById } from "@/utils/models";
import { ContentItem } from "./types";
import BlueprintActionButton from "./components/blueprint-action-button";
import Link from "next/link";
import ClientWrapperContainer from "./components/client-wrapper-container";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function BlueprintPage({ params }: PageProps) {
  // Fetch blueprint from API (this would normally use server actions or API routes)
  const blueprint = await getBlueprintById(params.id);

  // Fallback content if no blueprint is found
  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <h1 className="text-2xl font-bold mb-2">Blueprint Not Found</h1>
        <p className="text-muted-foreground mb-4">The blueprint you&apos;re looking for does not exist or has been removed.</p>
        <Button asChild>
          <Link href="/blueprints">Back to Blueprints</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">{blueprint.title}</h1>
          <div className="flex items-center">
            {blueprint.isVerified ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-none">
                {blueprint.status}
              </Badge>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <BlueprintActionButton blueprintId={blueprint.id} />
      </div>

      {/* Main content - Use client wrapper for view state */}
      <ClientWrapperContainer 
        blueprintId={blueprint.id}
        originalPrompt={blueprint.prompt}
        content={blueprint.content as ContentItem[]}
      />
    </div>
  );
} 