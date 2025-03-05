"use client";

import { BlueprintProvider } from "./context/blueprint-context";

export default function BlueprintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BlueprintProvider>
      {children}
    </BlueprintProvider>
  );
} 