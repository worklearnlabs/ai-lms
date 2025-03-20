import { getBlueprintById } from "@/utils/models";
import ClientWrapper from "./components/client-wrapper";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import BlueprintActionButton from "./components/blueprint-action-button";
import CopyButton from "./components/copy-button";
import TestButtonWrapper from "./components/test-button-wrapper";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function BlueprintPage(props: PageProps) {
  // Await params before accessing its properties
  const params = await props.params;
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
    <div className="flex flex-col h-full">
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
          content={blueprint.content}
        />
      </div>
    </div>
  );
} 