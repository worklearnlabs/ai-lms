"use client";

import dynamic from "next/dynamic";

// Load TestButton component dynamically to avoid build issues
const TestButton = dynamic(() => import("./test-button"), {
  ssr: false,
  loading: () => null
});

export default function TestButtonWrapper() {
  return <TestButton />;
} 