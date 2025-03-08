"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ContentItem } from "../types";

// Import properties but not the component itself to avoid type errors
type ClientWrapperProps = {
  blueprintId: string;
  originalPrompt: string;
  content: ContentItem[];
};

// Dynamically import the client wrapper component
const ClientWrapper = dynamic<ClientWrapperProps>(
  () => import("./client-wrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6">
          {/* Fixed title with view toggle placeholder */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Implementation Plan</h2>
            <div className="h-10 w-28 rounded-md bg-muted/20 animate-pulse"></div>
          </div>
          
          {/* Loading skeleton with flow view option */}
          <div className="flex items-center justify-center h-[calc(100vh-180px)] border rounded-lg bg-muted/5">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted/20 animate-pulse mx-auto"></div>
              <div className="text-sm text-muted-foreground">
                <div className="animate-pulse">Loading blueprint visualization...</div>
                <p className="text-xs mt-2">Flow diagram will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

export default function ClientWrapperContainer({
  blueprintId,
  originalPrompt,
  content,
}: ClientWrapperProps) {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <ClientWrapper
        blueprintId={blueprintId}
        originalPrompt={originalPrompt}
        content={content}
      />
    </Suspense>
  );
} 