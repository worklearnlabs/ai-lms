"use client";

import { Card } from "@/components/ui/card";
import { ContentItem } from "../types";

interface BlueprintContentProps {
  content: ContentItem[];
}

export default function BlueprintContent({ content }: BlueprintContentProps) {
  const renderContent = (item: ContentItem, index: number) => {
    switch (item.type) {
      case 'heading':
        return (
          <h2 key={index} className="text-xl font-bold mt-6 mb-3 first:mt-0">
            {item.content}
          </h2>
        );
        
      case 'paragraph':
        return (
          <p key={index} className="text-base my-3 text-muted-foreground">
            {item.content}
          </p>
        );
        
      case 'list':
        return (
          <ul key={index} className="list-disc pl-6 my-4 space-y-2">
            {item.items?.map((listItem, listIndex) => (
              <li key={`${index}-${listIndex}`} className="text-base text-muted-foreground">
                {listItem}
              </li>
            ))}
          </ul>
        );
        
      case 'code':
        return (
          <pre key={index} className="bg-muted p-4 rounded-md my-4 overflow-x-auto">
            <code className="text-sm">{item.content}</code>
          </pre>
        );
        
      case 'image':
        return (
          <div key={index} className="my-4">
            <img 
              src={item.url} 
              alt={item.altText || 'Blueprint image'} 
              className="rounded-md max-w-full h-auto" 
            />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {content.map(renderContent)}
      </div>
    </Card>
  );
} 