import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBlueprintById } from "@/utils/models";
import ClientWrapper from "./components/client-wrapper";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import BlueprintActionButton from "./components/blueprint-action-button";
import CopyButton from "./components/copy-button";
import TestButtonWrapper from "./components/test-button-wrapper";
import { ContentItem } from "./types";

// Dummy blueprint content for fallback
const dummyLessonBlueprint = [
  {
    type: "heading",
    content: "Implementation Plan"
  },
  {
    type: "paragraph",
    content: "This is a placeholder for the blueprint content."
  },
  {
    type: "step",
    step: {
      number: 1,
      title: "Getting Started",
      estimatedTime: "15 minutes",
      instructions: "This is a placeholder step. The actual research data will be loaded when available.",
      toolTags: ["Research"],
      completed: false
    }
  }
] as ContentItem[];

// Helper function to construct content with title and description
function constructContentWithHeaders(
  title: string, 
  description: string, 
  existingContent?: ContentItem[]
): ContentItem[] {
  const headerItems: ContentItem[] = [
    {
      type: "heading",
      content: title
    },
    {
      type: "paragraph",
      content: description
    }
  ];
  
  if (!existingContent || existingContent.length === 0) {
    return headerItems;
  }
  
  // Filter out any existing heading or paragraph items to avoid duplicates
  const nonHeaderItems = existingContent.filter(
    item => item.type !== "heading" && item.type !== "paragraph"
  );
  
  return [...headerItems, ...nonHeaderItems];
}

export default async function BlueprintPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id;
  const blueprint = await getBlueprintById(id);

  if (!blueprint) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Blueprint not found</h2>
          <p className="text-muted-foreground">
            We couldn&apos;t find a blueprint with the ID {id}
          </p>
          <Link href="/blueprints" className="inline-block">
            <Button>Go back to Blueprints</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header with blueprint title and status */}
      <div className="p-6 flex items-center justify-between border-b">
        <div className="flex flex-col">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">{blueprint.title}</h1>
            <CopyButton textToCopy={`${blueprint.title}: ${blueprint.details}`} />
            <div className="flex items-center">
              {blueprint.isVerified ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-none">
                  Draft
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            {blueprint.details || "No details available"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TestButtonWrapper />
          <BlueprintActionButton blueprintId={blueprint.id} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <ClientWrapper 
          originalPrompt={blueprint.prompt} 
          content={constructContentWithHeaders(
            blueprint.title, 
            blueprint.details || "No details available", 
            blueprint.content || dummyLessonBlueprint
          )}
          blueprintId={id}
        />
      </div>
    </div>
  );
} 