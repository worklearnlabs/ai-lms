"use client"
"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ChevronDown,
  ChevronUp,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/utils/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// Add this import at the top of the file
import { post } from '@/utils/fetch-wrapper';

// Import BlueprintDebugWindow at the top of the file
import { BlueprintDebugWindow } from "@/components/BlueprintDebugWindow";

// Import supabase
import { createClientSupabase } from '@/utils/supabase'

interface CreateBlueprintModalProps {
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  temporaryBlueprintId?: string | null;
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

export function CreateBlueprintModal({ 
  triggerButton,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  temporaryBlueprintId
}: CreateBlueprintModalProps) {
  // Declare state variables
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'prompt' | 'conversation' | 'reason' | 'complete' | 'review'>('prompt');
  const [isLoading, setIsLoading] = useState(false);
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
    complexity?: 'beginner' | 'intermediate' | 'advanced';
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
  const [debugResults, setDebugResults] = useState<string>("");
  
  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Add state for delete confirmation dialog
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // State for copy button
  const [hasCopied, setHasCopied] = useState(false);
  
  // Add state to track if debug panel is open
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  // Fix the apiDebugData state to include the setter
  const [apiDebugData, setApiDebugData] = useState({});
  
  // Add state for delete debug information
  const [deleteDebugData, setDeleteDebugData] = useState<any>(null);
  
  // Add missing debug state variables
  const [creationDebugData, setCreationDebugData] = useState<{
    blueprintData?: any;
    responseData?: any;
    error?: string | null;
  } | null>(null);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  
  // Function to copy debug results to clipboard
  const copyDebugToClipboard = () => {
    if (!debugResults) return;
    
    navigator.clipboard.writeText(debugResults)
      .then(() => {
        setHasCopied(true);
        toast.success("Debug data copied to clipboard");
        
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
        try {
          setIsLoading(true);
          console.log("%c[DEBUG] Loading blueprint", "background: #3498db; color: white; padding: 2px 4px; border-radius: 2px;", {
            id: temporaryBlueprintId,
            isOpen: isOpen,
            timestamp: new Date().toISOString(),
          });
          
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
          
          // Define the blueprint data interface
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
            complexity?: 'beginner' | 'intermediate' | 'advanced';
            estimated_time?: string;
            prerequisites?: string[];
          }
          
          // Function to process loaded blueprint
          const processLoadedBlueprint = (data: BlueprintData) => {
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
            
            // Use a small timeout to ensure this happens after all state is set
            setTimeout(() => {
              setCurrentStep('conversation');
            }, 50);
            
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
            
            // If there's a search_query, set the final data
            if (data.search_query) {
              setFinalData({
                title: data.title || "",
                search_query: data.search_query,
                description: data.description || data.details || "",
                complexity: data.complexity,
                estimated_time: data.estimated_time,
                prerequisites: data.prerequisites || []
              });
              
              // We'll delay this navigation to ensure we go to the conversation step first
              // then only move to review after a brief delay
              setTimeout(() => {
                // Only navigate to review if we're already on the conversation step
                if (currentStep === 'conversation') {
                  setCurrentStep('review');
                }
              }, 300);
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
          
          processLoadedBlueprint(data);
          
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
    // Log more details about what we're trying to save
    console.log(`Saving response for blueprint ${blueprintId}, question ${questionId}`);
    
    // Input validation
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
            responses: {
              [questionId]: response
            }
          }),
        });
        
        // If the save was successful, return
        if (saveResponse.ok) {
          const responseData = await saveResponse.json();
          console.log('Response saved successfully:', responseData);
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
    // Check that we have all required data
    if (!finalData || !finalData.title) {
      toast.error("Blueprint title is required");
      return;
    }
    
    if (!tempBlueprintId) {
      toast.error("No temporary blueprint ID found");
      return;
    }
    
    if (questions.length === 0 || Object.keys(responses).length === 0) {
      toast.error("Please complete at least one question before creating the blueprint");
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
      
      // Log just before sending to help debug search_query issues
      console.log('Final data before blueprint creation:', {
        title: finalData.title,
        search_query: finalData.search_query,
        description: finalData.description || description,
        prompt,
        contentKeys: Object.keys(content)
      });
      
      // Construct the blueprint data, only including search_query if defined
      const blueprintData = {
        title: finalData.title,
        ...(finalData.search_query ? { search_query: finalData.search_query } : {}), // Only include if defined
        details: finalData.description || description, // Use local description state as fallback
        prompt,
        content,
        complexity: finalData.complexity,
        estimated_time: finalData.estimated_time,
        is_temporary: false, // Set to false to make it a permanent blueprint
      };
      
      console.log(`Sending ${method} request to ${endpoint}:`, blueprintData);
      
      // Use fetch to send the request to the API
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blueprintData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating blueprint:', error);
        throw new Error(error.error || 'Failed to create blueprint');
      }
      
      // Parse the response
      const data = await response.json();
      console.log('Blueprint successfully created/updated:', data);
      
      // For debugging purposes, show the response data
      setIsDebugVisible(true);
      setCreationDebugData({
        blueprintData,
        responseData: data,
        error: null
      });
      
      // Set the created blueprint ID if it's not already set
      if (!createdBlueprintId) {
        setCreatedBlueprintId(data.id);
      }
      
      toast.success("Blueprint created successfully", { id: "create-blueprint" });
      
      // DEBUGGING: Prevent auto-closing and redirecting for now to allow debugging
      console.log("DEBUGGING: Keeping modal open for debugging. Normally would redirect.");
      
      /* 
      // Comment out auto-redirect for debugging purposes
      // Close the modal and redirect to the blueprint page
      setIsVisible(false);
      router.push(`/blueprints/${data.id}`);
      */
      
    } catch (error) {
      console.error('Error in handleCreateBlueprint:', error);
      setCreationDebugData({
        blueprintData,
        responseData: null,
        error: error instanceof Error ? error.message : String(error)
      });
      setIsDebugVisible(true);
      toast.error(error instanceof Error ? error.message : 'Failed to create blueprint', { id: "create-blueprint" });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate the final blueprint data based on all question responses
  const generateFinalBlueprint = async () => {
    if (!tempBlueprintId) {
      throw new Error("No temporary blueprint ID available");
    }
    
    setIsLoading(true);
    
    try {
      console.log("Generating final blueprint data from responses");
      
      // Prepare data for the final blueprint generation
      const generateData = {
        blueprint_id: tempBlueprintId,
        prompt,
        description: description, // Include current description if available
        responses: { ...responses } // Use all collected responses
      };
      
      // Call the API to generate the final blueprint
      // This endpoint should use all responses to generate an improved search_query for research
      console.log("Calling finalize API to generate the refined search_query and other blueprint details");
      console.log("Current description before finalize:", description);
      const response = await fetch('/api/blueprints/reason/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(generateData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate final blueprint: ${response.status} ${errorText}`);
      }
      
      // Parse and update the final data
      const data = await response.json();
      
      // Update the final data state
      // data.search_query should be generated by the API based on the user's responses
      // This will be passed to the research agent (Perplexity) when the blueprint is created
      setFinalData({
        title: data.title || title,
        search_query: data.search_query, // Only use the API-generated search_query, no fallback
        description: data.description || description,
        complexity: data.skill_level || 'beginner',
        estimated_time: data.estimated_time || '1-2 hours',
        prerequisites: data.prerequisites || []
      });
      
      console.log("Final blueprint data generated:", data);
      
      // Combine question responses into content object
      const content = {
        questions,
        responses
      };
      
      return { prompt, content };
    } catch (error) {
      console.error("Error generating final blueprint:", error);
      toast.error("Failed to generate final blueprint", {
        description: error instanceof Error ? error.message : "Please try again"
      });
      throw error;
    } finally {
      setIsLoading(false);
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
          // Generate the final blueprint data based on responses
          await generateFinalBlueprint();
          
          // Move to review step
          setCurrentStep('review');
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

  // Update current active question with response
  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newResponse = e.target.value;
    setCurrentResponse(newResponse);
    
    // Cancel any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set up a new auto-save timeout (1.5 seconds after typing stops)
    const currentQuestion = questions[activeQuestionIndex];
    if (currentQuestion && newResponse.trim() && tempBlueprintId) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveResponse(currentQuestion.id, newResponse);
      }, 1500);
    }
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
    
    // If debug results are already shown and not forcing refresh, just toggle visibility
    if (debugResults && !forceRefresh) {
      setIsDebugOpen(!isDebugOpen);
      return;
    }
    
    // If we're forcing a refresh with existing results, don't toggle - just refresh
    if (forceRefresh && debugResults) {
      // Keep debug panel open, just refresh data
      setDebugResults(`Refreshing blueprint details for ID: ${tempBlueprintId}...`);
    } else {
      // First time opening or no existing results
      setDebugResults(`Loading comprehensive blueprint details for ID: ${tempBlueprintId}...`);
      setIsDebugOpen(true); // Open the debug panel
    }
    
    setIsLoading(true);
    
    try {
      // Fetch complete blueprint data from the API with timestamp to prevent caching
      console.log(`[DEBUG] Fetching blueprint data for ID: ${tempBlueprintId}`);
      const timestamp = Date.now();
      const blueprintResponse = await fetch(`/api/blueprints/${tempBlueprintId}?t=${timestamp}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Debug-Client': 'create-blueprint-modal'
        }
      });
      
      // Get blueprint data
      let blueprintData = null;
      if (blueprintResponse.ok) {
        blueprintData = await blueprintResponse.json();
        console.log(`[DEBUG] Successfully fetched blueprint data:`, blueprintData);
      } else {
        const errorText = await blueprintResponse.text();
        console.error(`[DEBUG] Failed to fetch blueprint: ${blueprintResponse.status} ${blueprintResponse.statusText}`, errorText);
        throw new Error(`Failed to fetch blueprint: ${blueprintResponse.status} ${blueprintResponse.statusText}`);
      }
      
      // Get questions and responses data with timestamp to prevent caching
      console.log(`[DEBUG] Fetching questions and responses for blueprint ID: ${tempBlueprintId}`);
      let questionsData = null;
      try {
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
      let formattedQA = {};
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
        formattedQA = { 
          error: "No questions array found in API response",
          responseFormat: questionsData ? Object.keys(questionsData) : null
        };
      }
      
      // Check database directly if in development mode
      let dbDetails = null;
      try {
        console.log(`[DEBUG] Fetching raw DB data for blueprint ID: ${tempBlueprintId}`);
        const dbResponse = await fetch(`/api/admin/debug/blueprint?id=${tempBlueprintId}&t=${timestamp}`, {
          method: 'GET',
          credentials: 'include'
        });
        
        if (dbResponse.ok) {
          dbDetails = await dbResponse.json();
          console.log(`[DEBUG] Successfully fetched raw DB data`);
        } else {
          console.log(`[DEBUG] Failed to fetch raw DB data: ${dbResponse.status}`);
          dbDetails = { 
            error: `Failed to fetch raw DB data: ${dbResponse.status}`, 
            note: "This is expected if you're not in development mode or don't have admin access" 
          };
        }
      } catch (dbError) {
        console.error("[DEBUG] Error fetching raw DB data:", dbError);
        dbDetails = { 
          error: "Error fetching raw DB data", 
          message: dbError instanceof Error ? dbError.message : String(dbError) 
        };
      }
      
      // Gather comprehensive debug information
      const debugInfo = {
        blueprint_id: tempBlueprintId,
        blueprint_data: blueprintData,
        questions_and_answers: formattedQA,
        questions_response_data: questionsData, // Include the raw questions response
        raw_db_data: dbDetails,
        important_fields: blueprintData ? {
          title: blueprintData.title || "NOT SET",
          search_query: blueprintData.search_query || "NOT SET",
          search_query_type: blueprintData.search_query ? typeof blueprintData.search_query : "undefined/null",
          search_query_length: blueprintData.search_query ? blueprintData.search_query.length : 0,
          prompt: blueprintData.prompt ? blueprintData.prompt.substring(0, 50) + "..." : "NOT SET",
          details: blueprintData.details ? blueprintData.details.substring(0, 50) + "..." : "NOT SET",
          is_temporary: blueprintData.is_temporary,
          visibility: blueprintData.visibility,
          created_at: blueprintData.created_at,
          updated_at: blueprintData.updated_at
        } : null,
        timestamp: new Date().toISOString(),
        refreshed_at: forceRefresh ? new Date().toISOString() : null // Track when data was refreshed
      };
      
      // Display formatted debug info
      setDebugResults(JSON.stringify(debugInfo, null, 2));
      
      toast.success(forceRefresh ? "Debug data refreshed" : "Debug data loaded", {
        description: "Blueprint data and Q&A pairs retrieved"
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
    const debugInfo: any = {
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
      } catch (parseError) {
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
          } catch (e) {
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
      const questionsData = await post('/api/blueprints/questions', {
        prompt: userPrompt,
        blueprint_id: blueprintId
      });
      
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
        
        // Update the blueprint in the database with the received description
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
      } else {
        // Create a fallback description if none was provided by the API
        console.log('No description found in API response, generating fallback');
        const fallbackDescription = `This blueprint will create an AI that ${userPrompt.toLowerCase().startsWith('i need') ? userPrompt.substring(7) : userPrompt}`;
        setDescription(fallbackDescription);
        
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
    try {
      setIsLoading(true);
      toast.loading("Generating answer...", { id: "generate-answer" });
      
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
        
        // Update the current response
        setCurrentResponse(data.answer);
        
        toast.success("Answer generated", { id: "generate-answer" });
      } else {
        throw new Error("No answer received from the API");
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      toast.error("Failed to generate answer", { 
        id: "generate-answer",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="max-w-[80vw] max-h-[85vh] w-full h-[700px] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
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
                  onClick={() => {
                    // Only allow navigation to steps we've already reached
                    if (prompt.trim()) {
                      setCurrentStep("prompt");
                    }
                  }}
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
                    "flex items-center gap-2",
                    currentStep === "conversation"
                      ? "text-primary font-medium"
                      : "text-muted-foreground",
                    !questions.length && "opacity-50 cursor-not-allowed" // Disable if no questions yet
                  )}
                  onClick={() => {
                    // Only allow navigation if we have questions
                    if (questions.length > 0) {
                      setCurrentStep("conversation");
                    }
                  }}
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

                {finalData && (
                  <div
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      currentStep === "review"
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    )}
                    onClick={() => {
                      // Only allow navigation if we have finalData
                      if (finalData) {
                        setCurrentStep("review");
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 flex items-center justify-center rounded-full text-xs",
                        currentStep === "review"
                          ? "border-primary border text-primary font-medium"
                          : "border border-muted-foreground/50 text-muted-foreground"
                      )}
                    >
                      3
                    </div>
                    <span>Review</span>
                  </div>
                )}
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
              <div className="grid grid-cols-2 gap-8 p-8 h-full">
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
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Right column with question cards */}
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-3">Questions</h3>
                  
                  {isLoading && questions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Generating questions...</p>
                      </div>
                    </div>
                  ) : (
                    <ScrollContainer className="pr-4">
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
            
            {/* Review UI - simplified to show only JSON data */}
            {currentStep === 'review' && finalData && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-slate-900 text-white font-mono flex-1 flex flex-col rounded-md overflow-hidden">
                  <div className="sticky top-0 right-0 z-20 flex justify-between bg-slate-900/95 backdrop-blur-sm py-3 px-4 border-b border-slate-700">
                    <h3 className="text-lg font-semibold text-white">Review Blueprint Data</h3>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 bg-slate-800 hover:bg-slate-700 text-slate-200"
                        onClick={() => {
                          const blueprintData = {
                            title: finalData.title,
                            search_query: finalData.search_query,
                            description: finalData.description,
                            complexity: finalData.complexity,
                            estimated_time: finalData.estimated_time,
                            prerequisites: finalData.prerequisites,
                            content: {
                              questions: questions.map(q => ({
                                id: q.id,
                                title: q.title,
                                content: q.content,
                                response: responses[q.id] || ""
                              })),
                              responses
                            },
                            prompt,
                            is_temporary: false,
                            creation_info: {
                              temporary_id: tempBlueprintId,
                              created_id: createdBlueprintId,
                            }
                          };
                          navigator.clipboard.writeText(JSON.stringify(blueprintData, null, 2));
                          toast.success("Copied to clipboard!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {process.env.NODE_ENV === 'development' && (
                        <Button 
                          type="button" 
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200"
                          onClick={() => debugBlueprint(true)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Refresh
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="overflow-auto p-4 flex-1 bg-slate-900 text-xs">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(
                        {
                          title: finalData.title,
                          search_query: finalData.search_query,
                          description: finalData.description,
                          complexity: finalData.complexity,
                          estimated_time: finalData.estimated_time,
                          prerequisites: finalData.prerequisites,
                          content: {
                            questions: questions.map(q => ({
                              id: q.id,
                              title: q.title,
                              content: q.content,
                              response: responses[q.id] || ""
                            })),
                            responses
                          },
                          prompt,
                          is_temporary: false,
                          creation_info: {
                            temporary_id: tempBlueprintId,
                            created_id: createdBlueprintId,
                          }
                        }, 
                        null, 
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer with Back and Continue/Create buttons */}
          <DialogFooter className="border-t py-4 px-8 mt-auto">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center">
                {currentStep !== 'prompt' && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleBack} 
                    disabled={isLoading} 
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
                
                {/* Debug and Delete buttons - only shown in development mode */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="flex ml-4 space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 gap-1"
                      onClick={() => {
                        // Set debugIsOpen to true
                        setIsDebugOpen(!isDebugOpen);
                        
                        // Also add sample API debug data for demonstration
                        if (!isDebugOpen) {
                          // When opening, populate some API debug data
                          const sampleApiDebugData = {
                            openaiRequest: {
                              endpoint: '/api/blueprints/reason/finalize',
                              method: 'POST',
                              data: {
                                prompt: prompt,
                                description: description,
                                responses: responses
                              }
                            },
                            openaiResponse: {
                              title: "Competitive Marketing Analysis AI",
                              search_query: "Create an AI system to analyze competitors' marketing materials",
                              description: "Detailed description would be here"
                            }
                          };
                          
                          // Update API debug data
                          setApiDebugData(sampleApiDebugData);
                        }
                        
                        // Trigger debug blueprint
                        debugBlueprint();
                      }}
                      disabled={isLoading || !tempBlueprintId}
                    >
                      Debug <span className="sr-only">Debug</span>
                    </Button>
                    
                    {tempBlueprintId && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/30"
                        onClick={deleteBlueprint}
                        disabled={isLoading}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={
                  isLoading || 
                  (currentStep === 'prompt' && !prompt.trim()) ||
                  (currentStep === 'prompt' && isExistingBlueprint && !promptChanged) ||
                  (currentStep === 'conversation' && questions.length > 0 && questions.every(q => questionStatus[q.id] === 'pending'))
                }
                className="gap-2 px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {currentStep === 'prompt' ? "Generating Questions..." : (
                      currentStep === 'conversation' ? "Generating Blueprint..." : "Creating Blueprint..."
                    )}
                  </>
                ) : (
                  <>
                    {currentStep === 'prompt' && (isExistingBlueprint && promptChanged ? "Refresh Questions" : "Continue")}
                    {currentStep === 'conversation' && "Next: Review Blueprint"}
                    {currentStep === 'review' && "Create Blueprint"}
                    {currentStep === 'prompt' && <ArrowRight className="h-4 w-4" />}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
          
          {/* Debug Results Display - only show when isDebugOpen is true */}
          {debugResults && isDebugOpen && (
            <>
              {(() => {
                let parsedData;
                try {
                  parsedData = JSON.parse(debugResults);
                } catch (_) {
                  parsedData = { message: debugResults };
                }
                
                return (
                  <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 p-8 overflow-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Debug Information</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsDebugOpen(false)}
                      >
                        Close Debug
                      </Button>
                    </div>
                    
                    <div className="border rounded-md overflow-hidden">
                      <div className="flex border-b">
                        <button 
                          className={`px-4 py-2 text-sm font-medium ${!deleteDebugData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                          onClick={() => debugBlueprint(true)}
                        >
                          Blueprint Data
                        </button>
                        <button 
                          className={`px-4 py-2 text-sm font-medium ${deleteDebugData ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                          onClick={() => setIsDebugOpen(true)} // Just show the delete debug data tab
                        >
                          Delete Debug
                        </button>
                      </div>
                      
                      {!deleteDebugData ? (
                        // Display blueprint data
                        <BlueprintDebugWindow
                          blueprintData={parsedData}
                          apiDebugData={apiDebugData}
                          onRefresh={() => debugBlueprint(true)}
                          isLoading={isLoading}
                        />
                      ) : (
                        // Display delete operation debug data
                        <div className="p-4 bg-black text-green-400 font-mono text-sm overflow-auto max-h-[70vh]">
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
                            <span className="text-blue-300">Blueprint:</span> {deleteDebugData.blueprint_title} ({deleteDebugData.blueprint_id})
                          </div>
                          <pre className="whitespace-pre-wrap overflow-auto">
                            {JSON.stringify(deleteDebugData, null, 2)}
                          </pre>
                          
                          <div className="mt-6 flex gap-4">
                            <Button 
                              onClick={() => setIsDebugOpen(false)}
                              variant="outline"
                              size="sm"
                            >
                              Close Debugger
                            </Button>
                            
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