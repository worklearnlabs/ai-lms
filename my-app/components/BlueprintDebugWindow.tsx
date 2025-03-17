import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/utils/utils";

// Define the agent data structure to avoid TypeScript errors
interface AgentData {
  reasoning_agent?: {
    inputs?: {
      prompt: string;
      questions_and_answers: Record<string, unknown>;
      user_profile?: {
        skill_level?: string;
        learning_objective?: string;
      }
    };
    outputs?: {
      search_query: string;
      search_instruction_analysis?: string;
      output_format_analysis?: string;
    };
  };
  research_agent?: {
    inputs?: {
      search_query: string;
      context?: string;
    };
    expected_output_format?: {
      structure: string;
      example?: string;
    };
  };
}

interface DebugWindowProps {
  blueprintData: Record<string, unknown> & {
    agents?: AgentData;
  };
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
  isLoading?: boolean;
}

export function BlueprintDebugWindow({ 
  blueprintData, 
  apiDebugData, 
  onRefresh, 
  isLoading 
}: DebugWindowProps) {
  const [activeView, setActiveView] = useState<'blueprint' | 'api-flow' | 'agent-flow'>('blueprint');
  const [hasCopied, setHasCopied] = useState(false);
  
  // Check if we have agent data in the debug info
  const hasAgentData = blueprintData && 'agents' in blueprintData;
  const agents = (blueprintData?.agents || {}) as AgentData;

  const copyToClipboard = () => {
    const textToCopy = activeView === 'blueprint' 
      ? JSON.stringify(blueprintData, null, 2)
      : activeView === 'api-flow' 
        ? JSON.stringify(apiDebugData, null, 2)
        : JSON.stringify(blueprintData?.agents || {}, null, 2);
    
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
    <div className="mt-4 relative p-3 bg-slate-900 text-white text-xs rounded-md max-h-[90vh] font-mono overflow-hidden">
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
          {hasAgentData && (
            <button 
              onClick={() => setActiveView('agent-flow')}
              className={`px-3 py-1 rounded text-xs ${activeView === 'agent-flow' ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              Agent Data Flow
            </button>
          )}
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
      <div className="overflow-auto max-h-[calc(90vh-60px)]">
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
        
        {activeView === 'agent-flow' && hasAgentData && (
          <div className="space-y-4">
            {/* Reasoning Agent Section */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-blue-300 mb-2 uppercase border-b border-blue-800 pb-1">Reasoning Agent</h3>
              
              {/* Inputs */}
              <div className="p-4 bg-slate-800/50 rounded mb-4">
                <h4 className="font-bold mb-2 text-blue-200">Inputs</h4>
                {agents.reasoning_agent?.inputs ? (
                  <div>
                    <div className="mb-3">
                      <span className="text-gray-400">Prompt: </span>
                      <span className="text-blue-300">{String(agents.reasoning_agent.inputs.prompt)}</span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-gray-400">User Profile: </span>
                      <div className="pl-4 border-l-2 border-gray-700 mt-1">
                        <div><span className="text-gray-400">Skill Level: </span>{String(agents.reasoning_agent.inputs.user_profile?.skill_level)}</div>
                        <div><span className="text-gray-400">Learning Objective: </span>{String(agents.reasoning_agent.inputs.user_profile?.learning_objective)}</div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Q&A Pairs:</span>
                      <div className="mt-2 pl-4 border-l-2 border-gray-700">
                        <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                          {JSON.stringify(agents.reasoning_agent.inputs.questions_and_answers, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No reasoning agent inputs available</p>
                )}
              </div>
              
              {/* Outputs */}
              <div className="p-4 bg-blue-900/30 text-blue-200 rounded mb-4">
                <h4 className="font-bold mb-2">Outputs</h4>
                {agents.reasoning_agent?.outputs ? (
                  <div>
                    <div className="mb-3">
                      <h5 className="text-xs font-bold text-blue-300 mb-1">Search Query:</h5>
                      <div className="pl-4 border-l-2 border-blue-700 py-2 bg-blue-950/30 rounded">
                        {String(agents.reasoning_agent.outputs.search_query)}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <h5 className="text-xs font-bold text-blue-300 mb-1">Search Query Analysis:</h5>
                      <div className="pl-4 border-l-2 border-blue-700 mt-1">
                        <div><span className="text-gray-400">Instructions: </span>{String(agents.reasoning_agent.outputs.search_instruction_analysis)}</div>
                        <div><span className="text-gray-400">Output Format: </span>{String(agents.reasoning_agent.outputs.output_format_analysis)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No reasoning agent outputs available yet</p>
                )}
              </div>
            </div>
            
            {/* Research Agent Section */}
            <div>
              <h3 className="text-sm font-bold text-green-300 mb-2 uppercase border-b border-green-800 pb-1">Research Agent</h3>
              
              {/* Expected Inputs */}
              <div className="p-4 bg-slate-800/50 rounded mb-4">
                <h4 className="font-bold mb-2 text-green-200">Expected Inputs</h4>
                {agents.research_agent?.inputs ? (
                  <div>
                    <div className="mb-3">
                      <span className="text-gray-400">Search Query: </span>
                      <div className="pl-4 border-l-2 border-gray-700 py-2 bg-slate-800/50 rounded mt-1">
                        {String(agents.research_agent.inputs.search_query)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No research agent inputs available - search query needs to be generated first</p>
                )}
              </div>
              
              {/* Expected Output Format */}
              <div className="p-4 bg-green-900/30 text-green-200 rounded">
                <h4 className="font-bold mb-2">Expected Output Format</h4>
                {agents.research_agent?.expected_output_format ? (
                  <div>
                    <div className="mb-2">
                      <span className="text-gray-400">Structure: </span>
                      {String(agents.research_agent.expected_output_format.structure)}
                    </div>
                    <div>
                      <span className="text-gray-400">Example:</span>
                      <div className="mt-2 pl-4 border-l-2 border-green-700 py-2 bg-green-950/30 rounded">
                        <pre className="whitespace-pre-wrap overflow-auto max-h-60">
                          {String(agents.research_agent.expected_output_format.example)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No output format information available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 