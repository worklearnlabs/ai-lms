import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw, CheckCircle, XCircle } from "lucide-react";
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
    status?: 'pending' | 'passed' | 'failed';
  };
  research_agent?: {
    inputs?: {
      search_query: string;
      context?: string;
    };
    outputs?: {
      structured_data?: Record<string, unknown>;
      raw_data?: string;
    }
    expected_output_format?: {
      structure: string;
      example?: string;
    };
    status?: 'pending' | 'passed' | 'failed';
  };
}

interface DebugWindowProps {
  blueprintData: Record<string, unknown> & {
    agents?: AgentData;
    status?: 'pending' | 'passed' | 'failed';
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
  const [activeView, setActiveView] = useState<'blueprint' | 'reasoning' | 'research'>('blueprint');
  const [hasCopied, setHasCopied] = useState(false);
  
  // Check if we have agent data in the debug info
  const agents = (blueprintData?.agents || {}) as AgentData;

  const copyToClipboard = () => {
    const textToCopy = activeView === 'blueprint' 
      ? JSON.stringify(blueprintData, null, 2)
      : activeView === 'reasoning' 
        ? JSON.stringify(agents.reasoning_agent || {}, null, 2)
        : JSON.stringify(agents.research_agent || {}, null, 2);
    
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

  // Status indicator component
  const StatusIndicator = ({ status }: { status?: 'pending' | 'passed' | 'failed' }) => {
    if (status === 'passed') {
      return <span className="flex items-center text-green-500"><CheckCircle className="w-4 h-4 mr-1" /> Passed</span>;
    } else if (status === 'failed') {
      return <span className="flex items-center text-red-500"><XCircle className="w-4 h-4 mr-1" /> Failed</span>;
    }
    return <span className="flex items-center text-yellow-500">⏳ Pending</span>;
  };

  // Get question and response counts
  const questionCount = Array.isArray(blueprintData?.questions) 
    ? blueprintData.questions.length 
    : 0;
  
  const responseCount = blueprintData?.responses 
    ? Object.keys(blueprintData.responses).length 
    : 0;

  return (
    <div className="mt-4 relative p-3 bg-slate-900 text-white text-xs rounded-md max-h-[90vh] font-mono overflow-hidden">
      {/* Sticky header with buttons that stays on top when scrolling */}
      <div className="sticky top-0 right-0 z-20 flex justify-between bg-slate-900/95 backdrop-blur-sm py-1 mb-2 border-b border-slate-700">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveView('blueprint')}
            className={`px-3 py-1 rounded text-xs ${activeView === 'blueprint' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            1. Blueprint Data
          </button>
          <button 
            onClick={() => setActiveView('reasoning')}
            className={`px-3 py-1 rounded text-xs ${activeView === 'reasoning' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            2. Reasoning
          </button>
          <button 
            onClick={() => setActiveView('research')}
            className={`px-3 py-1 rounded text-xs ${activeView === 'research' ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            3. Research
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
      <div className="overflow-auto max-h-[calc(90vh-60px)]">
        {/* BLUEPRINT TAB */}
        {activeView === 'blueprint' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold">Basic Blueprint Information</h4>
                <StatusIndicator status={blueprintData?.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <div className="text-gray-400">Blueprint ID:</div>
                  <div className="text-blue-300 break-all">{String(blueprintData?.id || blueprintData?.blueprint_id || 'Not available')}</div>
                </div>
                
                <div className="col-span-2 mt-2">
                  <div className="text-gray-400">Title:</div>
                  <div>{String(blueprintData?.title || 'Not available')}</div>
                </div>
                
                <div className="col-span-2 mt-2">
                  <div className="text-gray-400">Prompt:</div>
                  <div className="bg-slate-700/50 p-2 rounded mt-1 whitespace-pre-wrap">
                    {String(blueprintData?.prompt || 'Not available')}
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="text-gray-400">Questions in DB:</div>
                  <div>{questionCount}</div>
                </div>
                
                <div className="mt-2">
                  <div className="text-gray-400">Answers in DB:</div>
                  <div>{responseCount}</div>
                </div>
                
                <div className="mt-2">
                  <div className="text-gray-400">Is Temporary:</div>
                  <div>{blueprintData?.is_temporary === true ? 'Yes' : 'No'}</div>
                </div>
                
                <div className="mt-2">
                  <div className="text-gray-400">Skill Level:</div>
                  <div>{String(blueprintData?.skill_level || 'Not specified')}</div>
                </div>
                
                <div className="col-span-2 mt-2">
                  <div className="text-gray-400">Learning Objective:</div>
                  <div>{String(blueprintData?.learning_objective || 'Not specified')}</div>
                </div>
              </div>
            </div>
            
            {/* Full data dump for reference */}
            <div className="p-4 bg-slate-800/20 rounded">
              <div className="mb-2 text-gray-400">Full Blueprint Data:</div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(blueprintData, null, 2)}</pre>
            </div>
          </div>
        )}
        
        {/* REASONING TAB */}
        {activeView === 'reasoning' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-900/30 text-blue-200 rounded mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold">Reasoning Agent</h4>
                <StatusIndicator status={agents.reasoning_agent?.status} />
              </div>
              
              {/* Inputs Section */}
              <div className="mb-4">
                <h5 className="font-semibold text-blue-300 mb-2">Input</h5>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-400">User Profile:</div>
                    <div className="bg-blue-950/30 p-2 rounded mt-1">
                      <div><span className="text-gray-400">Skill Level: </span>{String(agents.reasoning_agent?.inputs?.user_profile?.skill_level || 'Not specified')}</div>
                      <div><span className="text-gray-400">Learning Objective: </span>{String(agents.reasoning_agent?.inputs?.user_profile?.learning_objective || 'Not specified')}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Constructed Prompt:</div>
                    <div className="bg-blue-950/30 p-2 rounded mt-1 whitespace-pre-wrap">
                      {String(agents.reasoning_agent?.inputs?.prompt || 'Not available')}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400">Q&A Pairs:</div>
                    <div className="bg-blue-950/30 p-2 rounded mt-1 overflow-auto max-h-40">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(agents.reasoning_agent?.inputs?.questions_and_answers || 'Not available', null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Outputs Section */}
              <div>
                <h5 className="font-semibold text-blue-300 mb-2">Output</h5>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-400">Search Query:</div>
                    <div className="bg-blue-950/30 p-2 rounded mt-1 whitespace-pre-wrap">
                      {String(agents.reasoning_agent?.outputs?.search_query || 'Not generated yet')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Full reasoning data dump */}
            <div className="p-4 bg-slate-800/20 rounded">
              <div className="mb-2 text-gray-400">Full Reasoning Agent Data:</div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(agents.reasoning_agent, null, 2)}</pre>
            </div>
          </div>
        )}
        
        {/* RESEARCH TAB */}
        {activeView === 'research' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-900/30 text-green-200 rounded mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold">Research Agent</h4>
                <StatusIndicator status={agents.research_agent?.status} />
              </div>
              
              {/* Inputs Section */}
              <div className="mb-4">
                <h5 className="font-semibold text-green-300 mb-2">Input</h5>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-400">Search Query:</div>
                    <div className="bg-green-950/30 p-2 rounded mt-1 whitespace-pre-wrap">
                      {String(agents.research_agent?.inputs?.search_query || 'Not available')}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Outputs Section */}
              <div>
                <h5 className="font-semibold text-green-300 mb-2">Output</h5>
                <div className="space-y-2">
                  <div>
                    <div className="text-gray-400">Structured JSON:</div>
                    <div className="bg-green-950/30 p-2 rounded mt-1 overflow-auto max-h-60">
                      <pre className="whitespace-pre-wrap">
                        {agents.research_agent?.outputs?.structured_data 
                          ? JSON.stringify(agents.research_agent.outputs.structured_data, null, 2) 
                          : (agents.research_agent?.outputs?.raw_data || 'Not generated yet')}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Full research data dump */}
            <div className="p-4 bg-slate-800/20 rounded">
              <div className="mb-2 text-gray-400">Full Research Agent Data:</div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(agents.research_agent, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 