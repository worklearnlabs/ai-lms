import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/utils/utils";

interface DebugWindowProps {
  blueprintData: Record<string, unknown>;
  apiDebugData?: {
    openaiRequest?: Record<string, unknown>;
    openaiResponse?: Record<string, unknown>;
    perplexityRequest?: Record<string, unknown>;
    perplexityResponse?: Record<string, unknown>;
    blueprintCreationRequest?: Record<string, unknown>;
    blueprintCreationResponse?: Record<string, unknown>;
    error?: string;
  };
  onRefresh?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
}

export function BlueprintDebugWindow({ 
  blueprintData, 
  apiDebugData, 
  onRefresh, 
  onClose, 
  isLoading 
}: DebugWindowProps) {
  const [activeView, setActiveView] = useState<'blueprint' | 'api-flow'>('blueprint');
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = () => {
    const textToCopy = activeView === 'blueprint' 
      ? JSON.stringify(blueprintData, null, 2)
      : JSON.stringify(apiDebugData, null, 2);
    
    if (!textToCopy) return;
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
      })
      .catch((error) => {
        console.error("Failed to copy data:", error);
      });
  };

  return (
    <div className="mt-4 relative p-3 bg-slate-900 text-white text-xs rounded-md max-h-[500px] font-mono overflow-hidden">
      {/* Sticky header with buttons that stays on top when scrolling */}
      <div className="sticky top-0 right-0 z-20 flex justify-between bg-slate-900/95 backdrop-blur-sm py-1 mb-2 border-b border-slate-700">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveView('blueprint')}
            className={`px-3 py-1 rounded text-xs ${activeView === 'blueprint' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            Blueprint Data
          </button>
          <button 
            onClick={() => setActiveView('api-flow')}
            className={`px-3 py-1 rounded text-xs ${activeView === 'api-flow' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            API Flow Debug
          </button>
        </div>
        <div className="flex space-x-1">
          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-slate-800 hover:bg-slate-700 text-slate-200"
              onClick={onRefresh}
              title="Refresh debug data"
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 bg-slate-800 hover:bg-slate-700 text-slate-200"
            onClick={copyToClipboard}
            title="Copy debug data to clipboard"
          >
            {hasCopied ? 
              <Check className="h-4 w-4" /> : 
              <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="overflow-auto max-h-[460px]">
        {activeView === 'blueprint' && (
          <>
            {typeof blueprintData === 'object' && 'message' in blueprintData ? (
              <div className="p-4 bg-slate-800/50 rounded mb-4">
                <p className="text-blue-300 text-sm">{String(blueprintData.message)}</p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap">{JSON.stringify(blueprintData, null, 2)}</pre>
            )}
          </>
        )}
        
        {activeView === 'api-flow' && (
          <div className="space-y-4">
            {!apiDebugData && (
              <p className="text-gray-400">No API debug data available yet. Complete the form to see the API flow.</p>
            )}
            
            {apiDebugData?.error && (
              <div className="p-4 bg-red-900/30 text-red-300 rounded mb-4">
                <h4 className="font-bold">Error</h4>
                <pre className="whitespace-pre-wrap">{JSON.stringify(apiDebugData.error, null, 2)}</pre>
              </div>
            )}
            
            {apiDebugData?.openaiRequest && (
              <div className="p-4 bg-slate-800/50 rounded mb-4">
                <h4 className="font-bold mb-2">OpenAI Request</h4>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {JSON.stringify(apiDebugData.openaiRequest, null, 2)}
                </pre>
              </div>
            )}
            
            {apiDebugData?.openaiResponse && (
              <div className="p-4 bg-blue-900/30 text-blue-200 rounded mb-4">
                <h4 className="font-bold mb-2">OpenAI Response</h4>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {JSON.stringify(apiDebugData.openaiResponse, null, 2)}
                </pre>
              </div>
            )}
            
            {apiDebugData?.blueprintCreationRequest && (
              <div className="p-4 bg-slate-800/50 rounded mb-4">
                <h4 className="font-bold mb-2">Blueprint Creation Request</h4>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {JSON.stringify(apiDebugData.blueprintCreationRequest, null, 2)}
                </pre>
              </div>
            )}
            
            {apiDebugData?.blueprintCreationResponse && (
              <div className="p-4 bg-purple-900/30 text-purple-200 rounded mb-4">
                <h4 className="font-bold mb-2">Blueprint Creation Response</h4>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {JSON.stringify(apiDebugData.blueprintCreationResponse, null, 2)}
                </pre>
              </div>
            )}
            
            {apiDebugData?.perplexityRequest && (
              <div className="p-4 bg-slate-800/50 rounded mb-4">
                <h4 className="font-bold mb-2">Perplexity Request</h4>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {JSON.stringify(apiDebugData.perplexityRequest, null, 2)}
                </pre>
              </div>
            )}
            
            {apiDebugData?.perplexityResponse && (
              <div className="p-4 bg-green-900/30 text-green-200 rounded mb-4">
                <h4 className="font-bold mb-2">Perplexity Response</h4>
                <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                  {JSON.stringify(apiDebugData.perplexityResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 