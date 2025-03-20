"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import the BlueprintResearch component with ssr:false
// This is allowed here because this is a client component
const DynamicBlueprintResearch = dynamic(
  () => import("./blueprint-research"),
  { 
    ssr: false,
    loading: () => <ResearchLoadingSkeleton />
  }
);

interface BlueprintResearchTabProps {
  blueprintId: string;
}

// Loading skeleton component
function ResearchLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-[250px]" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-[300px]" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export default function BlueprintResearchTab({ blueprintId }: BlueprintResearchTabProps) {
  return (
    <Suspense fallback={<ResearchLoadingSkeleton />}>
      <DynamicBlueprintResearch blueprintId={blueprintId} />
    </Suspense>
  );
} 