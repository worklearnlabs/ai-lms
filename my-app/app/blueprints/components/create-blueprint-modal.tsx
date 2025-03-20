"use client"

// At the top of the file (after "use client" line):
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  Loader2, 
  RefreshCw,
  Wand2
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/utils/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Add this import at the top of the file
import { post } from '@/utils/fetch-wrapper';

// Import BlueprintDebugWindow at the top of the file
import { BlueprintDebugWindow } from "@/components/BlueprintDebugWindow";
import { useRouter } from "next/navigation";

// Define the BlueprintData interface at the top level so it can be reused
interface BlueprintData {
  id?: string;
  title?: string;
  prompt?: string;
  search_query?: string;
  description?: string;
  details?: string;
  is_temporary?: boolean;
  content?: {
    questions?: Array<{
      id: number;
      title: string;
      content: string;
    }>;
    responses?: Record<string, string>;
  };
  skill_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_time?: string;
  prerequisites?: string[];
}

// Define the questions data type
interface QuestionsData {
  questions?: Array<{
    id: number;
    title: string;
    content: string;
  }>;
  responses?: Record<string, string>;
  error?: string;
  errorDetails?: string;
}

// Debug info interfaces
interface DebugInfoResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  rawText?: string;
  body?: any;
  parseError?: string;
  credentials?: string;
}

interface DebugInfo {
  timestamp: string;
  blueprint_id?: string;
  blueprint_title?: string;
  // For standard API request tracking
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    credentials?: string;
  };
  response: DebugInfoResponse;
  // For agent data flow tracking
  agents?: {
    reasoning_agent?: {
      inputs?: {
        prompt: string;
        questions_and_answers: Record<string, any>;
        user_profile?: {
          skill_level?: string;
          learning_objective?: string;
          user_data_source?: string;
        }
      };
      outputs?: {
        search_query: string;
        search_instruction_analysis?: string;
        output_format_analysis?: string;
        reasoning_process?: string;
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
  };
  api_response_indicates_success?: boolean;
  verification_response?: any;
  verification?: {
    method: string;
    verified_deleted: boolean;
    response: any;
  };
  success?: boolean;
  networkError?: string;
  [key: string]: unknown; // Add index signature to make compatible with Record<string, unknown>
}

interface CreateBlueprintModalProps {
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  temporaryBlueprintId?: string | null;
  onBlueprintCreated?: (blueprintId: string) => void;
}

// Reusable scroll-aware container component that hides the fade effect when at the bottom
function ScrollContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);
  
  // Check scroll position and update fade visibility
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // Hide fade when we're near the bottom (within 20px)
      setShowFade(scrollHeight - scrollTop - clientHeight > 20);
    }
  };
  
  return (
    <div className="relative flex-1 overflow-hidden">
      <div 
        ref={containerRef}
        className={cn("absolute inset-0 overflow-y-auto space-y-4 pb-8", className)}
        onScroll={handleScroll}
      >
        {children}
      </div>
      {showFade && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
      )}
    </div>
  );
}

// Add a helper function to ensure objects are safe for JSON
function makeJsonSafe(obj: any): any {
  // Guard against null or undefined input
  if (obj === null || obj === undefined) {
    console.warn('makeJsonSafe received null or undefined input');
    return {};
  }

  // Handle circular references by creating a clean copy
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Error converting object to JSON:', error);
    
    // For complex objects, create a simplified version by manually copying properties
    if (typeof obj === 'object' && obj !== null) {
      // Handle arrays
      if (Array.isArray(obj)) {
        const result = obj.map(item => {
          try {
            return typeof item === 'object' && item !== null 
              ? makeJsonSafe(item) 
              : item;
          } catch (e) {
            console.warn(`Couldn't process array item: ${e}`);
            return `[Complex object: ${typeof item}]`;
          }
        });
        
        // Return empty array if all items were filtered out
        if (result.length === 0 && obj.length > 0) {
          console.warn('All array items were filtered out during makeJsonSafe');
        }
        return result;
      }
      
      // Handle objects
      const result: Record<string, any> = {};
      let propertiesProcessed = 0;
      
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          try {
            const value = obj[key];
            if (value !== undefined) {
              result[key] = typeof value === 'object' && value !== null 
                ? makeJsonSafe(value) 
                : value;
              propertiesProcessed++;
            }
          } catch (e) {
            console.warn(`Couldn't process property ${key}: ${e}`);
            result[key] = `[Complex value: ${typeof obj[key]}]`;
            propertiesProcessed++;
          }
        }
      }
      
      // Check if we processed any properties
      if (propertiesProcessed === 0 && Object.keys(obj).length > 0) {
        console.warn('All properties were filtered out during makeJsonSafe');
        // Add a special flag to indicate this was originally a non-empty object
        result._originallyNonEmpty = true;
      }
      
      return result;
    }
    
    // For primitives, return as is
    return obj;
  }
}

export function CreateBlueprintModal({ 
  triggerButton,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  temporaryBlueprintId,
  onBlueprintCreated
}: CreateBlueprintModalProps) {
  // Declare state variables
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'prompt' | 'conversation' | 'reason' | 'complete' | 'review'>('prompt');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false); // Separate loading state for answer generation
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currentResponse, setCurrentResponse] = useState("");
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [isExistingBlueprint, setIsExistingBlueprint] = useState(false);
  const [promptChanged, setPromptChanged] = useState(false);
  const [answerLength, setAnswerLength] = useState<'short' | 'medium' | 'long'>('medium');
  
  // Cache configuration
  const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
  
  // Blueprint data cache
  const [cachedBlueprints, setCachedBlueprints] = useState<{
    [key: string]: {
      data: BlueprintData; // Replace 'any' with BlueprintData
      questions?: QuestionsData; // Replace 'any' with QuestionsData
      timestamp: number;
    }
  }>({});
  
  // Declare tempBlueprintId state variable here
  const [tempBlueprintId, setTempBlueprintId] = useState<string | null>(temporaryBlueprintId || null);
  
  // Use external state if provided, otherwise use internal state
  const isControlled = externalIsOpen !== undefined && externalOnOpenChange !== undefined
  const isOpen = isControlled ? externalIsOpen : internalIsOpen
  const setIsOpen = isControlled 
    ? externalOnOpenChange 
    : setInternalIsOpen
    
  // Question status type
  type QuestionStatusMap = {
    [key: number]: "pending" | "complete";
  };
  
  // State for AI-generated questions
  const [questions, setQuestions] = useState<{
    id: number;
    title: string;
    content: string;
  }[]>([]);
  
  // Track active question and question status
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionStatus, setQuestionStatus] = useState<QuestionStatusMap>({});
  
  // Track question responses
  const [responses, setResponses] = useState<{[key: number]: string}>({});
  
  // Reasoning state
  const [createdBlueprintId, setCreatedBlueprintId] = useState<string | undefined>();
  const [finalData, setFinalData] = useState<{
    title: string;
    search_query: string;
    description?: string;
    skill_level?: 'beginner' | 'intermediate' | 'advanced';
    estimated_time?: string;
    prerequisites?: string[];
  } | null>(null);
  
  // Example blueprints with difficulty levels - now we'll fetch these dynamically
  const [examples, setExamples] = useState([
    {
      title: "AI Business Intelligence Dashboard",
      content: "I need an AI that analyzes our company's sales, marketing, and customer service data across multiple platforms, then creates a consolidated dashboard with actionable insights and automated weekly report generation.",
      difficulty: "Medium"
    },
    {
      title: "Personal Finance Coach",
      content: "Build an AI that connects to my bank accounts, analyzes spending patterns, suggests personalized savings strategies, monitors investment opportunities, and provides proactive alerts for unusual transactions.",
      difficulty: "Medium"
    },
    {
      title: "Multilingual Content Localizer",
      content: "Create an AI that automatically translates and culturally adapts marketing content across multiple languages, ensuring tone, idioms, and cultural references are appropriate for each target market.",
      difficulty: "Hard"
    },
    {
      title: "Healthcare Symptom Analyzer",
      content: "I need an AI that allows users to input symptoms, asks relevant follow-up questions, suggests possible conditions with confidence levels, and recommends appropriate next steps while citing medical sources.",
      difficulty: "Easy"
    },
    {
      title: "E-Commerce Inventory Optimizer",
      content: "Build an AI that predicts product demand based on seasonal trends, social media sentiment, and market conditions to automatically adjust inventory levels and reorder timing to minimize costs.",
      difficulty: "Hard"
    }
  ]);
  
  // Tracks whether examples are being loaded
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [examplesError, setExamplesError] = useState<string | null>(null);
  
  // Add this near the other state declarations
  const [debugResults, setDebugResults] = useState<string | null>(null);
  
  // Add state to track final blueprint generation
  const [isGeneratingFinalBlueprint, setIsGeneratingFinalBlueprint] = useState(false);
  
  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Add state for delete confirmation dialog
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Add state to track if debug panel is open
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  // Fix the apiDebugData state to include the setter
  const [apiDebugData, setApiDebugData] = useState<Record<string, unknown>>({});
  
  // Add state for delete debug information
  const [deleteDebugData, setDeleteDebugData] = useState<Record<string, unknown> | null>(null);
  
  // Add missing debug state variables
  // Remove these lines:
  // const [isDebugVisible, setIsDebugVisible] = useState(false);

  // State for copy button
  const [hasCopied, setHasCopied] = useState(false);

  // Function to copy debug results to clipboard
  const copyDebugToClipboard = () => {
    if (!debugResults) return;
    
    navigator.clipboard.writeText(debugResults)
      .then(() => {
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setHasCopied(false);
        }, 2000);
      })
      .catch((error) => {
        console.error("Failed to copy debug data:", error);
        toast.error("Failed to copy debug data");
      });
  };
  
  // Add a function to copy delete debug data to clipboard
  const copyDeleteDebugToClipboard = () => {
    if (!deleteDebugData) return;
    
    const debugString = JSON.stringify(deleteDebugData, null, 2);
    navigator.clipboard.writeText(debugString)
      .then(() => {
        toast.success("Debug data copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy debug data:", err);
        toast.error("Failed to copy debug data to clipboard");
      });
  };
  
  // Fetch dynamic examples when the modal is opened (only for new blueprints)
  useEffect(() => {
    if (isOpen) {
      // Only fetch examples if it's not an existing blueprint
      if (!isExistingBlueprint) {
        fetchDynamicExamples();
      }
    }
  }, [isOpen, isExistingBlueprint]);
  
  // Function to fetch dynamic examples from our API
  const fetchDynamicExamples = async () => {
    try {
      setLoadingExamples(true);
      setExamplesError(null);
      
      console.log('Fetching dynamic examples...');
      const response = await fetch('/api/blueprints/examples', {
        credentials: 'include'
      });
      console.log('Examples API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching examples:', errorText);
        throw new Error(`Failed to fetch examples: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Examples API Response Data:', data);
      console.log(`Source of examples: ${data.source || 'unknown'}`);
      
      if (data.examples && Array.isArray(data.examples)) {
        console.log('Received dynamic examples:', data.examples);
        setExamples(data.examples);
      } else {
        console.error('Invalid examples data format:', data);
        throw new Error('Invalid examples data format');
      }
    } catch (error) {
      console.error('Error loading examples:', error);
      setExamplesError('Failed to load examples. Please try again.');
      // Keep any previous examples loaded if available
    } finally {
      setLoadingExamples(false);
    }
  };
  
  // Regenerate examples on demand
  const handleRegenerateExamples = async () => {
    await fetchDynamicExamples();
  };

  // Difficulty color mapping
  const difficultyColors = {
    Easy: "text-green-500 bg-green-50 dark:bg-green-950/30",
    Medium: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
    Hard: "text-red-500 bg-red-50 dark:bg-red-950/30",
  }
  
  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      // No longer delete any blueprints when modal is closed
      // Just reset the state variables to prepare for next time
      console.log('Modal closed, resetting state variables without deleting any blueprints');
      
      setPrompt("");
      setTitle("");
      setDescription("");
      setCurrentStep('prompt');
      setCurrentResponse("");
      setCreatedBlueprintId(undefined);
      setFinalData(null);
      setActiveQuestionIndex(0);
      setQuestions([]);
      setQuestionStatus({});
      setResponses({});
      setDebugResults(""); // Clear debug results
      setIsDebugOpen(false); // Ensure debug panel is closed when modal is closed
    }
  }, [isOpen]);

  // Initialization code to use temporaryBlueprintId prop when provided
  useEffect(() => {
    // Reset form when modal is opened
    if (isOpen) {
      console.log("Modal opened, initializing state", { temporaryBlueprintId });
      
      // If a temporaryBlueprintId is provided, use it
      if (temporaryBlueprintId) {
        console.log("Using provided temporary blueprint ID:", temporaryBlueprintId);
        setTempBlueprintId(temporaryBlueprintId);
      } else {
        console.log("No temporary blueprint ID provided, will create one when needed");
      }
      
      // Reset states
      setTitle("");
      setPrompt("");
      setDescription("");
      setCurrentStep('prompt');
      setCurrentResponse("");
      setActiveQuestionIndex(0);
      setQuestions([]);
      setQuestionStatus({});
      setResponses({});
    }
  }, [isOpen, temporaryBlueprintId]);

  // Load temporary blueprint data when provided
  useEffect(() => {
    if (temporaryBlueprintId && isOpen) {
      const loadTemporaryBlueprint = async () => {
        // Declare cache object to store blueprint and questions data
        let cacheObject: {
          data: BlueprintData; // Replace 'any' with BlueprintData
          questions?: QuestionsData; // Replace 'any' with QuestionsData
          timestamp: number;
        } | null = null;
        
        // Define the blueprint data interface first
        interface BlueprintData {
          id?: string;
          title?: string;
          prompt?: string;
          search_query?: string;
          description?: string;
          details?: string;
          is_temporary?: boolean;
          content?: {
            questions?: Array<{
              id: number;
              title: string;
              content: string;
            }>;
            responses?: Record<string, string>;
          };
          skill_level?: 'beginner' | 'intermediate' | 'advanced';
          estimated_time?: string;
          prerequisites?: string[];
        }
        
        // Define the processLoadedBlueprint function, now with the BlueprintData type available
        const processLoadedBlueprint = (data: BlueprintData) => {
          // Clean up responses to avoid undefined/null entries
          if (data.content?.responses) {
            // Filter out any null/undefined values
            const cleanedResponses: Record<string, string> = {};
            for (const [key, value] of Object.entries(data.content.responses)) {
              if (value) {
                cleanedResponses[key] = value;
              }
            }
            
            setResponses(cleanedResponses);
          }
          
          if (data.content?.questions) {
            setQuestions(data.content.questions);
            
            // Initialize question status based on existing responses
            const initialStatus = data.content.questions.reduce((acc: QuestionStatusMap, q: { id: number }) => {
              acc[q.id] = data.content?.responses?.[q.id] ? "complete" : "pending";
              return acc;
            }, {});
            
            setQuestionStatus(initialStatus);
          }
          
          if (data.search_query) {
            console.log("Loading existing search query from database:", data.search_query);
            // Set both state variables at once
            setEditableSearchQuery(data.search_query);
            
            // Create a complete finalData object with all available information
            const finalDataObj = {
              title: data.title || 'Untitled Blueprint',
              search_query: data.search_query,
              description: data.description || data.details || '',
              skill_level: data.skill_level || 'beginner',
              estimated_time: data.estimated_time || '1-2 hours',
              prerequisites: data.prerequisites || []
            };
            
            setFinalData(finalDataObj);
            console.log("FinalData has been set with existing search_query:", finalDataObj);
          }
          
          setTitle(data.title || "");
          setPrompt(data.prompt || "");
          
          // Set description from either field, prioritizing 'details' as that's what's in the database
          setDescription(data.details || data.description || "");
          
          // Store the initial prompt to track changes later
          setInitialPrompt(data.prompt || "");
          
          // Mark this as an existing blueprint
          setIsExistingBlueprint(true);
          setPromptChanged(false);
          
          // Force navigation to conversation step for existing blueprints
          // This implements the requirement to go to the second slide for existing blueprints
          console.log("Navigating to conversation step for existing blueprint");
          
          // If there's a search query and review was requested via URL hash, go directly to review
          if (data.search_query && window.location.hash === '#review') {
            console.log("Found search query and review was requested, navigating directly to review tab");
            setTimeout(() => {
              setCurrentStep('review');
            }, 50);
          } else {
            // Otherwise go to conversation step
          setTimeout(() => {
            setCurrentStep('conversation');
          }, 50);
          }
          
          // Log the origin information to help with debugging
          console.log("Loaded blueprint details:", {
            title: data.title,
            prompt: data.prompt,
            description: data.details || data.description,
            hasSearchQuery: !!data.search_query,
            hasQuestions: !!(data.content && data.content.questions),
            hasResponses: !!(data.content && data.content.responses),
            responseCount: data.content?.responses ? Object.keys(data.content.responses).length : 0,
            is_temporary: data.is_temporary
          });
          
          // Show a toast to inform the user we've loaded their draft
          toast.info("Draft blueprint loaded", {
            description: "Continuing from where you left off"
          });
          
          // If there's a search_query, set the final data and editable search query
          if (data.search_query) {
            console.log("Found existing search query during blueprint load, no need to regenerate");
            // The finalData and editableSearchQuery are already set above, no need to set again
          }
          
          // For temporary blueprints with questions, go to the conversation step
          else if (data.is_temporary && data.content && data.content.questions && data.content.questions.length > 0) {
            console.log("Temporary blueprint has questions - moving to conversation step");
            setCurrentStep('conversation');
          }
          
          // If there are questions and responses in the content, load them
          if (data.content && data.content.questions) {
            setQuestions(data.content.questions);
            
            // Initialize question status map
            const initialStatus = data.content.questions.reduce((acc: QuestionStatusMap, q: { id: number; title: string; content: string }) => {
              acc[q.id] = "pending";
              return acc;
            }, {});
            
            setQuestionStatus(initialStatus);
            
            // Set the first question as active and clear the response field
            setActiveQuestionIndex(0);
            setCurrentResponse("");
            
            console.log('Questions processed and ready:', data.content.questions.length);
          }
          
          if (data.content && data.content.responses) {
            setResponses(data.content.responses);
            
            // Parse the status from responses - if a response exists for a question, mark it as complete
            if (data.content.questions) {
              const questionStatusMap: QuestionStatusMap = {};
              
              data.content.questions.forEach(question => {
                const hasResponse = data.content?.responses && 
                                    data.content.responses[question.id] !== undefined;
                
                questionStatusMap[question.id] = hasResponse ? "complete" : "pending";
              });
              
              setQuestionStatus(questionStatusMap);
              
              // Set initial response if we have questions and responses
              if (data.content.questions.length > 0) {
                const firstQuestion = data.content.questions[0];
                if (data.content.responses[firstQuestion.id]) {
                  setCurrentResponse(data.content.responses[firstQuestion.id]);
                }
              }
            }
          }
          
          // Add this code to process the search_query
          if (data.search_query) {
            setEditableSearchQuery(data.search_query);
            // The setFinalData call was moved to the block above with proper type handling
          }
        };
        
        try {
          setIsLoading(true);
          console.log("%c[DEBUG] Loading blueprint", "background: #3498db; color: white; padding: 2px 4px; border-radius: 2px;", {
            id: temporaryBlueprintId,
            isOpen: isOpen,
            timestamp: new Date().toISOString(),
          });
          
          // Check if we have this blueprint in cache and if it's still valid
          const cached = cachedBlueprints[temporaryBlueprintId];
          const now = Date.now();
          
          if (cached && now - cached.timestamp < CACHE_EXPIRY_TIME) {
            console.log("%c[DEBUG] Using cached blueprint data", "background: #2ecc71; color: white; padding: 2px 4px; border-radius: 2px;", {
              id: temporaryBlueprintId,
              cacheAge: `${Math.round((now - cached.timestamp) / 1000)}s old`,
            });
            
            // Use cached blueprint data
            processLoadedBlueprint(cached.data);
            
            // If we have cached questions too, use them
            if (cached.questions?.questions && Array.isArray(cached.questions.questions)) {
              console.log("%c[DEBUG] Using cached questions data", "background: #2ecc71; color: white; padding: 2px 4px; border-radius: 2px;");
              
              if (cached.questions?.responses) {
                setQuestions(cached.questions.questions);
                setResponses(cached.questions.responses);
                
                // Parse the status from responses
                const questionStatusMap: QuestionStatusMap = {};
                cached.questions.questions.forEach((question: { id: number }) => {
                  const hasResponse = !!cached.questions?.responses?.[question.id];
                  questionStatusMap[question.id] = hasResponse ? "complete" : "pending";
                });
                setQuestionStatus(questionStatusMap);
              }
            }
            
            setIsLoading(false);
            return; // Exit early, we're using cached data
          }
          
          // Helper function to start a fresh blueprint
          const startFreshBlueprint = (title: string, description: string) => {
            setTitle("");
            setPrompt("");
            setDescription("");
            setCurrentStep('prompt');
            setQuestions([]);
            setResponses({});
            setQuestionStatus({});
            setActiveQuestionIndex(0);
            
            // Inform the user what happened
            toast.info(title, {
              description: description
            });
          };
          
          // First validate the UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(temporaryBlueprintId!)) {
            console.error(`Invalid UUID format for blueprint ID: ${temporaryBlueprintId}`);
            startFreshBlueprint(
              "Your previous draft couldn't be loaded",
              "Invalid blueprint ID format - starting a new blueprint creation process"
            );
            return;
          }
          
          // First check if blueprint exists at all with stronger credentials
          console.log("%c[DEBUG] Checking blueprint existence with HEAD request", "background: #f39c12; color: white; padding: 2px 4px; border-radius: 2px;", temporaryBlueprintId);
          
          const blueprintCheckResponse = await fetch(`/api/blueprints/${temporaryBlueprintId}`, {
            method: 'HEAD',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Debug-Client': 'create-blueprint-modal'
            }
          });
          
          console.log("%c[DEBUG] HEAD response", "background: #f39c12; color: white; padding: 2px 4px; border-radius: 2px;", {
            status: blueprintCheckResponse.status,
            ok: blueprintCheckResponse.ok,
            statusText: blueprintCheckResponse.statusText,
            headers: {
              found: blueprintCheckResponse.headers.get('X-Blueprint-Found'),
              type: blueprintCheckResponse.headers.get('X-Blueprint-Type'),
              created: blueprintCheckResponse.headers.get('X-Blueprint-Created'),
              user: blueprintCheckResponse.headers.get('X-Blueprint-User'),
              error: blueprintCheckResponse.headers.get('X-Error'),
              debugInfo: blueprintCheckResponse.headers.get('X-Debug-Info')
            }
          });
          
          if (blueprintCheckResponse.status === 404) {
            console.error(`Blueprint with ID ${temporaryBlueprintId} not found`);
            
            // Try an alternative fetch to debug if this blueprint exists
            try {
              const recentBlueprintsResponse = await fetch('/api/blueprints/recent', {
                credentials: 'include',
                headers: {
                  'Cache-Control': 'no-cache',
                  'X-Debug-Client': 'create-blueprint-modal'
                }
              });
              
              if (recentBlueprintsResponse.ok) {
                const recentBlueprints = await recentBlueprintsResponse.json();
                console.log('Recent blueprints available:', recentBlueprints.map((bp: {id: string, created_at: string}) => 
                  `${bp.id} (created: ${bp.created_at})`));
                
                // Check if our blueprint is among them
                const matchingBlueprint = recentBlueprints.find((bp: {id: string}) => bp.id === temporaryBlueprintId);
                if (matchingBlueprint) {
                  console.log('Blueprint found in recent list but not directly accessible!', matchingBlueprint);
                }
              }
            } catch (recentError) {
              console.error('Failed to fetch recent blueprints for debugging:', recentError);
            }
            
            startFreshBlueprint(
              "Your previous draft couldn't be loaded",
              "Blueprint not found - starting a new blueprint creation process"
            );
            return;
          }
          
          // Then fetch the full blueprint details with stronger credentials
          console.log("%c[DEBUG] Fetching full blueprint details", "background: #2ecc71; color: white; padding: 2px 4px; border-radius: 2px;", temporaryBlueprintId);
          
          // Add diagnostic info to URL to help debug and prevent caching
          const timestamp = new Date().getTime();
          
          const blueprintResponse = await fetch(`/api/blueprints/${temporaryBlueprintId}?_t=${timestamp}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Requested-With': 'XMLHttpRequest',
              'X-Debug-Client': 'create-blueprint-modal'
            }
          });
          
          console.log("%c[DEBUG] GET response", "background: #2ecc71; color: white; padding: 2px 4px; border-radius: 2px;", {
            status: blueprintResponse.status,
            ok: blueprintResponse.ok,
            statusText: blueprintResponse.statusText,
            contentType: blueprintResponse.headers.get('Content-Type'),
            contentLength: blueprintResponse.headers.get('Content-Length')
          });
          
          if (!blueprintResponse.ok) {
            // Try to get the detailed error message from the response
            let errorDetails = "Unknown error";
            try {
              const errorData = await blueprintResponse.json();
              errorDetails = errorData.details || errorData.error || blueprintResponse.statusText;
              console.error('Blueprint fetch error details:', errorData);
            } catch (parseError) {
              console.error('Error parsing error response:', parseError);
              // If parsing fails, try to get the text instead
              try {
                errorDetails = await blueprintResponse.text();
                console.error('Error text:', errorDetails);
              } catch {
                // If all else fails, just use the status text
                errorDetails = blueprintResponse.statusText;
              }
            }
            
            // Try a fallback approach using the debug endpoint
            console.log("Main API call failed. Trying emergency fallback approach...");
            try {
              const fallbackResponse = await fetch(`/api/debug/blueprint-check?id=${temporaryBlueprintId}`, {
                credentials: 'include',
                headers: {
                  'Cache-Control': 'no-cache',
                  'X-Debug-Client': 'create-blueprint-modal'
                }
              });
              
              if (fallbackResponse.ok) {
                const debugInfo = await fallbackResponse.json();
                console.log("Debug info received:", debugInfo);
                
                // Check if the blueprint exists using the service role access
                if (debugInfo.exists_in_db && debugInfo.service_role_access.success) {
                  console.log("Blueprint found in database via service role. Attempting to load it...");
                  
                  // Try the direct access endpoint for full data
                  try {
                    const directResponse = await fetch(`/api/blueprints/direct-access?id=${temporaryBlueprintId}`, {
                      credentials: 'include',
                      headers: {
                        'Cache-Control': 'no-cache',
                        'X-Debug-Client': 'create-blueprint-modal',
                        'X-Emergency-Fallback': 'true'
                      }
                    });
                    
                    if (directResponse.ok) {
                      const directData = await directResponse.json();
                      console.log("Successfully fetched blueprint via direct access", directData);
                      
                      // Set the blueprint data
                      setTempBlueprintId(temporaryBlueprintId);
                      processLoadedBlueprint(directData);
                      
                      // Show a toast to inform the user
                      toast.success("Blueprint loaded successfully", {
                        description: "Using emergency direct access mode"
                      });
                      
                      return;
                    } else {
                      console.error("Direct access failed:", await directResponse.text());
                    }
                  } catch (directError) {
                    console.error("Error in direct access:", directError);
                  }
                  
                  // If direct access failed, fall back to using the limited service data
                  const serviceData = debugInfo.service_role_access.data;
                  if (serviceData) {
                    console.log("Using service data as fallback", serviceData);
                    
                    // Create a basic blueprint object with available data
                    const fallbackData = {
                      id: serviceData.id,
                      title: serviceData.title || "Recovered Blueprint",
                      prompt: "",
                      description: "",
                      is_temporary: serviceData.is_temporary
                    };
                    
                    // Save it to state
                    setTempBlueprintId(temporaryBlueprintId);
                    processLoadedBlueprint(fallbackData);
                    
                    // Show a toast to inform the user
                    toast.info("Blueprint recovered with limited data", {
                      description: "Some data was recovered, but you may need to re-answer some questions."
                    });
                    
                    return;
                  }
                }
              } else {
                console.error("Fallback approach also failed:", await fallbackResponse.text());
              }
            } catch (fallbackError) {
              console.error("Error in fallback approach:", fallbackError);
            }
            
            throw new Error(`Failed to fetch blueprint: ${blueprintResponse.status} - ${errorDetails}`);
          }
          
          const data = await blueprintResponse.json();
          console.log("%c[DEBUG] Blueprint data received", "background: #2ecc71; color: white; padding: 2px 4px; border-radius: 2px;", {
            dataReceived: !!data,
            dataType: typeof data,
            hasID: !!data?.id,
            id: data?.id,
            title: data?.title?.substring(0, 30),
            fields: data ? Object.keys(data) : []
          });
          
          // Also set the temporary blueprint ID in state to match what was loaded
          setTempBlueprintId(temporaryBlueprintId);
          
          // Process the loaded blueprint
          processLoadedBlueprint(data);
          
          // Start building the cache object
          cacheObject = {
            data: data,
            timestamp: Date.now()
          };
          
          // Check for questions data for this blueprint
          try {
            console.log("%c[DEBUG] Fetching questions data", "background: #8e44ad; color: white; padding: 2px 4px; border-radius: 2px;", {
              blueprint_id: temporaryBlueprintId,
              current_questions: questions.length,
              current_responses: Object.keys(responses).length,
              timestamp: new Date().toISOString()
            });
            
            const questionsResponse = await fetch(`/api/blueprints/questions/responses?blueprint_id=${temporaryBlueprintId}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Debug-Client': 'create-blueprint-modal-load'
              }
            });
            
            console.log("%c[DEBUG] Questions response", "background: #8e44ad; color: white; padding: 2px 4px; border-radius: 2px;", {
              status: questionsResponse.status,
              ok: questionsResponse.ok,
              contentType: questionsResponse.headers.get('Content-Type')
            });
            
            if (questionsResponse.ok) {
              const questionsData = await questionsResponse.json();
              console.log("%c[DEBUG] Loaded questions data:", "background: #8e44ad; color: white; padding: 2px 4px; border-radius: 2px;", {
                data: questionsData,
                has_questions: !!(questionsData.questions && Array.isArray(questionsData.questions)),
                question_count: questionsData.questions ? questionsData.questions.length : 0,
                has_responses: !!(questionsData.responses && typeof questionsData.responses === 'object'),
                response_count: questionsData.responses ? Object.keys(questionsData.responses).length : 0
              });
              
              // Add questions data to the cache object
              cacheObject.questions = questionsData;
              
              // Only update questions if we actually got some from the API
              if (questionsData.questions && Array.isArray(questionsData.questions) && questionsData.questions.length > 0) {
                console.log(`[DEBUG] Setting ${questionsData.questions.length} questions from API`);
                setQuestions(questionsData.questions);
                
                if (questionsData.responses && typeof questionsData.responses === 'object') {
                  console.log(`[DEBUG] Setting ${Object.keys(questionsData.responses).length} responses from API`);
                  setResponses(questionsData.responses);
                  
                  // Parse the status from responses
                  const questionStatusMap: QuestionStatusMap = {};
                  questionsData.questions.forEach((question: { id: number }) => {
                    const hasResponse = !!questionsData.responses[question.id];
                    questionStatusMap[question.id] = hasResponse ? "complete" : "pending";
                    console.log(`[DEBUG] Question ${question.id} status: ${hasResponse ? "complete" : "pending"}`);
                  });
                  setQuestionStatus(questionStatusMap);
                  
                  // Find the first incomplete question, or default to the first question
                  const firstIncompleteIndex = questionsData.questions.findIndex(
                    (q: { id: number }) => !questionsData.responses[q.id]
                  );
                  
                  const newActiveIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
                  console.log(`[DEBUG] Setting active question index to ${newActiveIndex}`);
                  setActiveQuestionIndex(newActiveIndex);
                  
                  // Set current response based on active question
                  if (questionsData.questions[newActiveIndex]) {
                    const activeQuestionId = questionsData.questions[newActiveIndex].id;
                    setCurrentResponse(questionsData.responses[activeQuestionId] || "");
                    console.log(`[DEBUG] Setting current response for question ${activeQuestionId}`);
                  }
                  
                  // Update current step to conversation if we have questions
                  if (questionsData.questions.length > 0) {
                    setCurrentStep('conversation');
                    setIsExistingBlueprint(true);
                  }
                } else {
                  console.log(`[DEBUG] No responses found or invalid format: ${typeof questionsData.responses}`);
                  // Initialize empty responses if none were found
                  setResponses({});
                  
                  // Set all questions to pending
                  const newQuestionStatusMap: QuestionStatusMap = {};
                  questionsData.questions.forEach((question: { id: number }) => {
                    newQuestionStatusMap[question.id] = "pending";
                  });
                  setQuestionStatus(newQuestionStatusMap);
                  setActiveQuestionIndex(0);
                }
              } else {
                console.log(`[DEBUG] No questions found in API response or invalid format`);
              }
            } else {
              // Try to get the error details
              let errorText = questionsResponse.statusText;
              try {
                errorText = await questionsResponse.text();
              } catch (e) {
                console.error("Failed to get error text:", e);
              }
              console.error("[DEBUG] Failed to fetch questions data:", {
                status: questionsResponse.status,
                error: errorText
              });
            }
          } catch (questionsError) {
            console.error("[DEBUG] Error loading questions data:", questionsError);
            // Continue with what we have
          }
        } catch (error) {
          console.error('Error loading blueprint:', error);
          toast.error("Failed to load your draft", {
            description: "Starting a new blueprint creation process"
          });
        } finally {
          // Update the cache if we have new data
          if (cacheObject?.data && temporaryBlueprintId) {
            console.log("%c[DEBUG] Saving blueprint data to cache", "background: #3498db; color: white; padding: 2px 4px; border-radius: 2px;");
            // Ensure cacheObject is not null when updating the cache
            const cacheObjectToSave = cacheObject; // Make a separate non-null reference
            setCachedBlueprints(prev => ({
              ...prev,
              [temporaryBlueprintId]: cacheObjectToSave
            }));
          }
          
          setIsLoading(false);
        }
      };
      
      loadTemporaryBlueprint();
    }
  }, [temporaryBlueprintId, isOpen]);
  
  // Add logging to debug the tempBlueprintId
  useEffect(() => {
    console.log("tempBlueprintId changed:", tempBlueprintId);
  }, [tempBlueprintId]);

  // New effect: Ensure we navigate to conversation step for existing blueprints
  // This acts as a safeguard to ensure we always navigate to slide 2 when loading an existing blueprint
  useEffect(() => {
    if (isExistingBlueprint && temporaryBlueprintId && !isLoading) {
      console.log("Ensuring navigation to conversation step for existing blueprint");
      setCurrentStep('conversation');
    }
  }, [isExistingBlueprint, temporaryBlueprintId, isLoading]);

  // Save a response to the database for a specific question with retry logic
  const saveResponseToDatabase = async (blueprintId: string, questionId: string, response: string): Promise<boolean> => {
    if (!blueprintId) {
      throw new Error("No blueprint ID provided");
    }
    
    if (!questionId) {
      throw new Error("No question ID provided");
    }
    
    if (!response.trim()) {
      throw new Error("Empty response cannot be saved");
    }
    
    // Always update local state first to ensure UI consistency
    // This way user's data is preserved even if save fails
    setResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
    
    setQuestionStatus(prev => ({
      ...prev,
      [questions.find(q => q.id.toString() === questionId)?.id || parseInt(questionId)]: "complete"
    }));
    
    // Add retry logic for saving to database
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Add a brief delay that increases with each retry
        if (retryCount > 0) {
          const delay = 1000 * Math.pow(1.5, retryCount); // Exponential backoff
          console.log(`Retry ${retryCount}/${maxRetries}: Waiting ${delay}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        retryCount++;
        console.log(`Attempt ${retryCount}/${maxRetries} to save response to database`);
        
        // IMPORTANT: Send all responses, not just the current one
        // This ensures we don't overwrite existing responses
        const allResponses = {
          ...responses, // Include all existing responses from state
          [questionId]: response // Add or update the current response
        };
        
        console.log(`Saving all responses (${Object.keys(allResponses).length} total) to ensure nothing is lost`);
        
        // Try to save to database
        const saveResponse = await fetch('/api/blueprints/questions/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include',
          body: JSON.stringify({
            blueprint_id: blueprintId,
            responses: allResponses // Send all responses, not just the current one
          }),
        });
        
        // If the save was successful, return
        if (saveResponse.ok) {
          const responseData = await saveResponse.json();
          console.log('Responses saved successfully:', responseData);
          return true; // Successfully saved
        }
        
        // Handle 404 Not Found errors (due to database propagation delays)
        if (saveResponse.status === 404) {
          const errorText = await saveResponse.text();
          console.error(`Blueprint not found (attempt ${retryCount}/${maxRetries}):`, errorText);
          
          // If last retry, show a toast but don't throw an error
          if (retryCount === maxRetries) {
            toast.warning("Saved locally only", {
              description: "Your response is saved in your session but couldn't be saved to the server."
            });
            return false; // Indicate unsuccessful server save
          }
          
          // Continue to next retry attempt
          continue;
        }
        
        // For other errors, try again or eventually abandon
        const errorText = await saveResponse.text();
        console.error(`Error saving response (attempt ${retryCount}/${maxRetries}):`, errorText);
        
        // If this is the last retry, show a toast but don't throw
        if (retryCount === maxRetries) {
          toast.warning("Saved locally only", {
            description: "Your response is saved in your session but couldn't be saved to the server."
          });
          return false; // Indicate unsuccessful server save
        }
      } catch (error) {
        console.error(`Unexpected error during save attempt ${retryCount}/${maxRetries}:`, error);
        
        // If this is the last retry, show a toast but don't throw
        if (retryCount === maxRetries) {
          toast.warning("Saved locally only", {
            description: "Your response is saved in your session but couldn't be saved to the server."
          });
          return false; // Indicate unsuccessful server save
        }
      }
    }
    
    // If we get here, all retries failed but we've already shown a toast
    // We don't throw an error because we want the UI to keep working
    console.error(`Failed to save response after ${maxRetries} attempts. Continuing with local state only.`);
    return false; // Indicate unsuccessful server save
  };

  // Handle question click to change active question
  const handleQuestionClick = async (index: number) => {
    // If there's a current response, save it before switching
    if (currentResponse.trim()) {
      // Use our new function to handle submission
      await handleQuestionSubmit(false);
    }
    
    // Set the new active question
    setActiveQuestionIndex(index);
    
    // If this question has a saved response, populate the text field
    const nextQuestion = questions[index];
    if (nextQuestion && responses[nextQuestion.id]) {
      setCurrentResponse(responses[nextQuestion.id]);
    } else {
      setCurrentResponse("");
    }
  };
  
  // Handle creating the final blueprint
  const handleCreateBlueprint = async () => {
    // Enhanced input validation with early returns for each validation
    
    // Check that we have all required data
    if (!finalData) {
      toast.error("Final blueprint data is missing");
      console.error("Blueprint creation validation error: Final blueprint data is missing");
      return;
    }
    
    // Add more comprehensive validation
    if (!finalData.title || typeof finalData.title !== 'string' || finalData.title.trim() === '') {
      toast.error("Blueprint title is required and must be a non-empty string");
      console.error("Blueprint creation validation error: Invalid title");
      return;
    }

    // Validate search_query if present
    if (finalData.search_query !== undefined && 
       (typeof finalData.search_query !== 'string' || finalData.search_query.trim() === '')) {
      toast.error("Search query must be a non-empty string if provided");
      console.error("Blueprint creation validation error: Invalid search query");
      return;
    }
    
    if (!tempBlueprintId) {
      toast.error("No temporary blueprint ID found");
      console.error("Blueprint creation validation error: Missing tempBlueprintId");
      return;
    }
    
    // Ensure content is valid
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      toast.error("Blueprint must contain at least one question");
      console.error("Blueprint creation validation error: Missing questions");
      return;
    }
    
    if (!responses || typeof responses !== 'object' || Object.keys(responses).length === 0) {
      toast.error("Blueprint must contain at least one response");
      console.error("Blueprint creation validation error: Missing responses");
      return;
    }
    
    setIsLoading(true);
    toast.loading("Creating your blueprint...", { id: "create-blueprint" });
    
    try {
      // DEBUGGING: Log all involved records for troubleshooting
      console.log("DEBUGGING BLUEPRINT CREATION PROCESS:");
      console.log("Temporary Blueprint ID:", tempBlueprintId);
      console.log("Created Blueprint ID (if updating):", createdBlueprintId);
      console.log("Final Data:", finalData);
      console.log("Question Count:", questions.length);
      console.log("Response Count:", Object.keys(responses).length);
      
      // First, check for any required fields and gather data
      const isUpdating = !!createdBlueprintId;
      
      // Use either the created ID or the temporary one
      const blueprintId = createdBlueprintId || tempBlueprintId;
      console.log(`Using blueprint ID: ${blueprintId} (${isUpdating ? 'updating existing' : 'converting temporary'})`);
      
      // Create the endpoint URL - we'll always use the ID endpoint to avoid creating new records
      // FIX: Always use the ID-based endpoint to prevent creating duplicate records
      const endpoint = `/api/blueprints/${blueprintId}`;
      
      // Use PATCH for updating (ensures we're updating instead of creating new records)
      const method = 'PATCH';
      console.log(`Using method ${method} to endpoint ${endpoint}`);
      
      // Get the user's prompt for comparison
      if (!prompt) {
        throw new Error("No prompt available");
      }
      
      // Gather responses for the content object
      const content = {
        questions: questions.map(q => ({
          id: q.id,
          title: q.title,
          content: q.content,
          response: responses[q.id] || ""
        })),
        responses: { ...responses }
      };
      
      // Validate content structure
      if (!Array.isArray(content.questions) || content.questions.length === 0) {
        throw new Error("Blueprint must have at least one question");
      }
      
      // Make sure all questions have required fields
      for (const question of content.questions) {
        if (!question.id) {
          throw new Error("Question is missing id");
        }
        if (!question.title) {
          throw new Error(`Question ${question.id} is missing title`);
        }
        if (!question.content) {
          throw new Error(`Question ${question.id} is missing content`);
        }
      }
      
      // Ensure responses object is present
      if (!content.responses || typeof content.responses !== 'object') {
        content.responses = {}; // Create empty responses object if missing
      }
      
      // Log just before sending to help debug search_query issues
      console.log('Final data before blueprint creation:', {
        title: finalData.title,
        search_query: finalData.search_query,
        editable_search_query: editableSearchQuery,
        final_search_query_to_be_used: editableSearchQuery || finalData.search_query || "",
        description: finalData.description || description,
        prompt,
        contentKeys: Object.keys(content)
      });
      
      // Construct the blueprint data, only including search_query if defined
      const blueprintData = {
        title: finalData.title,
        search_query: editableSearchQuery || finalData.search_query || "", // Always include search_query with fallbacks
        details: finalData.description || description, // Use local description state as fallback
        prompt,
        content,
        // Include both skill_level for the UI and complexity for the database
        skill_level: finalData.skill_level || 'beginner', // Use UI values as-is
        // Map from skill_level values to database complexity values
        complexity: (() => {
          const complexityMap: Record<string, string> = {
            'beginner': 'low',
            'intermediate': 'medium',
            'advanced': 'high'
          };
          const skillLevel = finalData.skill_level || 'beginner';
          return complexityMap[skillLevel] || 'low'; // Default to 'low' if mapping fails
        })(),
        estimated_time: finalData.estimated_time || '30 minutes', // Provide a default
        is_temporary: false, // Set to false to make it a permanent blueprint
      };
      
      // Log the blueprint data with both fields for debugging
      console.log('Blueprint data with both skill_level and complexity:', {
        title: blueprintData.title,
        skill_level: blueprintData.skill_level,
        complexity: blueprintData.complexity
      });
      
      // Clean the data to ensure it's safe for API transmission
      const cleanedData = makeJsonSafe(blueprintData);
      
      // Verify data can be serialized to JSON properly (catches circular references, etc.)
      try {
        JSON.stringify(cleanedData);
      } catch (jsonError) {
        console.error('JSON serialization error:', jsonError);
        throw new Error('Blueprint data contains values that cannot be properly serialized');
      }
      
      // Critical validation to prevent empty object causing "Invalid input" errors
      if (!cleanedData || Object.keys(cleanedData).length === 0) {
        console.error('Empty or invalid data object after processing:', cleanedData);
        console.log('Original blueprint data:', blueprintData);
        throw new Error('Data that caused invalid input error: {}');
      }
      
      // Extra validation for complexity - ensure it has the expected API values
      if (cleanedData.skill_level) {
        const validSkillLevelValues = ['beginner', 'intermediate', 'advanced'];
        if (!validSkillLevelValues.includes(cleanedData.skill_level)) {
          console.error('Invalid skill_level value:', cleanedData.skill_level);
          cleanedData.skill_level = 'beginner'; // Default to beginner if invalid
          console.log('Corrected skill_level to "beginner"');
        }
      }
      
      // Ensure critical fields are present
      if (!cleanedData.title || typeof cleanedData.title !== 'string') {
        console.error('Missing title in cleanedData:', cleanedData);
        throw new Error('Blueprint title is missing after data processing');
      }
      
      if (!cleanedData.prompt || typeof cleanedData.prompt !== 'string') {
        console.error('Missing prompt in cleanedData:', cleanedData);
        throw new Error('Blueprint prompt is missing after data processing');
      }
      
      if (!cleanedData.content || typeof cleanedData.content !== 'object') {
        console.error('Missing content in cleanedData:', cleanedData);
        throw new Error('Blueprint content is missing after data processing');
      }
      
      console.log(`Sending ${method} request to ${endpoint}:`, cleanedData);
      
      try {
        // Prepare request options to ensure proper data handling
        const requestOptions = {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cleanedData),
          credentials: 'include' as RequestCredentials
        };
        
        console.log('Making direct fetch API call with these options:', {
          endpoint,
          method: requestOptions.method,
          bodySize: requestOptions.body.length,
          bodyPreview: requestOptions.body.substring(0, 100) + '...'
        });
        
        // Use fetch directly for better control
        const response = await fetch(endpoint, requestOptions);
        
        // Handle errors
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error (${response.status}):`, errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || `API error: ${response.status}`);
          } catch (e) {
            throw new Error(`API error (${response.status}): ${errorText || 'Unknown error'}`);
          }
        }
        
        // Parse the successful response
        const data = await response.json();
        
        console.log('Blueprint successfully created/updated:', data);
        
        // For debugging purposes, show the response data
        setIsDebugOpen(true);
        
        // Set the created blueprint ID if it's not already set
        if (!createdBlueprintId) {
          setCreatedBlueprintId(data.id);
        }
        
        toast.success("Blueprint created successfully", { id: "create-blueprint" });
        
        // First close the modal - must happen before callback to prevent race conditions
        setIsOpen(false);
        
        // Add a small delay before notifying the parent to ensure database consistency
        setTimeout(() => {
          // Notify parent component that a blueprint was created
          if (onBlueprintCreated && data && data.id) {
            console.log("Calling onBlueprintCreated with ID:", data.id);
            onBlueprintCreated(data.id);
          } else {
            console.warn("onBlueprintCreated callback is not provided or data.id is missing");
            console.log("Blueprint data:", data);
          }
          
          // In development mode, log debugging info
          if (process.env.NODE_ENV === 'development') {
            console.log("DEBUGGING: Blueprint creation complete. Parent component notified after modal closed.");
          }
        }, 200); // Small delay to ensure database consistency
      } catch (error) {
        console.error('Error in blueprint creation API call:', error);
        
        // Provide a more descriptive error message based on the error
        let errorMessage = 'Failed to create blueprint';
        let errorDetails = '';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails = error.stack || '';
          
          // Special case for common errors
          if (errorMessage.includes('Invalid input')) {
            errorMessage = 'Invalid blueprint data format';
            console.error('Data that caused invalid input error:', cleanedData);
          } else if (errorMessage.includes('Failed to fetch')) {
            errorMessage = 'Network error - could not reach the server';
          }
        }
        
        // Set error debug data
        setDebugResults(JSON.stringify({
          error: true,
          message: errorMessage,
          details: errorDetails,
          data_sent: cleanedData,
          timestamp: new Date().toISOString()
        }, null, 2));
        
        setIsDebugOpen(true);
        throw new Error(errorMessage); // Re-throw with more descriptive message
      }
    } catch (error) {
      console.error('Error in handleCreateBlueprint:', error);
      
      // Add more detailed error debugging
      let errorMessage = 'Failed to create blueprint';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      // Set debug data for the error to help with troubleshooting
      setDebugResults(JSON.stringify({
        error: true,
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        blueprint_info: {
          tempBlueprintId,
          createdBlueprintId,
          title: finalData?.title || '',
          has_search_query: !!finalData?.search_query,
          question_count: questions.length,
          response_count: Object.keys(responses).length
        }
      }, null, 2));
      
      setIsDebugOpen(true);
      toast.error(errorMessage, { id: "create-blueprint" });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate the final blueprint data based on all question responses
  /**
   * Uncommented generateFinalBlueprint function to enable the finalize API call.
   * This function is responsible for sending user data to the reasoning agent to
   * generate a proper search query for the research agent.
   */
  const generateFinalBlueprint = async () => {
    if (!prompt || !questions || !responses || Object.keys(responses).length === 0) {
      toast.error("Missing required data for blueprint generation");
      return;
    }

    // Record the current timestamp for debug info
    const generationStartTime = new Date().toISOString();

    setIsGeneratingFinalBlueprint(true);
    setDebugResults(prevDebug => {
      try {
        const currentDebug = prevDebug ? JSON.parse(prevDebug) : {};
        return JSON.stringify({
          ...currentDebug,
          reasoning_agent: {
            status: 'pending',
            time_started: generationStartTime,
            details: 'Started generating search query...'
          }
        });
      } catch (e) {
        console.error("Error parsing debug info:", e);
        return JSON.stringify({
          reasoning_agent: {
            status: 'pending',
            time_started: generationStartTime,
            details: 'Started generating search query...'
          }
        });
      }
    });
    
    try {
      // Prepare questions and responses for the API call
      const questionAnswer = Object.entries(responses).map(([id, answer]) => {
        const question = questions.find(q => q.id.toString() === id);
        return {
          question: question?.content || "", // Using content instead of question
          answer
        };
      });

      // Prepare the data according to what the API expects (FinalizeRequestSchema)
      const data = {
        blueprint_id: tempBlueprintId, // Add the required blueprint_id
        prompt,
        responses, // Send the actual responses object as required by the API schema
        user_skill_level: userData?.skill_level, // Add user skill level if available
        learning_objective: userData?.learning_objectives // Add learning objective if available
      };
      
      console.log("Sending data to finalize endpoint:", {
        blueprint_id: data.blueprint_id,
        prompt_length: data.prompt.length,
        responses_count: Object.keys(data.responses || {}).length
      });
      
      // Call the API to get the final blueprint data
      const response = await fetch('/api/blueprints/reason/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate final blueprint: ${response.status}`);
      }

      const result = await response.json();
      console.log("Finalized blueprint data from OpenAI:", {
        search_query_length: result.search_query?.length || 0,
        hasSearchQuery: !!result.search_query
      });

      // Update local state
      setFinalData(result);
      setEditableSearchQuery(result.search_query || "");

      // Dismiss the loading toast and show success
      toast.success("Search query generated successfully", { id: "generate-search-query" });

      // Record the generation completion timestamp
      const generationCompleteTime = new Date().toISOString();
      
      // Update debug info with success for generation
      setDebugResults(prevDebug => {
        try {
          const currentDebug = prevDebug ? JSON.parse(prevDebug) : {};
          return JSON.stringify({
            ...currentDebug,
            reasoning_agent: {
              ...currentDebug.reasoning_agent,
              status: 'generated',
              time_completed: generationCompleteTime,
              details: 'Successfully generated search query',
              search_query_length: result.search_query?.length || 0,
              saving_to_db: 'pending'
            }
          });
        } catch (e) {
          console.error("Error updating debug info:", e);
          return JSON.stringify({
            reasoning_agent: {
              status: 'generated',
              time_started: generationStartTime,
              time_completed: generationCompleteTime,
              details: 'Successfully generated search query',
              search_query_length: result.search_query?.length || 0,
              saving_to_db: 'pending'
            }
          });
        }
      });
      
      // Save the search query to the database right away
      if (tempBlueprintId && result.search_query) {
        const dbSaveStartTime = new Date().toISOString();
        
        try {
          const saveResponse = await fetch(`/api/blueprints/${tempBlueprintId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              search_query: result.search_query
            }),
            credentials: 'include'
          });
          
          if (!saveResponse.ok) {
            throw new Error(`Failed to save search query: ${saveResponse.status}`);
          }
          
          console.log("Successfully saved search query to database!", result.search_query.substring(0, 100) + "...");
          const dbSaveCompleteTime = new Date().toISOString();
          
          // Update debug info with success for saving to database
          setDebugResults(prevDebug => {
            try {
              const currentDebug = prevDebug ? JSON.parse(prevDebug) : {};
              return JSON.stringify({
                ...currentDebug,
                reasoning_agent: {
                  ...currentDebug.reasoning_agent,
                  status: 'passed',
                  saving_to_db: 'success',
                  time_saved_to_db: dbSaveCompleteTime,
                  details: 'Successfully generated and saved search query to database'
                }
              });
            } catch (e) {
              console.error("Error updating debug info for DB save:", e);
              return JSON.stringify({
                reasoning_agent: {
                  status: 'passed',
                  time_started: generationStartTime,
                  time_completed: generationCompleteTime,
                  time_saved_to_db: dbSaveCompleteTime,
                  details: 'Successfully generated and saved search query to database',
                  search_query_length: result.search_query?.length || 0,
                  saving_to_db: 'success'
                }
              });
            }
          });
          
          toast.success("Search query saved successfully", {
            description: "Your blueprint is ready for review"
          });
    } catch (error) {
          console.error("Error saving search query to database:", error);
          
          // Extract error message with type handling
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Update debug info with failure for saving to database
          setDebugResults(prevDebug => {
            try {
              const currentDebug = prevDebug ? JSON.parse(prevDebug) : {};
              return JSON.stringify({
                ...currentDebug,
                reasoning_agent: {
                  ...currentDebug.reasoning_agent,
                  status: 'failed',
                  saving_to_db: 'failed',
                  error: errorMessage,
                  details: 'Generated search query but failed to save to database'
                }
              });
            } catch (e) {
              console.error("Error updating debug info for DB save failure:", e);
              return JSON.stringify({
                reasoning_agent: {
                  status: 'failed',
                  time_started: generationStartTime,
                  time_completed: generationCompleteTime,
                  details: 'Generated search query but failed to save to database',
                  search_query_length: result.search_query?.length || 0,
                  saving_to_db: 'failed',
                  error: errorMessage
                }
              });
            }
          });
          
          toast.error("Failed to save search query", {
            description: "Please try again or contact support if the issue persists"
          });
        }
      } else {
        if (!tempBlueprintId) {
          console.warn("No blueprint ID available to save search query");
          toast.warning("Blueprint ID not available", {
            description: "Search query generated but couldn't be saved without a blueprint ID"
          });
        } else if (!result.search_query) {
          console.warn("No search query generated to save");
          toast.warning("No search query generated", {
            description: "Please try again or contact support"
          });
        }
        
        // Update debug info with missing data for saving to database
        setDebugResults(prevDebug => {
          try {
            const currentDebug = prevDebug ? JSON.parse(prevDebug) : {};
            const reason = !tempBlueprintId 
              ? "Missing blueprint ID" 
              : !result.search_query 
                ? "No search query generated" 
                : "Unknown reason";
                
            return JSON.stringify({
              ...currentDebug,
              reasoning_agent: {
                ...currentDebug.reasoning_agent,
                status: 'warning',
                saving_to_db: 'skipped',
                details: `Generated search query but could not save to database: ${reason}`
              }
            });
          } catch (e) {
            console.error("Error updating debug info for DB save skip:", e);
            return JSON.stringify({
              reasoning_agent: {
                status: 'warning',
                time_started: generationStartTime,
                time_completed: generationCompleteTime,
                details: 'Generated search query but could not save to database',
                search_query_length: result.search_query?.length || 0,
                saving_to_db: 'skipped',
                reason: !tempBlueprintId 
                  ? "Missing blueprint ID" 
                  : !result.search_query 
                    ? "No search query generated" 
                    : "Unknown reason"
              }
            });
          }
        });
      }

    } catch (error) {
      console.error("Error in generateFinalBlueprint:", error);
      
      // Extract error message with type handling
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      toast.error("Failed to generate blueprint", {
        description: errorMessage || "An unexpected error occurred"
      });
      
      // Update debug info with failure
      setDebugResults(prevDebug => {
        try {
          const currentDebug = prevDebug ? JSON.parse(prevDebug) : {};
          return JSON.stringify({
            ...currentDebug,
            reasoning_agent: {
              ...currentDebug.reasoning_agent,
              status: 'failed',
              error: errorMessage,
              details: 'Failed to generate search query'
            }
          });
        } catch (e) {
          console.error("Error updating debug info for generation failure:", e);
          return JSON.stringify({
            reasoning_agent: {
              status: 'failed',
              time_started: generationStartTime,
              error: errorMessage,
              details: 'Failed to generate search query'
            }
          });
        }
      });
    } finally {
      setIsGeneratingFinalBlueprint(false);
    }
  };

  // Handle submission of the current question and optionally move to the next one
  const handleQuestionSubmit = async (moveToNext: boolean = true) => {
    if (!currentResponse.trim()) {
      toast.warning("Please provide a response before continuing");
      return false;
    }
    
    const currentQuestion = questions[activeQuestionIndex];
    if (!currentQuestion) {
      console.error("No active question found");
      return false;
    }
    
    // Save to local state - this ensures responses are saved even if the API fails
    const updatedResponses = {
      ...responses,
      [currentQuestion.id]: currentResponse
    };
    
    setResponses(updatedResponses);
    
    // Mark as complete
    setQuestionStatus(prev => ({
      ...prev,
      [currentQuestion.id]: "complete"
    }));
    
    // Use a state variable to track saving status
    let savedSuccessfully = false;
    
    // Save response to database if we have a blueprint_id
    if (tempBlueprintId) {
      try {
        // Show unobtrusive loading indicator
        toast.loading("Saving your response...", { id: "saving-response" });
        
        // Our new saveResponseToDatabase function doesn't throw errors but returns success/failure
        savedSuccessfully = await saveResponseToDatabase(tempBlueprintId, currentQuestion.id.toString(), currentResponse);
        
        if (savedSuccessfully) {
          console.log(`Response saved for question ${currentQuestion.id}`);
          toast.success("Response saved", { id: "saving-response" });
        } else {
          // We already show appropriate toasts in the saveResponseToDatabase function
          toast.dismiss("saving-response");
          console.log("Response saved locally only");
          
          // Still mark as successful for UI flow
          savedSuccessfully = true;
        }
      } catch (error) {
        // This should only happen for input validation errors
        console.error('Error in save response flow:', error);
        
        toast.error("Couldn't save your response", { 
          id: "saving-response",
          description: "Your response is saved locally and will be included in the final blueprint."
        });
        
        // Despite error, we still want to continue - consider it successful for UI flow
        savedSuccessfully = true;
      }
    } else {
      console.warn('No temporary blueprint ID available, response not saved to database');
      toast.warning("Response saved locally only", {
        description: "Your response is saved for this session but not synced to the server."
      });
      
      // Consider it successful for UI flow
      savedSuccessfully = true;
    }
    
    // Optionally move to the next question
    if (moveToNext && activeQuestionIndex < questions.length - 1) {
      // Clear the response field for the next question
      setCurrentResponse("");
      
      // Set the new active question
      const nextIndex = activeQuestionIndex + 1;
      setActiveQuestionIndex(nextIndex);
      
      // If this question has a saved response, populate the text field
      const nextQuestion = questions[nextIndex];
      if (nextQuestion && responses[nextQuestion.id]) {
        setCurrentResponse(responses[nextQuestion.id]);
      }
    }
    
    return savedSuccessfully;
  };

  // Handle form submission based on current step
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    try {
      if (currentStep === 'prompt') {
        // Check if this is an existing blueprint with changes
        if (isExistingBlueprint && promptChanged) {
          // Show confirmation instead of proceeding directly
          setShowConfirmation(true);
          return;
        }
        
        await handleInitialPrompt();
      } else if (currentStep === 'conversation') {
        // First save the current response if there is one
        if (currentResponse.trim()) {
          // If saving failed, ask the user if they want to continue anyway
          const saveSuccessful = await handleQuestionSubmit(false);
          
          if (!saveSuccessful) {
            const shouldContinue = window.confirm(
              "There was a problem saving your last response. Do you want to continue to the review step anyway?"
            );
            
            if (!shouldContinue) {
              return;
            }
          }
        }
        
        // Check if we have responses for all questions
        const allQuestionsAnswered = questions.every(q => questionStatus[q.id] === 'complete');
        
        if (!allQuestionsAnswered) {
          const unansweredCount = questions.filter(q => questionStatus[q.id] !== 'complete').length;
          
          const shouldContinue = window.confirm(
            `You haven't answered ${unansweredCount} question${unansweredCount > 1 ? 's' : ''}. Do you want to continue to the review step anyway?`
          );
          
          if (!shouldContinue) {
            return;
          }
        }
        
        setIsLoading(true);
        
        try {
          // Check if we already have a search query, no need to regenerate
          if (finalData && finalData.search_query) {
            console.log("Using existing search query for review step:", finalData.search_query);
            // Make sure editableSearchQuery is in sync with finalData
            if (!editableSearchQuery) {
              setEditableSearchQuery(finalData.search_query);
            }
            // Move to review step
            setCurrentStep('review');
          } else {
            // Show a specific toast for generating search query
            toast.loading("Generating search query...", { id: "generate-search-query" });
          // Generate the final blueprint data based on responses
          await generateFinalBlueprint();
            // The success toast is now handled in the generateFinalBlueprint function
          // Move to review step
          setCurrentStep('review');
          }
        } catch (error) {
          console.error("Error generating final blueprint:", error);
          toast.error("Failed to generate final blueprint", {
            description: "Please try again or contact support if the issue persists"
          });
        } finally {
          setIsLoading(false);
        }
      } else if (currentStep === 'review') {
        await handleCreateBlueprint();
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error("Something went wrong", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    }
  };

  const handleBack = () => {
    if (currentStep === 'conversation') {
      setCurrentStep('prompt');
    } else if (currentStep === 'review') {
      setCurrentStep('conversation');
    }
  };

  const handleExampleClick = (exampleContent: string) => {
    setPrompt(exampleContent);
  };

  // Auto-save function with debounce
  const autoSaveResponse = async (questionId: number, responseText: string) => {
    if (!tempBlueprintId || !responseText.trim()) return;
    
    try {
      setAutoSaving(true);
      
      // Save to database with our non-throwing function
      const success = await saveResponseToDatabase(tempBlueprintId, questionId.toString(), responseText);
      
      if (success) {
        console.log(`Auto-saved response for question ${questionId}`);
        // No toast for successful auto-save to avoid UI noise
      } else {
        console.log(`Auto-save failed for question ${questionId}, but saved locally`);
        // No toast for failed auto-save either, as saveResponseToDatabase already shows appropriate toasts
      }
    } catch (error) {
      // This should only happen for input validation errors
      console.error('Error auto-saving response:', error);
      // For auto-save, we'll only show a toast for unexpected errors
      toast.error("Couldn't auto-save response", {
        description: "Your changes will be saved when you continue."
      });
    } finally {
      setAutoSaving(false);
    }
  };

  // Handle response field blur (when user clicks away from the input)
  const handleResponseBlur = async () => {
    const currentQuestion = questions[activeQuestionIndex];
    if (!currentQuestion || !currentResponse.trim()) return;
    
    // Cancel any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    
    // Auto-save on blur
    await autoSaveResponse(currentQuestion.id, currentResponse);
  };

  // New helper function to handle response updates from any source
  const handleResponseUpdate = (newResponse: string) => {
    // Update the current response state
    setCurrentResponse(newResponse);
    
    // Get the current question
    const currentQuestion = questions[activeQuestionIndex];
    if (!currentQuestion || !newResponse.trim() || !tempBlueprintId) return;
    
    // Save the response to state
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: newResponse
    }));
    
    // Mark as complete if it has content
    if (newResponse.trim()) {
      setQuestionStatus(prev => ({
        ...prev,
        [currentQuestion.id]: "complete"
      }));
    }
    
    // Cancel any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set up a new auto-save timeout
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveResponse(currentQuestion.id, newResponse);
    }, 1500);
  };

  // Update current active question with response (refactored to use handleResponseUpdate)
  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleResponseUpdate(e.target.value);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Update tempBlueprintId whenever temporaryBlueprintId prop changes  
  useEffect(() => {
    if (temporaryBlueprintId) {
      console.log("temporaryBlueprintId prop changed to:", temporaryBlueprintId);
      setTempBlueprintId(temporaryBlueprintId);
    }
  }, [temporaryBlueprintId]);

  // Add debug functionality
  const debugBlueprint = async (forceRefresh = false) => {
    // If there's no blueprint ID, show an error message
    if (!tempBlueprintId) {
      setDebugResults("No tempBlueprintId found");
      setIsDebugOpen(true);
      return;
    }
    
    // Always refresh data when Debug button is clicked
    // If debug panel is already open, keep it open and refresh
    if (isDebugOpen) {
      setDebugResults(`Refreshing blueprint details for ID: ${tempBlueprintId}...`);
    } else {
      // First time opening
      setDebugResults(`Loading comprehensive blueprint details for ID: ${tempBlueprintId}...`);
      setIsDebugOpen(true); // Open the debug panel
    }
    
    setIsLoading(true);
    
    try {
      const timestamp = Date.now();
      let blueprintData = null;
      let questionsData = null;
      let formattedQA = []; // Keep as let since it's reassigned later
      const dbDetails = null;
      const finalizedBlueprintData = null;
      let searchQueryAnalysis = null;
      let userData = null;
      
      // Try to fetch current user data using our debug endpoint first
      try {
        console.log(`[DEBUG] Attempting to fetch detailed user profile data from debug endpoint...`);
        const debugResponse = await fetch('/api/debug/user-profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        console.log(`[DEBUG] Debug profile API response status: ${debugResponse.status} ${debugResponse.statusText}`);
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          console.log(`[DEBUG] Available user columns:`, debugData.debug_info.available_columns);
          console.log(`[DEBUG] Contains skill_level field: ${debugData.debug_info.contains_skill_level}`);
          console.log(`[DEBUG] Contains user_skill_level field: ${debugData.debug_info.contains_user_skill_level}`);
          console.log(`[DEBUG] Raw user data:`, debugData.raw_user_data);
          
          // Store the data for later use
          userData = debugData.raw_user_data;
          // Update the state variable
          setUserData(debugData.raw_user_data);
          
          // Check if we have the skill level in either field
          const skillLevel = userData.user_skill_level || userData.skill_level;
          const learningObjectives = userData.user_learning_goals || userData.learning_objectives;
          
          if (skillLevel) {
            console.log(`[DEBUG] Found user skill level from debug endpoint: ${skillLevel}`);
          } else {
            console.log(`[DEBUG] No skill level found in user data`);
          }
          
          if (learningObjectives) {
            console.log(`[DEBUG] Found learning objectives from debug endpoint: ${learningObjectives}`);
            console.log(`[DEBUG] Source field for learning objectives: ${userData.user_learning_goals ? 'user_learning_goals' : (userData.learning_objectives ? 'learning_objectives' : 'neither')}`);
          } else {
            console.log(`[DEBUG] No learning objectives found in user data`);
            console.log(`[DEBUG] Available fields in userData:`, Object.keys(userData));
          }
        } else {
          // Try to get more information about the error
          let errorDetails = '';
          try {
            const errorJson = await debugResponse.json();
            errorDetails = JSON.stringify(errorJson);
          } catch (parseError) {
            try {
              errorDetails = await debugResponse.text();
            } catch (textError) {
              errorDetails = 'Could not parse error response';
            }
          }
          
          console.warn(`[DEBUG] Failed to fetch debug user profile data. Status: ${debugResponse.status}, Details: ${errorDetails}`);
          console.log(`[DEBUG] Falling back to standard profile endpoint...`);
          
          // Proceed with the standard profile endpoint as fallback
          await fetchStandardProfileData();
        }
      } catch (debugError) {
        console.error(`[DEBUG] Exception when fetching debug profile:`, debugError);
        console.log(`[DEBUG] Falling back to standard profile endpoint...`);
        
        // Proceed with the standard profile endpoint as fallback
        await fetchStandardProfileData();
      }
      
      // Function to fetch data from the standard profile endpoint
      async function fetchStandardProfileData() {
        try {
          console.log(`[DEBUG] Attempting to fetch user profile data from /api/profile...`);
          const response = await fetch('/api/profile', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          console.log(`[DEBUG] Profile API response status: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            userData = await response.json();
            console.log(`[DEBUG] Successfully fetched user profile data:`, {
              id: userData.id,
              email: userData.email, 
              firstName: userData.firstName,
              lastName: userData.lastName,
              skill_level: userData.skill_level,
              learning_objectives: userData.learning_objectives
            });
            // Update the state variable
            setUserData(userData);
            
            // Log all fields to see what's available
            console.log(`[DEBUG] All available fields in profile data:`, Object.keys(userData));
            console.log(`[DEBUG] Raw learning_objectives value:`, userData.learning_objectives);
            
            if (!userData.learning_objectives) {
              console.log(`[DEBUG] learning_objectives field is empty, checking if there are other fields that might contain this data`);
              // Check if there are any fields that might contain learning objectives
              const possibleFields = ['user_learning_goals', 'learning_objective', 'learningObjectives'];
              for (const field of possibleFields) {
                if (field in userData) {
                  console.log(`[DEBUG] Found alternative field ${field} with value:`, userData[field]);
                }
              }
            }
          } else {
            // Try to get more information about the error
            let errorDetails = '';
            try {
              const errorJson = await response.json();
              errorDetails = JSON.stringify(errorJson);
            } catch (parseError) {
              try {
                errorDetails = await response.text();
              } catch (textError) {
                errorDetails = 'Could not parse error response';
              }
            }
            
            console.warn(`[DEBUG] Failed to fetch user profile data. Status: ${response.status}, Details: ${errorDetails}`);
          }
        } catch (userError) {
          console.error(`[DEBUG] Exception when fetching user profile:`, userError);
        }
      }

      // Fetch the blueprint details first
      try {
        console.log(`[DEBUG] Starting blueprint debugging for ID: ${tempBlueprintId}`);
        const response = await fetch(`/api/blueprints/${tempBlueprintId}?t=${timestamp}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Debug-Client': 'create-blueprint-modal'
        }
      });
      
        if (response.ok) {
          blueprintData = await response.json();
          console.log(`[DEBUG] Successfully fetched blueprint data for ID ${tempBlueprintId}:`, blueprintData);
          
          // If blueprint has search_query, analyze it
          if (blueprintData.search_query) {
            searchQueryAnalysis = analyzeSearchQuery(blueprintData.search_query);
            console.log(`[DEBUG] Analyzed search query:`, searchQueryAnalysis);
          }
      } else {
          const errorText = await response.text();
          console.error(`[DEBUG] Failed to fetch blueprint: ${response.status} ${response.statusText}`, errorText);
          blueprintData = { 
            error: `Failed to fetch blueprint: ${response.status} ${response.statusText}`,
            errorDetails: errorText
          };
        }
      } catch (blueprintError) {
        console.error("[DEBUG] Error fetching blueprint data:", blueprintError);
        blueprintData = { 
          error: "Error fetching blueprint data",
          errorDetails: blueprintError instanceof Error ? blueprintError.message : String(blueprintError)
        };
      }
      
      // Fetch questions data
      try {
        console.log(`[DEBUG] Fetching questions data for blueprint ID: ${tempBlueprintId}`);
        const questionsResponse = await fetch(`/api/blueprints/questions/responses?blueprint_id=${tempBlueprintId}&t=${timestamp}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Debug-Client': 'create-blueprint-modal'
          }
        });
        
        if (questionsResponse.ok) {
          questionsData = await questionsResponse.json();
          console.log(`[DEBUG] Successfully fetched questions data:`, questionsData);
        } else {
          const errorText = await questionsResponse.text();
          console.error(`[DEBUG] Failed to fetch questions: ${questionsResponse.status} ${questionsResponse.statusText}`, errorText);
          questionsData = { 
            error: `Failed to fetch questions: ${questionsResponse.status} ${questionsResponse.statusText}`,
            errorDetails: errorText
          };
        }
      } catch (questionsError) {
        console.error("[DEBUG] Error fetching questions data:", questionsError);
        questionsData = { 
          error: "Error fetching questions data",
          errorDetails: questionsError instanceof Error ? questionsError.message : String(questionsError)
        };
      }
      
      // Format the Q&A pairs for better readability
      if (questionsData?.questions && Array.isArray(questionsData.questions)) {
        console.log(`[DEBUG] Found ${questionsData.questions.length} questions in API response`);
        formattedQA = questionsData.questions.map((q: { id: number; title: string; content: string }) => ({
          id: q.id,
          title: q.title,
          question: q.content,
          response: questionsData.responses?.[q.id] || "No response"
        }));
      } else {
        console.log(`[DEBUG] No questions array found in API response:`, questionsData);
        // Instead of assigning an object to the array variable, create an array with one object
        formattedQA = [{
          error: "No questions array found in API response",
          responseFormat: questionsData ? Object.keys(questionsData) : null
        }];
      }
      
      // Structure the debug information in the new organized format
      const debugInfo = {
        id: tempBlueprintId,
        blueprint_id: blueprintData?.id || tempBlueprintId,
        title: blueprintData?.title || title || "Untitled Blueprint", // Use the state title as fallback
        blueprint_title: blueprintData?.title || title || "Untitled Blueprint", // Keep for backwards compatibility
        prompt: blueprintData?.prompt || prompt || "No prompt available", // Use state prompt as fallback
        questions: questionsData?.questions || [],
        responses: questionsData?.responses || {},
        skill_level: blueprintData?.skill_level || userData?.skill_level || userData?.user_skill_level || "Not specified",
        learning_objective: (() => {
          // Check for learning objectives in all possible fields
          if (blueprintData?.learning_objective) return blueprintData.learning_objective;
          if (userData?.user_learning_goals) return userData.user_learning_goals;
          if (userData?.learning_objectives) return userData.learning_objectives;
          if (userData?.learning_objective) return userData.learning_objective;
          if (userData?.learningObjectives) return userData.learningObjectives;
          return "Not specified";
        })(),
        is_temporary: blueprintData?.is_temporary || false,
        status: 'pending', // Default status, will update below
        
        // Organize agent data
        agents: {
          reasoning_agent: {
            // Check if all questions have responses to determine if reasoning passed
            status: (() => {
              // If we have a search_query, it's definitely passed
              if (blueprintData?.search_query) return 'passed';
              
              // Otherwise, check if all questions have responses
              const questions = questionsData?.questions || [];
              const responses = questionsData?.responses || {};
              
              // If there are no questions, consider it pending
              if (questions.length === 0) return 'pending';
              
              // If all questions have responses, mark as passed
              const allQuestionsAnswered = questions.every(
                (q: { id: number }) => responses[q.id] !== undefined
              );
              
              return allQuestionsAnswered ? 'passed' : 'pending';
            })(),
            inputs: {
              prompt: blueprintData?.prompt || "No prompt available",
              questions_and_answers: formattedQA,
              user_profile: {
                skill_level: blueprintData?.skill_level || userData?.skill_level || userData?.user_skill_level || "Not specified",
                learning_objective: (() => {
                  // Check for learning objectives in all possible fields
                  if (blueprintData?.learning_objective) return blueprintData.learning_objective;
                  if (userData?.user_learning_goals) return userData.user_learning_goals;
                  if (userData?.learning_objectives) return userData.learning_objectives;
                  if (userData?.learning_objective) return userData.learning_objective;
                  if (userData?.learningObjectives) return userData.learningObjectives;
                  return "Not specified";
                })(),
                user_data_source: userData ? "Database user profile" : "Not fetched from database"
              }
            },
            outputs: blueprintData?.search_query ? {
              search_query: blueprintData.search_query,
              search_instruction_analysis: searchQueryAnalysis?.search_instructions || "Not analyzed",
              output_format_analysis: searchQueryAnalysis?.output_format || "Not analyzed"
            } : undefined
          },
          research_agent: {
            // For testing purposes, mark as passed if we have a search_query
            // This allows completing all 3 steps without finalization
            status: (() => {
              // Check if a search_query exists - that means reasoning step passed
              if (!blueprintData?.search_query) return 'pending';
              
              // If the search_query exists, the research agent can be marked as passed
              // This is for debug/testing purposes only
              return 'passed';
            })(),
            inputs: blueprintData?.search_query ? {
              search_query: blueprintData.search_query
            } : undefined,
            // Add mock outputs for testing - using proper PerplexityResearchResponse format
            outputs: blueprintData?.search_query ? {
              structured_data: {
                complexity: "medium",
                steps: [
                  {
                    number: 1,
                    title: "Define System Requirements",
                    estimated_time: 60,
                    instructions: [
                      "Identify key data points needed from customer support tickets",
                      "Define success criteria for solution suggestions",
                      "Establish integration points with existing support systems"
                    ],
                    tools: ["Project Management Software", "Documentation Tools"],
                    subtasks: [
                      {task_number: 1, description: "Create requirements document", estimated_time: 30},
                      {task_number: 2, description: "Get stakeholder approval", estimated_time: 20}
                    ]
                  },
                  {
                    number: 2,
                    title: "Data Collection & Preparation",
                    estimated_time: 120,
                    instructions: [
                      "Gather historical support tickets",
                      "Clean and normalize ticket data",
                      "Extract resolution patterns and categorize solutions"
                    ],
                    tools: ["Data Processing Tools", "Database Management System"],
                    subtasks: [
                      {task_number: 1, description: "Export ticket data from support system", estimated_time: 30},
                      {task_number: 2, description: "Implement data cleaning scripts", estimated_time: 45}
                    ]
                  }
                ],
                sources: [
                  {
                    title: "Best Practices for AI in Customer Support",
                    url: "https://example.com/ai-customer-support",
                    snippet: "AI systems for customer support should maintain context and provide specific solutions."
                  }
                ],
                usage_metrics: {
                  citation_tokens: 150,
                  search_queries: 5
                }
              },
              raw_data: JSON.stringify({
                complexity: "medium",
                steps: [
                  {
                    number: 1,
                    title: "Define System Requirements",
                    estimated_time: 60,
                    instructions: [
                      "Identify key data points needed from customer support tickets",
                      "Define success criteria for solution suggestions",
                      "Establish integration points with existing support systems"
                    ],
                    tools: ["Project Management Software", "Documentation Tools"],
                    subtasks: [
                      {task_number: 1, description: "Create requirements document", estimated_time: 30},
                      {task_number: 2, description: "Get stakeholder approval", estimated_time: 20}
                    ]
                  },
                  {
                    number: 2,
                    title: "Data Collection & Preparation",
                    estimated_time: 120,
                    instructions: [
                      "Gather historical support tickets",
                      "Clean and normalize ticket data",
                      "Extract resolution patterns and categorize solutions"
                    ],
                    tools: ["Data Processing Tools", "Database Management System"],
                    subtasks: [
                      {task_number: 1, description: "Export ticket data from support system", estimated_time: 30},
                      {task_number: 2, description: "Implement data cleaning scripts", estimated_time: 45}
                    ]
                  }
                ]
              })
            } : undefined
          }
        },
        
        // Keep the raw data for reference
        raw_blueprint_data: blueprintData,
        raw_questions_data: questionsData,
        raw_db_details: dbDetails
      };
      
      // Set overall status based on agent statuses AND question completion
      // Check if all questions are answered
      const questions = questionsData?.questions || [];
      const responses = questionsData?.responses || {};
      const questionCount = questions.length;
      const responseCount = Object.keys(responses).length;
      
      // If all questions are answered, this indicates the first stage is passed
      // even if reasoning_agent.status isn't explicitly set
      if (questionCount > 0 && questionCount === responseCount) {
        debugInfo.agents.reasoning_agent.status = 'passed';
        
        // If reasoning is passed and research is either passed or we're in testing mode
        // (which means we consider research passed if reasoning is passed)
        if (debugInfo.agents.reasoning_agent.status === 'passed') {
          // For testing purposes, we're allowing the overall status to be passed
          // when all questions are answered
          debugInfo.status = 'passed';
          debugInfo.agents.research_agent.status = 'passed';
        }
      } else if (debugInfo.agents.reasoning_agent.status === 'passed' && 
                debugInfo.agents.research_agent.status === 'passed') {
        debugInfo.status = 'passed';
      } else if (debugInfo.agents.reasoning_agent.status === 'failed' || 
                debugInfo.agents.research_agent.status === 'failed') {
        debugInfo.status = 'failed';
      }
      
      // Display formatted debug info
      setDebugResults(JSON.stringify(debugInfo, null, 2));
      
      toast.success(forceRefresh ? "Debug data refreshed" : "Debug data loaded", {
        description: "Blueprint data and agent info retrieved"
      });
      
    } catch (error) {
      console.error("Blueprint debug error:", error);
      setDebugResults(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
      toast.error("Debug error", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to analyze search query
  const analyzeSearchQuery = (searchQuery: string) => {
    try {
      // Extract sections from the search query
      const searchInstructions = extractSearchInstructions(searchQuery);
      const outputFormat = extractOutputFormat(searchQuery);
      
      return {
        search_instructions: searchInstructions,
        output_format: outputFormat,
        reasoning_process: "Analysis of reasoning process would normally be extracted from API logs"
      };
    } catch (error) {
      console.error("Error analyzing search query:", error);
      return {
        search_instructions: "Error analyzing search instructions",
        output_format: "Error analyzing output format",
        reasoning_process: "Error analyzing reasoning process"
      };
    }
  };
  
  // Helper function to extract search instructions from the query
  const extractSearchInstructions = (searchQuery: string) => {
    // Look for instructions about what to search for
    const lines = searchQuery.split(/[.?!]\s+/);
    const searchLines = lines.filter(line => 
      line.toLowerCase().includes("search") || 
      line.toLowerCase().includes("find") ||
      line.toLowerCase().includes("develop") ||
      line.toLowerCase().includes("create") ||
      line.toLowerCase().includes("build")
    );
    
    return searchLines.length > 0 
      ? searchLines.join(". ") 
      : "No explicit search instructions found. The entire query appears to be search instructions.";
  };
  
  // Helper function to extract output format from the query
  const extractOutputFormat = (searchQuery: string) => {
    // Look for instructions about output format
    const formatIndicators = [
      "JSON format", 
      "structured format", 
      "output should be", 
      "return format", 
      "generate in", 
      "provide"
    ];
    
    for (const indicator of formatIndicators) {
      const index = searchQuery.toLowerCase().indexOf(indicator.toLowerCase());
      if (index !== -1) {
        // Extract the sentence containing this indicator
        const startSentence = searchQuery.lastIndexOf(".", index) + 1;
        const endSentence = searchQuery.indexOf(".", index + 1);
        if (endSentence !== -1) {
          return searchQuery.substring(startSentence, endSentence).trim();
        }
      }
    }
    
    return "No explicit output format instructions found in the search query.";
  };

  // Modify the deleteBlueprint function to use the dialog instead of window.confirm
  const deleteBlueprint = async () => {
    if (!tempBlueprintId) {
      toast.error("No blueprint ID found");
      return;
    }
    
    // Open the confirmation dialog instead of using window.confirm
    setShowDeleteConfirmation(true);
    
    // Reset any previous debug data
    setDeleteDebugData(null);
  };
  
  // Add a separate function to handle the actual deletion after confirmation
  const handleConfirmedDeletion = async () => {
    if (!tempBlueprintId) return;
    
    setIsLoading(true);
    setShowDeleteConfirmation(false);
    
    // Show debug panel before making the request
    setIsDebugOpen(true);
    
    // Get the blueprint title first for better debugging context
    let blueprintTitle = "Unknown";
    
    // Try to get the blueprint title from the form state if available
    if (title) {
      blueprintTitle = title;
    }
    
    // Create debug info object
    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      blueprint_id: tempBlueprintId,
      blueprint_title: blueprintTitle,
      request: {
        url: `/api/blueprints/${tempBlueprintId}`,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      },
      response: {
        status: 0,
        statusText: '',
        headers: {}
      }
    };
    
    try {
      // Log the request for debugging
      console.log(`[DELETE DEBUG] Attempting to delete blueprint: ${blueprintTitle} (${tempBlueprintId})`);
      
      // Set initial debug data so user can see request is in progress
      setDeleteDebugData({...debugInfo, status: 'request_in_progress'});
      
      const response = await fetch(`/api/blueprints/${tempBlueprintId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      // Add response to debug info
      debugInfo.response = {
        status: response.status,
        statusText: response.statusText,
        headers: {}
      };
      
      // Get headers for debugging
      response.headers.forEach((value, key) => {
        debugInfo.response.headers[key] = value;
      });
      
      // Get response body as text first for debugging
      const responseText = await response.text();
      debugInfo.response.rawText = responseText;
      
      // Try to parse as JSON if possible
      let jsonData = null;
      try {
        jsonData = JSON.parse(responseText);
        debugInfo.response.body = jsonData;
      } catch (_parseError) {
        debugInfo.response.body = null;
        debugInfo.response.parseError = "Failed to parse response as JSON";
      }
      
      // Initial success based on API response
      const initialSuccess = response.ok && (
        response.status === 204 || 
        (jsonData && (jsonData.success === true || jsonData.deleted === true))
      );
      
      debugInfo.api_response_indicates_success = initialSuccess;
      
      // Now verify if the blueprint was ACTUALLY deleted by checking if it still exists
      let verifiedDeleted = false;
      let verificationResponse = null;
      
      try {
        // Wait a short time to allow backend processing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to fetch the blueprint to see if it still exists
        const verifyResponse = await fetch(`/api/blueprints/${tempBlueprintId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        verificationResponse = {
          status: verifyResponse.status,
          statusText: verifyResponse.statusText
        };
        
        // If we get a 404, the blueprint was deleted successfully
        // If we get a 200, the blueprint still exists
        verifiedDeleted = verifyResponse.status === 404;
        
        // Add verification data
        if (verifyResponse.status === 200) {
          // Blueprint still exists
          try {
            const verifyData = await verifyResponse.json();
            verificationResponse = {
              ...verificationResponse,
              data: {
                exists: true,
                title: verifyData.title || "Unknown"
              }
            };
          } catch (_e) {
            verificationResponse = {
              ...verificationResponse,
              parseError: "Could not parse verification response"
            };
          }
        }
      } catch (verifyError) {
        verificationResponse = {
          error: verifyError instanceof Error ? verifyError.message : String(verifyError)
        };
      }
      
      // Add verification results to debug info
      debugInfo.verification = {
        method: "Fetch blueprint after delete",
        verified_deleted: verifiedDeleted,
        response: verificationResponse
      };
      
      // Final success is based on both API response AND verification
      debugInfo.success = verifiedDeleted;
      
      // Update UI based on verification, not just API response
      setDeleteDebugData(debugInfo);
      
      if (verifiedDeleted) {
        toast.success("Blueprint deleted successfully");
      } else {
        toast.error("Delete operation failed verification", { 
          description: "API reported success but blueprint still exists" 
        });
      }
      
    } catch (error) {
      // Handle errors
      debugInfo.success = false;
      debugInfo.networkError = error instanceof Error ? error.message : String(error);
      
      setDeleteDebugData(debugInfo);
      console.error("[DELETE DEBUG] Error deleting blueprint:", error, debugInfo);
      
      toast.error("Failed to delete blueprint", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add the generateTitle function
  const generateTitle = async (promptText: string) => {
    try {
      const titleData = await post('/api/blueprints/generate-title', {
        prompt: promptText,
      });
      return titleData.title || `Draft: ${promptText.substring(0, 30)}...`;
    } catch (error) {
      console.error('Error generating title:', error);
      return `Draft: ${promptText.substring(0, 30)}...`;
    }
  };

  // Now modify the handleInitialPrompt function around line 1629
  // Replace the blueprint creation part with our new approach

  const handleInitialPrompt = async () => {
    if (!prompt || prompt.trim() === '') {
      toast.error("Please enter a prompt for your blueprint");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Step 1: Create a temporary blueprint first
      if (!tempBlueprintId) {
        console.log("No temporary blueprint ID found, creating one now");
        
        // Generate just the title for the blueprint
        const generatedTitle = await generateTitle(prompt);
        console.log("Generated title:", generatedTitle);
        
        try {
          // Create a minimal blueprint with empty details - we'll update it after getting questions
          const blueprintData = await post('/api/blueprints', {
            title: generatedTitle,
            prompt: prompt,
            details: "", // Empty details initially
            visibility: 'private',
            is_temporary: true
          });
          
          console.log('Created temporary blueprint with ID:', blueprintData.id);
          console.log('Blueprint data received:', blueprintData);
          setTempBlueprintId(blueprintData.id);
          
          // Add a slight delay to allow database propagation
          console.log("Waiting for database propagation...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Fetch questions directly using the new blueprint ID
          // The questions API will return a title and description we can use to update the blueprint
          console.log('Fetching questions with new blueprint ID', blueprintData.id);
          await fetchQuestionsDirectly(prompt, blueprintData.id);
        } catch (error) {
          console.error('Error creating temporary blueprint:', error);
          toast.error("Failed to create temporary blueprint", {
            description: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      } else {
        console.log('Using existing temporary blueprint ID:', tempBlueprintId);
        // If we already have a temporary blueprint ID, just fetch questions
        console.log('Fetching questions with existing blueprint ID', tempBlueprintId);
        await fetchQuestionsDirectly(prompt, tempBlueprintId);
      }
      
      // Move to conversation step
      setCurrentStep('conversation');
    } catch (error) {
      console.error('Error in initial prompt handling:', error);
      toast.error("Failed to process your request", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add the direct blueprint update function before fetchQuestionsDirectly
  // Add this around line 1680 (before the fetchQuestionsDirectly function)

  // New simple function to fetch questions directly
  const fetchQuestionsDirectly = async (userPrompt: string, blueprintId: string) => {
    console.log(`Fetching questions for blueprint ${blueprintId}`);
    
    try {
      // Validate inputs before making the request
      if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
        throw new Error('User prompt is required');
      }
      
      if (!blueprintId || typeof blueprintId !== 'string' || blueprintId.trim() === '') {
        throw new Error('Blueprint ID is required');
      }
      
      // Clean and prepare the request data
      const requestData = {
        prompt: userPrompt.trim(),
        blueprint_id: blueprintId.trim()
      };
      
      // Make sure the data is safe for JSON
      const safeRequestData = makeJsonSafe(requestData);
      
      console.log('Sending request to questions API:', safeRequestData);
      
      // Use the post helper from fetch-wrapper for consistent error handling
      const { post } = await import('@/utils/fetch-wrapper');
      
      const questionsData = await post('/api/blueprints/questions', safeRequestData);
      
      console.log('Questions API response:', questionsData);
      
      // Extract title and description from the API response
      const apiTitle = questionsData.title || questionsData.blueprint_title;
      const apiDescription = questionsData.description || questionsData.blueprint_description;
      
      if (apiTitle) {
        console.log('Setting blueprint title from API response:', apiTitle);
        setTitle(apiTitle);
      }
      
      if (apiDescription) {
        console.log('Setting blueprint description from API response:', apiDescription);
        setDescription(apiDescription);
        
        // Comment out the legacy PATCH request - data is already saved in the database
        /*
        try {
          console.log(`Updating blueprint ${blueprintId} with description from questions API`);
          
          // FIX: Use PATCH endpoint to update instead of POST which may create a new record
          // const updateResponse = await post('/api/blueprints', {
          const updateResponse = await fetch(`/api/blueprints/${blueprintId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: apiTitle,
              details: apiDescription,
              prompt: userPrompt,
              is_temporary: true,
              visibility: 'private'
            }),
            credentials: 'include'
          }).then(res => res.json());
          
          console.log('Blueprint updated with description:', updateResponse);
        } catch (updateError) {
          console.error('Failed to update blueprint with description:', updateError);
          // Store in localStorage as fallback
          localStorage.setItem(`blueprint_details_${blueprintId}`, apiDescription);
        }
        */
      } else {
        // Create a fallback description if none was provided by the API
        console.log('No description found in API response, generating fallback');
        const fallbackDescription = `This blueprint will create an AI that ${userPrompt.toLowerCase().startsWith('i need') ? userPrompt.substring(7) : userPrompt}`;
        setDescription(fallbackDescription);
        
        // Comment out the legacy PATCH request - store in localStorage only
        /*
        // Try to update the blueprint with the fallback description
        try {
          // FIX: Use PATCH endpoint to update instead of POST which may create a new record
          // await post('/api/blueprints', {
          await fetch(`/api/blueprints/${blueprintId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              details: fallbackDescription,
              is_temporary: true
            }),
            credentials: 'include'
          });
          
        } catch (fallbackError) {
          console.error('Failed to update with fallback description:', fallbackError);
          localStorage.setItem(`blueprint_details_${blueprintId}`, fallbackDescription);
        }
        */
        
        // Just store in localStorage directly since we're not doing the PATCH
        localStorage.setItem(`blueprint_details_${blueprintId}`, fallbackDescription);
      }
      
      // Process questions from the API response
      if (questionsData.questions && Array.isArray(questionsData.questions)) {
        console.log('Received questions array:', questionsData.questions);
        
        // Ensure we have at least 4 questions
        let questionsToUse = questionsData.questions;
        if (questionsToUse.length < 4) {
          console.log('Adding additional generic questions to reach minimum of 4');
          const genericQuestions = [
            {
              id: 901,
              title: "Target audience",
              content: "Who will be using this AI tool? What's their technical background and role?"
            },
            {
              id: 902,
              title: "Use frequency",
              content: "How often will this AI tool be used? Is it for daily operations or occasional tasks?"
            },
            {
              id: 903,
              title: "Success criteria",
              content: "What metrics or outcomes will determine if this AI tool is successful?"
            },
            {
              id: 904,
              title: "Integration needs",
              content: "Does this AI need to integrate with existing systems or tools? Which ones?"
            }
          ];
          
          // Add only as many generic questions as needed
          const additionalNeeded = 4 - questionsToUse.length;
          questionsToUse = [
            ...questionsToUse,
            ...genericQuestions.slice(0, additionalNeeded)
          ];
        }
        
        // Define a type for question items
        type QuestionItem = {
          id?: number;
          title?: string;
          content?: string;
          [key: string]: unknown;
        };
        
        // Make sure all questions have the required properties
        const validatedQuestions = questionsToUse.map((q: QuestionItem, index: number) => ({
          id: typeof q.id === 'number' ? q.id : index + 1,
          title: q.title || `Question ${index + 1}`,
          content: q.content || "Please provide more details about this aspect of your project."
        }));
        
        // Initialize question status map
        const initialStatus = validatedQuestions.reduce((acc: QuestionStatusMap, q: { id: number; title: string; content: string }) => {
          acc[q.id] = "pending";
          return acc;
        }, {});
        
        setQuestions(validatedQuestions);
        setQuestionStatus(initialStatus);
        
        // Set the first question as active and clear the response field
        setActiveQuestionIndex(0);
        setCurrentResponse("");
        
        console.log('Questions processed and ready:', validatedQuestions.length);
      } else {
        console.error('Invalid response format from questions API:', questionsData);
        toast.error("Invalid response format", {
          description: "We received an unexpected response format from our AI service."
        });
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error("Failed to fetch questions", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  // Add a handler for prompt changes that tracks if an existing blueprint's prompt has changed
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setPrompt(newValue);
    
    // Track if prompt was changed from initial value
    if (isExistingBlueprint && newValue !== initialPrompt) {
      setPromptChanged(true);
    } else if (isExistingBlueprint && newValue === initialPrompt) {
      setPromptChanged(false);
    }
  };

  // Add this after the handleResponseChange function
  const generateBoilerplateAnswer = async (questionId: number, questionContent: string, answerLength: 'short' | 'medium' | 'long' = 'medium') => {
    const TOAST_ID = "generate-answer"; // Consistent toast ID to avoid handling issues
    
    try {
      setIsGeneratingAnswer(true);
      toast.loading("Generating answer...", { id: TOAST_ID });
      
      console.log("Generating answer for question:", {
        questionId,
        content: questionContent.substring(0, 150) + (questionContent.length > 150 ? '...' : ''),
        blueprint_id: tempBlueprintId,
        length: answerLength
      });
      
      const response = await fetch("/api/blueprints/generate-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          question: questionContent,
          blueprint_id: tempBlueprintId,
          length: answerLength
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate answer: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.answer) {
        console.log("Generated answer length:", data.answer.length, "characters");
        console.log("Generated answer preview:", data.answer.substring(0, 100) + "...");
        
        // Set current response
        setCurrentResponse(data.answer);
        
        // Find the current question
        const currentQuestion = questions[activeQuestionIndex];
        if (!currentQuestion) {
          throw new Error("No current question found");
        }
        
        // Update responses state
        setResponses(prev => ({
          ...prev,
          [currentQuestion.id]: data.answer
        }));
        
        // Explicitly mark as complete
        setQuestionStatus(prev => ({
          ...prev,
          [currentQuestion.id]: "complete"
        }));
        
        // Cancel any pending auto-save timeout
          if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
            autoSaveTimeoutRef.current = null;
          }
          
        // Immediately save to database - don't wait for debounce
        if (tempBlueprintId) {
          console.log("Saving generated answer to database");
          // Note: our updated saveResponseToDatabase now properly merges with existing responses
          await saveResponseToDatabase(tempBlueprintId, currentQuestion.id.toString(), data.answer);
        }
        
        toast.success("Answer generated", { id: TOAST_ID });
      } else {
        throw new Error("No answer received from the API");
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      toast.error("Failed to generate answer", { 
        id: TOAST_ID,
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsGeneratingAnswer(false);
      
      // Ensure toast is always dismissed even if we missed it somehow
      setTimeout(() => {
        // Check if the loading toast is still showing and dismiss it
        if (document.querySelector('[data-toast-id="' + TOAST_ID + '"]')) {
          toast.dismiss(TOAST_ID);
          console.log("Force dismissed the generate answer toast that was stuck");
        }
      }, 500);
    }
  };

  // Add a state to prevent form submission when using the debug panel
  const [preventFormSubmit, setPreventFormSubmit] = useState(false);

  // Add an effect to manage form submission prevention when debug window is open
  useEffect(() => {
    if (isDebugOpen) {
      setPreventFormSubmit(true);
    } else {
      setPreventFormSubmit(false);
    }
  }, [isDebugOpen]);

  // Add userData as a state variable at the top of the component where the other state variables are defined
  const [userData, setUserData] = useState<any>(null);

  // Add a useEffect hook to fetch user profile data on component mount
  useEffect(() => {
    // Function to fetch user profile data
    const fetchUserProfile = async () => {
      try {
        console.log(`Fetching user profile data for blueprint creation...`);
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const userProfileData = await response.json();
          console.log(`Successfully fetched user profile data for blueprint creation`);
          
          // Set the userData state
          setUserData(userProfileData);
        } else {
          console.warn(`Failed to fetch user profile. Status: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error fetching user profile:`, error);
      }
    };
    
    // Call the function to fetch user profile
    fetchUserProfile();
  }, []); // Empty dependency array means this runs once on mount

  // Add this after other state variables around line 301
  const [editableSearchQuery, setEditableSearchQuery] = useState<string>(finalData?.search_query || "");

  // Add this useEffect after other useEffects
  useEffect(() => {
    if (finalData?.search_query) {
      setEditableSearchQuery(finalData.search_query);
    }
  }, [finalData]);

  // Add this handler function near other handlers
  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableSearchQuery(e.target.value);
    
    // Also update the finalData
    if (finalData) {
      setFinalData({
        ...finalData,
        search_query: e.target.value
      });
    }
  };

  // Add a function to handle direct tab navigation
  const handleTabClick = (step: 'prompt' | 'conversation' | 'review') => {
    // Log the request to verify the search query
    console.log("Verifying search query before tab change to:", step, {
      hasEditableSearchQuery: !!editableSearchQuery,
      hasFinalDataSearchQuery: !!(finalData && finalData.search_query),
      tempBlueprintId,
      timestamp: new Date().toISOString()
    });
    
    // Don't allow skipping steps if prerequisites aren't met
    if (step === 'conversation' && !prompt) {
      toast.error("Please enter a prompt first", {
        description: "You need to define your blueprint before proceeding"
      });
      return;
    }

    if (step === 'review') {
      // First check if all questions are answered
      const allQuestionsAnswered = questions.every(q => questionStatus[q.id] === 'complete');
      
      if (!allQuestionsAnswered) {
        toast.error("Please answer all questions first", {
          description: "You need to complete the questionnaire before proceeding to the review step"
        });
        return;
      }
      
      // If we have a search query already (from an existing blueprint), verify it's in the database
      if (editableSearchQuery || (finalData && finalData.search_query)) {
        // Make sure editableSearchQuery is in sync with finalData
        if (finalData && finalData.search_query && !editableSearchQuery) {
          console.log("Using existing search query from finalData:", finalData.search_query);
          setEditableSearchQuery(finalData.search_query);
        }
        
        // Verify the search query is saved in the database
        if (tempBlueprintId) {
          toast.loading("Verifying search query...");
          
          // Fetch the blueprint to check if search_query is actually saved
          fetch(`/api/blueprints/${tempBlueprintId}?t=${Date.now()}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          })
          .then(response => response.json())
          .then(blueprintData => {
            toast.dismiss();
            console.log("Verification results:", {
              blueprintId: blueprintData.id,
              hasSearchQueryInDb: !!blueprintData.search_query,
              searchQueryLength: blueprintData.search_query?.length || 0,
              currentEditableSearchQuery: editableSearchQuery?.slice(0, 30) + "...",
              match: blueprintData.search_query === editableSearchQuery
            });
            
            if (!blueprintData.search_query) {
              console.log("Search query not found in database, saving it now");
              
              
              // Save the search query to the database
              return fetch(`/api/blueprints/${tempBlueprintId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  search_query: editableSearchQuery || finalData?.search_query || ""
                }),
                credentials: 'include'
              }).then(saveResponse => {
                if (saveResponse.ok) {
                  console.log("Successfully saved search query to database");
                  
                  // Also update the debug info to reflect saved status
                  setDebugResults(prevDebug => {
                    try {
                      const currentDebug = prevDebug ? JSON.parse(prevDebug) : {};
                      return JSON.stringify({
                        ...currentDebug,
                        reasoning_agent: {
                          ...currentDebug.reasoning_agent,
                          status: 'passed',
                          saving_to_db: 'success',
                          time_saved_to_db: new Date().toISOString(),
                          details: 'Successfully saved search query to database during tab verification'
                        }
                      });
                    } catch (e) {
                      console.error("Error updating debug info:", e);
                      return JSON.stringify({
                        reasoning_agent: {
                          status: 'passed',
                          time_saved_to_db: new Date().toISOString(),
                          details: 'Successfully saved search query to database during tab verification'
                        }
                      });
                    }
                  });
                  
                  toast.success("Search query saved");
                  setCurrentStep('review');
                } else {
                  throw new Error("Failed to save search query");
                }
              });
            } else {
              console.log("Search query verified in database:", blueprintData.search_query);
              setCurrentStep('review');
            }
          })
          .catch(error => {
            console.error("Error verifying search query:", error);
            toast.error("Error verifying search query", {
              description: "Please use the Next button to ensure proper processing"
            });
          });
        } else {
          console.log("No blueprint ID available to verify search query");
          setCurrentStep('review');
        }
        return;
      }
      
      // If we don't have questions/responses yet, don't allow going to review
      if (!questions || questions.length === 0 || 
          !responses || Object.keys(responses).length === 0) {
        toast.error("Please answer the questions first", {
          description: "You need to complete the questionnaire before reviewing"
        });
        return;
      }
      
      // If we have questions/responses but no finalData or no search query, 
      // inform user they need to use the Next button to properly generate a search query
      toast.info("Please use the Next button", {
        description: "To ensure your information is properly processed, please use the Next button at the bottom of the screen"
      });
      return;
    } else {
      // For other steps, just navigate directly
      setCurrentStep(step);
    }
  };

  // Add this useEffect after other useEffects
  useEffect(() => {
    if (finalData?.search_query && finalData.search_query !== editableSearchQuery) {
      console.log("Syncing editableSearchQuery with finalData.search_query:", finalData.search_query);
      setEditableSearchQuery(finalData.search_query);
    }
  }, [finalData, editableSearchQuery]);

  // Function to test the research API call without finalizing the blueprint
  const testResearchApi = async () => {
    if (!tempBlueprintId) {
      toast.error("No blueprint ID available");
      return;
    }
    
    setIsLoading(true);
    toast.info("Testing research API generation...");
    
    try {
      // Take search_query from the blueprint data or search query input in review step
      const query = editableSearchQuery || (finalData?.search_query) || `Research about: ${title || "Untitled Blueprint"}`;
      console.log("Using search query:", query);
      
      // Call the research API endpoint directly
      const response = await fetch(`/api/blueprints/${tempBlueprintId}/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          complexity: "medium", 
          maxSteps: 10
        }),
      });
      
      // Get the raw response text first for debugging
      const responseText = await response.text();
      console.log("Raw API response text:", responseText);
      
      let data;
      try {
        // Then parse it as JSON
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing API response:", parseError);
        throw new Error(`API returned invalid JSON: ${responseText.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
      }
      
      // Open debug window and show the response
      setIsDebugOpen(true);
      
      // Set a comprehensive debug info object similar to what debugBlueprint does
      const debugInfo = {
        timestamp: new Date().toISOString(),
        blueprint_id: tempBlueprintId,
        blueprint_title: title,
        status: "passed",
        agents: {
          research_agent: {
            status: "passed",
            inputs: {
              search_query: query
            },
            outputs: {
              structured_data: data.data
            }
          }
        },
        // Raw data for reference
        raw_research_response: data
      };
      
      // Set the debug results
      setDebugResults(JSON.stringify(debugInfo, null, 2));
      
      toast.success("Research API call successful!", {
        description: `Generated ${data.data.steps.length} steps from Perplexity API`
      });
    } catch (error) {
      console.error("Research API test error:", error);
      
      // Create debug info with error details
      const errorDebugInfo = {
        timestamp: new Date().toISOString(),
        blueprint_id: tempBlueprintId,
        blueprint_title: title,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };
      
      // Show error in debug window
      setIsDebugOpen(true);
      setDebugResults(JSON.stringify(errorDebugInfo, null, 2));
      
      toast.error("Research API test failed", {
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const canSubmit = 
    !isLoading && 
    (currentStep === 'review' || 
     (currentStep === 'prompt' && prompt.trim()) ||
     (currentStep === 'conversation' && (!questions.length || questions.every(q => questionStatus[q.id] === 'complete'))));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="max-w-[80vw] max-h-[85vh] w-full h-[700px] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 p-0 gap-0 overflow-hidden">
        <form 
          onSubmit={(e) => {
            // If preventFormSubmit is true, stop the submission
            if (preventFormSubmit || isDebugOpen) {
              console.log('Form submission prevented because preventFormSubmit is true or debug is open');
              e.preventDefault();
              return;
            }
            handleSubmit(e);
          }} 
          className="flex flex-col h-full"
        >
          <DialogHeader className="px-8 py-6 border-b bg-background">
            <DialogTitle className="text-xl font-bold">
              {currentStep === 'prompt' ? 
                "Create New Blueprint" : 
                (title || "Create New Blueprint")}
            </DialogTitle>
            
            <div className="flex justify-between items-center mt-1.5">
              <DialogDescription className="m-0">
                {currentStep === 'prompt' ?
                  "Describe what you want your AI to accomplish and we'll generate a blueprint for you." :
                  "Answer these questions to help us understand your requirements better."}
              </DialogDescription>
              
              {/* Step Indicators */}
              <div className="flex items-center gap-6 text-sm">
                <div
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    currentStep === "prompt"
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                  onClick={() => handleTabClick('prompt')}
                >
                  <div
                    className={cn(
                      "w-5 h-5 flex items-center justify-center rounded-full text-xs",
                      currentStep === "prompt"
                        ? "border-primary border text-primary font-medium"
                        : "border border-muted-foreground/50 text-muted-foreground"
                    )}
                  >
                    1
                  </div>
                  <span>Define Goal</span>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    currentStep === "conversation"
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                  onClick={() => handleTabClick('conversation')}
                >
                  <div
                    className={cn(
                      "w-5 h-5 flex items-center justify-center rounded-full text-xs",
                      currentStep === "conversation"
                        ? "border-primary border text-primary font-medium"
                        : "border border-muted-foreground/50 text-muted-foreground"
                    )}
                  >
                    2
                  </div>
                  <span>Clarify Details</span>
                </div>

                {/* Review tab - disabled if conditions aren't met */}
                {(() => {
                  // Check if review tab should be enabled
                  const allQuestionsAnswered = questions.every(q => questionStatus[q.id] === 'complete');
                  const hasSearchQuery = !!(editableSearchQuery || (finalData && finalData.search_query));
                  const isReviewEnabled = (allQuestionsAnswered && hasSearchQuery) || currentStep === "review";
                  
                  return (
                  <div
                    className={cn(
                        "flex items-center gap-2",
                      currentStep === "review"
                        ? "text-primary font-medium"
                          : isReviewEnabled 
                            ? "text-muted-foreground cursor-pointer"
                            : "text-muted-foreground/50 cursor-not-allowed"
                      )}
                      onClick={isReviewEnabled ? () => handleTabClick('review') : undefined}
                      title={!isReviewEnabled ? "Complete all questions and click Next to proceed" : ""}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded-full text-xs",
                        currentStep === "review"
                          ? "border-primary border text-primary font-medium"
                            : isReviewEnabled
                              ? "border border-muted-foreground/50 text-muted-foreground"
                              : "border border-muted-foreground/30 text-muted-foreground/50"
                      )}
                    >
                      3
                    </div>
                    <span>Review</span>
                  </div>
                  );
                })()}
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 h-[480px] flex flex-col overflow-hidden">
            {currentStep === 'prompt' && (
              <div className="grid grid-cols-2 gap-8 p-8 h-full">
                {/* Left column with prompt input */}
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-3">What do you want to build?</h3>
                  
                  <Textarea 
                    id="prompt" 
                    placeholder="E.g., Run a daily search of LinkedIn posts for specific keywords, extract post data, and summarize the content..." 
                    className="h-full resize-none text-lg p-6 border focus-visible:ring-offset-1"
                    value={prompt}
                    onChange={handlePromptChange}
                    disabled={isLoading}
                    required
                  />
                </div>
                
                {/* Right column with examples */}
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Examples</h3>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateExamples}
                      disabled={loadingExamples}
                      className="text-xs"
                    >
                      {loadingExamples ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Regenerate Examples</>
                      )}
                    </Button>
                  </div>
                  
                  {examplesError && (
                    <div className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
                      <p>{examplesError}</p>
                    </div>
                  )}
                  
                  <ScrollContainer className="pr-4">
                    {loadingExamples ? (
                      <div className="flex items-center justify-center h-40">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-muted-foreground">Generating fresh examples...</p>
                        </div>
                      </div>
                    ) : (
                      examples.map((example, index) => (
                        <div 
                          key={index} 
                          className="bg-background rounded-lg p-5 shadow-sm border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                          onClick={() => handleExampleClick(example.content)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-primary group-hover:text-primary/80 transition-colors">
                              {example.title}
                            </h4>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium",
                              difficultyColors[example.difficulty as keyof typeof difficultyColors]
                            )}>
                              {example.difficulty}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground/90 transition-colors">
                            {example.content}
                          </p>
                        </div>
                      ))
                    )}
                  </ScrollContainer>
                </div>
              </div>
            )}
            
            {currentStep === 'conversation' && (
              <div className="grid grid-cols-2 gap-8 pr-0 pl-8 py-8 h-full">
                {/* Left column with response textarea */}
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-3">
                    Your Response
                    {autoSaving && <span className="ml-2 text-sm text-muted-foreground">(Auto-saving...)</span>}
                  </h3>
                  
                  <div className="relative h-full">
                    <Textarea 
                      placeholder="Type your response here..." 
                      className="h-full resize-none text-lg p-6 border focus-visible:ring-offset-1"
                      value={currentResponse}
                      onChange={handleResponseChange}
                      onBlur={handleResponseBlur}
                      disabled={isLoading}
                    />
                    
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <Select
                        value={answerLength}
                        onValueChange={(value) => setAnswerLength(value as 'short' | 'medium' | 'long')}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue placeholder="Medium" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Brief</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="long">Detailed</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => {
                          const currentQuestion = questions[activeQuestionIndex];
                          if (currentQuestion) {
                            generateBoilerplateAnswer(currentQuestion.id, currentQuestion.content, answerLength);
                          }
                        }}
                        disabled={isLoading}
                      >
                        {isGeneratingAnswer ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Right column with question cards */}
                <div className="flex flex-col h-full pr-8">
                  <h3 className="text-lg font-semibold mb-3">Questions</h3>
                  
                  {isLoading && questions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Generating questions...</p>
                      </div>
                    </div>
                  ) : (
                    <ScrollContainer className="">
                      {questions.map((question, index) => (
                        <div 
                          key={question.id}
                          className={cn(
                            "rounded-lg p-5 shadow-sm border mb-4 transition-all cursor-pointer",
                            activeQuestionIndex === index 
                              ? "bg-background border-primary ring-1 ring-primary/20" 
                              : "bg-muted/30 border-border hover:border-primary/30 opacity-75"
                          )}
                          onClick={() => handleQuestionClick(index)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={cn(
                              "font-semibold", 
                              activeQuestionIndex === index 
                                ? "text-foreground" 
                                : "text-muted-foreground"
                            )}>
                              {question.title}
                            </h4>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium",
                              questionStatus[question.id] === "complete" 
                                ? "bg-green-50 text-green-600 dark:bg-green-950/30" 
                                : "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
                            )}>
                              {questionStatus[question.id] === "complete" ? "Complete" : "Pending"}
                            </span>
                          </div>
                          <p className={cn(
                            "text-sm",
                            activeQuestionIndex === index 
                              ? "text-muted-foreground" 
                              : "text-muted-foreground/75"
                          )}>
                            {question.content}
                          </p>
                        </div>
                      ))}
                    </ScrollContainer>
                  )}
                </div>
              </div>
            )}
            
            {/* Review UI - simplified and focused on the search query */}
            {currentStep === 'review' && finalData && (
              <div className="p-8 h-full overflow-auto">
                <div className="flex-1 h-full flex flex-col justify-center">
                  {/* Implementation details section */}
                  <div className="rounded-lg p-8 border border-slate-700/50">
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-2xl font-semibold text-white">Confirm Scope</h3>
                        <span className="text-xs px-2.5 py-1.5 rounded-full bg-slate-700/40 text-slate-300">AI Generated</span>
                    </div>
                      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                        These details will be used to create your blueprint. You can edit the final search query to refine the implementation.
                      </p>
                  </div>
                  
                    <div className="rounded-md border border-slate-700/50 focus-within:ring-1 focus-within:ring-slate-500/40">
                      <Textarea 
                        value={editableSearchQuery}
                        onChange={handleSearchQueryChange}
                        className="min-h-[260px] p-4 text-base leading-relaxed resize-none bg-transparent border-none focus-visible:ring-0 focus-visible:outline-none text-slate-200"
                        placeholder="Edit search query to customize your blueprint..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer with Back and Continue/Create buttons */}
          <DialogFooter className="flex items-center justify-between border-t p-4 bg-muted/40">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={isLoading}
              className="mr-auto"
            >
              Back
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDebugOpen(!isDebugOpen)}
                  className="mr-2"
                >
                  Debug
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={deleteBlueprint}
                  className="mr-2"
                >
                  Delete
                </Button>
              </>
            )}
            {process.env.NODE_ENV === 'development' && (
              <Button
                type="button"
                variant="outline"
                onClick={testResearchApi}
                disabled={isLoading || !canSubmit}
                className="mr-2"
              >
                Test Research
              </Button>
            )}
            <Button
              type="submit"
              variant={canSubmit ? "default" : "outline"}
              disabled={isLoading || !canSubmit}
              className={cn(
                canSubmit ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted",
                "transition-all"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Blueprint"
              )}
            </Button>
          </DialogFooter>
          
          {/* Debug Results Display - only show when isDebugOpen is true */}
          {debugResults && isDebugOpen && (
            <>
              {(() => {
                let parsedData;
                try {
                  parsedData = JSON.parse(debugResults);
                } catch (_unused) {
                  parsedData = { message: debugResults };
                }
                
                return (
                  <div 
                    className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 p-8 overflow-auto"
                    onClick={(e) => e.stopPropagation()} // Prevent clicks within debug modal from bubbling up
                    data-debug-window="open"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Debug Information</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent any event bubbling
                          setIsDebugOpen(false);
                        }}
                      >
                        Close Debug
                      </Button>
                    </div>
                    
                    <div className="border rounded-md overflow-hidden h-[calc(100vh-140px)]">
                      {!deleteDebugData ? (
                        // Display blueprint data
                        <BlueprintDebugWindow
                          blueprintData={parsedData}
                          onRefresh={() => debugBlueprint(true)}
                          isLoading={isLoading}
                        />
                      ) : (
                        // Display delete operation debug data
                        <div className="p-4 bg-black text-green-400 font-mono text-sm overflow-auto h-full flex flex-col">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-yellow-300">DELETE OPERATION DEBUG</span>
                            <Button 
                              onClick={copyDeleteDebugToClipboard}
                              variant="outline" 
                              size="sm"
                              className="h-7 px-2 text-xs"
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy Debug Data
                            </Button>
                          </div>
                          
                          <div className="overflow-auto flex-grow mb-4">
                          <div className="mb-4">
                            <span className="text-blue-300">Status:</span> {
                              deleteDebugData.status === 'request_in_progress' 
                                ? 'REQUEST IN PROGRESS' 
                                : (deleteDebugData.success 
                                  ? 'SUCCESS (VERIFIED DELETED)' 
                                  : deleteDebugData.api_response_indicates_success 
                                    ? 'FAILURE (API REPORTED SUCCESS BUT BLUEPRINT STILL EXISTS)'
                                    : 'FAILED')
                            }
                          </div>
                          <div className="mb-4">
                            <span className="text-blue-300">Blueprint:</span> {String(deleteDebugData?.blueprint_title || '')} ({String(deleteDebugData?.blueprint_id || '')})
                          </div>
                            <pre className="whitespace-pre-wrap">
                            {JSON.stringify(deleteDebugData, null, 2)}
                          </pre>
                          </div>
                          
                          <div className="mt-auto pt-4 flex gap-4 border-t border-gray-800">
                            <Button 
                              onClick={() => window.location.href = '/blueprints'}
                              variant="default"
                              size="sm"
                            >
                              Reload Blueprints Page
                            </Button>
                            
                            <Button 
                              onClick={() => {
                                // Try deletion again with the same ID
                                if (tempBlueprintId) {
                                  handleConfirmedDeletion();
                                }
                              }}
                              variant="default"
                              size="sm"
                            >
                              Retry Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
          
          {/* Confirmation Dialog for regenerating questions */}
          {showConfirmation && (
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Refresh Questions?</DialogTitle>
                  <DialogDescription>
                    This will generate new questions based on your updated prompt. Your previous answers will be lost and you&apos;ll need to answer the new questions.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      setShowConfirmation(false);
                      await handleInitialPrompt();
                    }}
                  >
                    Continue
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {/* Delete Confirmation Dialog */}
          {showDeleteConfirmation && (
            <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Delete Blueprint?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this blueprint? This action cannot be undone and all associated data will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteConfirmation(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleConfirmedDeletion}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
