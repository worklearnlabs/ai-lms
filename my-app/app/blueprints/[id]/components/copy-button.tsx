"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useState } from "react";

interface CopyButtonProps {
  textToCopy: string;
}

export default function CopyButton({ textToCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = () => {
    // Copy the blueprint URL or provided text to clipboard
    navigator.clipboard.writeText(textToCopy || window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 w-8 p-0 rounded-full"
      title={copied ? "Copied!" : "Copy blueprint URL"}
      onClick={handleCopyClick}
    >
      <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
    </Button>
  );
} 