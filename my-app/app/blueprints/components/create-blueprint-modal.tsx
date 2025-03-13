"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react"

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
  const [isLoading, setIsLoading] = useState(false)
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [currentStep, setCurrentStep] = useState<'prompt' | 'conversation' | 'review'>('prompt')
  const [currentResponse, setCurrentResponse] = useState("")
  
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
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    estimated_time?: string;
    prerequisites?: string[];
  } | null>(null);
  
  // Example blueprints with difficulty levels - now we'll fetch these dynamically
  const [examples, setExamples] = useState([
    {
      title: "LinkedIn Content Analyzer",
      content: "I want an AI that monitors LinkedIn for posts about artificial intelligence, machine learning, and venture capital funding. It should collect posts from the last 24 hours, analyze key themes, extract metrics (like engagement rates), and generate a daily summary report highlighting emerging trends and noteworthy discussions.",
      difficulty: "Easy"
    },
    {
      title: "Content Research Assistant",
      content: "I need an AI that can research a specific topic across multiple sources (web articles, academic papers, and social posts), extract key insights, identify conflicting information, and summarize findings with proper citations. The tool should handle complex topics and organize information logically.",
      difficulty: "Medium"
    },
    {
      title: "Weekly Market Trend Analyzer",
      content: "Create an AI that collects financial news from major publications, tracks stock performance for a specific industry segment, identifies correlations between news events and market movements, and produces comprehensive weekly reports with visualizations of key trends and actionable insights.",
      difficulty: "Hard"
    }
  ]);
  
  // Tracks whether examples are being loaded
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [examplesError, setExamplesError] = useState<string | null>(null);
  
  // Add this near the other state declarations
  const [debugResults, setDebugResults] = useState<string>("");
  
  // Fetch dynamic examples when the modal is opened
  useEffect(() => {
    if (isOpen) {
      fetchDynamicExamples();
    }
  }, [isOpen]);
  
  // Function to fetch dynamic examples from our API
  const fetchDynamicExamples = async () => {
    try {
      setLoadingExamples(true);
      setExamplesError(null);
      
      console.log('Fetching dynamic examples...');
      const response = await fetch('/api/blueprints/examples');
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
      setCurrentStep('prompt');
      setCurrentResponse("");
      setCreatedBlueprintId(undefined);
      setFinalData(null);
      setActiveQuestionIndex(0);
      setQuestions([]);
      setQuestionStatus({});
      setResponses({});
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
    if (temporaryBlueprintId) {
      const loadTemporaryBlueprint = async () => {
        try {
          setIsLoading(true);
          console.log("Loading temporary blueprint:", temporaryBlueprintId);
          
          // Helper function to start a fresh blueprint
          const startFreshBlueprint = (title: string, description: string) => {
            setTitle("");
            setPrompt("");
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
          if (!uuidRegex.test(temporaryBlueprintId)) {
            console.error(`Invalid UUID format for blueprint ID: ${temporaryBlueprintId}`);
            startFreshBlueprint(
              "Your previous draft couldn't be loaded",
              "Invalid blueprint ID format - starting a new blueprint creation process"
            );
            return;
          }
          
          // Define the blueprint data interface
          interface BlueprintData {
            id?: string;
            title?: string;
            prompt?: string;
            search_query?: string;
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
            
            // Log the origin information to help with debugging
            console.log("Loaded blueprint details:", {
              title: data.title,
              prompt: data.prompt,
              hasSearchQuery: !!data.search_query,
              hasQuestions: !!(data.content && data.content.questions),
              hasResponses: !!(data.content && data.content.responses),
              responseCount: data.content?.responses ? Object.keys(data.content.responses).length : 0
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
                complexity: data.complexity,
                estimated_time: data.estimated_time,
                prerequisites: data.prerequisites
              });
              
              // If we have final data, move to the review step
              setCurrentStep('review');
            }
            
            // If there are questions and responses in the content, load them
            if (data.content && data.content.questions) {
              setQuestions(data.content.questions);
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
              }
            }
          };
          
          // Try both with and without maybeSingle() to handle both possible formats
          try {
            // First check if blueprint exists at all
            const blueprintCheckResponse = await fetch(`/api/blueprints/${temporaryBlueprintId}`, {
              method: 'HEAD'
            });
            
            if (blueprintCheckResponse.status === 404) {
              console.error(`Blueprint with ID ${temporaryBlueprintId} not found`);
              startFreshBlueprint(
                "Your previous draft couldn't be loaded",
                "Blueprint not found - starting a new blueprint creation process"
              );
              return;
            }
            
            // Then fetch the full blueprint details
            const blueprintResponse = await fetch(`/api/blueprints/${temporaryBlueprintId}`);
            
            if (!blueprintResponse.ok) {
              throw new Error(`Failed to fetch blueprint: ${blueprintResponse.status}`);
            }
            
            const data = await blueprintResponse.json();
            
            // Also set the temporary blueprint ID in state to match what was loaded
            setTempBlueprintId(temporaryBlueprintId);
            
            processLoadedBlueprint(data);
            
            // Check for questions data for this blueprint
            try {
              const questionsResponse = await fetch(`/api/blueprints/questions/responses?blueprint_id=${temporaryBlueprintId}`);
              
              if (questionsResponse.ok) {
                const questionsData = await questionsResponse.json();
                console.log("Loaded additional questions data:", questionsData);
                
                if (questionsData.questions && questionsData.questions.length > 0) {
                  setQuestions(questionsData.questions);
                  
                  if (questionsData.responses) {
                    setResponses(questionsData.responses);
                    
                    // Parse the status from responses
                    const questionStatusMap: QuestionStatusMap = {};
                    questionsData.questions.forEach((question: { id: number }) => {
                      questionStatusMap[question.id] = 
                        questionsData.responses[question.id] ? "complete" : "pending";
                    });
                    setQuestionStatus(questionStatusMap);
                  }
                }
              }
            } catch (questionsError) {
              console.error("Error loading questions data:", questionsError);
              // Continue with what we have
            }
          } catch (error) {
            console.error('Error loading blueprint:', error);
            startFreshBlueprint(
              "Your previous draft couldn't be loaded", 
              "Error loading data - starting a new blueprint creation process"
            );
          }
        } catch (error) {
          console.error('Failed to load blueprint:', error);
          toast.error("Failed to load your draft", {
            description: "Starting a new blueprint creation process"
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadTemporaryBlueprint();
    }
  }, [temporaryBlueprintId]);
  
  // Interface for AI-generated questions
  interface QuestionResponse {
    id?: number;
    title?: string;
    content?: string;
    [key: string]: unknown;
  }
  
  // Add logging to debug the tempBlueprintId
  useEffect(() => {
    console.log("tempBlueprintId changed:", tempBlueprintId);
  }, [tempBlueprintId]);

  // Fetch AI-generated questions based on the prompt
  const fetchQuestions = async (userPrompt: string, blueprintId: string) => {
    setIsLoading(true);
    
    try {
      console.log('Fetching questions for prompt:', userPrompt);
      
      // Now fetch questions, including the blueprint_id
      const response = await fetch('/api/blueprints/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: userPrompt,
          blueprint_id: blueprintId 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Questions API response:', data);
      
      // Check if there are any errors from the API but it still returned fallback questions
      if (data.error && data.questions) {
        console.warn('API returned an error but provided fallback questions:', data.error);
        toast.warning("Using default questions", {
          description: "We couldn't generate custom questions based on your prompt, so we're using default ones."
        });
      }
      
      if (data.questions && Array.isArray(data.questions)) {
        console.log('Received questions array:', data.questions);
        
        // Ensure we have at least 4 questions
        let questionsToUse = data.questions;
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
        
        // Make sure all questions have the required properties
        const validatedQuestions = questionsToUse.map((q: QuestionResponse, index: number) => ({
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
        setActiveQuestionIndex(0); // Focus on the first question
        
        // No longer need to set the current step here since it's handled in handleInitialPrompt
      } else {
        console.error('Invalid response format from questions API:', data);
        toast.error("Invalid response format", {
          description: "We received an unexpected response format from our AI service."
        });
      }
      
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error("Failed to generate questions", {
        description: error instanceof Error ? error.message : "Please try again later"
      });
      throw error; // Rethrow to be handled by caller
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the initial prompt submission
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
        const blueprintResponse = await fetch('/api/blueprints', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: prompt.split('\n')[0].slice(0, 50) || 'Draft Blueprint',
            search_query: prompt,
            visibility: 'private',
            is_temporary: true // Flag this as a temporary blueprint
          }),
        });
        
        if (!blueprintResponse.ok) {
          const errorData = await blueprintResponse.json().catch(() => null);
          console.error("Blueprint creation failed with status:", blueprintResponse.status, errorData);
          throw new Error(`Failed to create temporary blueprint: ${blueprintResponse.status}`);
        }
        
        const blueprintData = await blueprintResponse.json();
        if (!blueprintData || !blueprintData.id) {
          console.error("Blueprint creation response did not include an ID:", blueprintData);
          throw new Error("Invalid response from blueprint creation API");
        }
        
        console.log('Created temporary blueprint with ID:', blueprintData.id);
        setTempBlueprintId(blueprintData.id);
        
        // Verify the blueprint exists by making a HEAD request
        try {
          const verifyResponse = await fetch(`/api/blueprints/${blueprintData.id}`, {
            method: 'HEAD'
          });
          
          if (!verifyResponse.ok) {
            console.warn(`Verification check for blueprint ${blueprintData.id} failed with status:`, verifyResponse.status);
          } else {
            console.log(`Blueprint ${blueprintData.id} verified successfully`);
          }
        } catch (verifyError) {
          console.warn("Failed to verify blueprint existence:", verifyError);
          // Continue anyway
        }
        
        // Step 2: Now fetch questions using the temporary blueprint ID
        await fetchQuestions(prompt, blueprintData.id);
      } else {
        console.log('Using existing temporary blueprint ID:', tempBlueprintId);
        // If we already have a temporary blueprint ID, just fetch questions
        await fetchQuestions(prompt, tempBlueprintId);
      }
      
      // Move to conversation step
      setCurrentStep('conversation');
    } catch (error) {
      console.error('Error in initial prompt handling:', error);
      toast.error("Failed to process your request", {
        description: error instanceof Error ? error.message : "Please try again later"
      });
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
    
    // Save to local state
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
        
        await saveResponseToDatabase(tempBlueprintId, currentQuestion.id.toString(), currentResponse);
        
        console.log(`Response saved for question ${currentQuestion.id}`);
        toast.success("Response saved", { id: "saving-response" });
        savedSuccessfully = true;
      } catch (error) {
        console.error('Error saving response:', error);
        
        // More specific error message
        toast.error("Couldn't save your response", { 
          id: "saving-response",
          description: error instanceof Error 
            ? error.message 
            : "Your response was saved locally but couldn't be synced to the server."
        });
        
        // Despite error, we still want to continue
        savedSuccessfully = false;
      }
    } else {
      console.warn('No temporary blueprint ID available, response not saved to database');
      toast.warning("Response saved locally only", {
        description: "Your response couldn't be saved to the server because no blueprint ID is available."
      });
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
  
  // New function to save responses to the database
  const saveResponseToDatabase = async (blueprintId: string, questionId: string, response: string): Promise<void> => {
    // Log more details about what we're trying to save
    console.log(`Saving response for blueprint ${blueprintId}, question ${questionId}`);
    console.log(`Current tempBlueprintId state: ${tempBlueprintId}`);
    
    // Input validation
    if (!blueprintId) {
      console.error("Cannot save response: Missing blueprint ID");
      toast.error("Missing blueprint ID", { 
        description: "The application couldn't identify which blueprint to save to."
      });
      throw new Error("Missing blueprint ID");
    }
    
    // First verify the blueprint exists before attempting to save
    try {
      console.log(`Verifying blueprint ${blueprintId} exists before saving responses`);
      const verifyResponse = await fetch(`/api/blueprints/${blueprintId}`, {
        method: 'GET'  // Use GET instead of HEAD to get full information
      });
      
      if (verifyResponse.status === 404) {
        console.warn(`Blueprint ${blueprintId} not found during verification, creating new one`);
        
        // The blueprint doesn't exist, we need to create it again
        const recreateResponse = await fetch('/api/blueprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: prompt.split('\n')[0].slice(0, 50) || 'Draft Blueprint',
            search_query: prompt,
            visibility: 'private',
            is_temporary: true // Flag this as a temporary blueprint
          })
        });
        
        if (recreateResponse.ok) {
          const newBlueprint = await recreateResponse.json();
          console.log(`Successfully recreated blueprint with ID: ${newBlueprint.id}`);
          
          // Update our state with the new ID
          setTempBlueprintId(newBlueprint.id);
          
          // Use the new ID for subsequent operations
          blueprintId = newBlueprint.id;
          toast.info("Blueprint was recreated", {
            description: "Your temporary blueprint was lost but has been recreated."
          });
        } else {
          console.error("Failed to recreate blueprint:", await recreateResponse.text());
          throw new Error("Failed to recreate blueprint");
        }
      } else if (!verifyResponse.ok) {
        console.error(`Error verifying blueprint: ${verifyResponse.status}`, await verifyResponse.text());
      } else {
        console.log(`Blueprint ${blueprintId} verified successfully`);
      }
    } catch (error) {
      console.error("Error checking blueprint existence:", error);
      // Continue anyway, as the response saving will fail if the blueprint doesn't exist
    }
    
    // Implement retry logic
    const maxRetries = 3;
    let attemptCount = 0;
    let lastError = null;
    
    while (attemptCount < maxRetries) {
      try {
        attemptCount++;
        console.log(`Attempt ${attemptCount} to save response for question ${questionId} to blueprint ${blueprintId}`);
        
        // Create questions and responses record
        console.log(`POSTing to /api/blueprints/questions/responses with blueprint_id: ${blueprintId}`);
        const saveResponse = await fetch('/api/blueprints/questions/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Blueprint-Search-Query': prompt, // Pass the prompt as a header for potential recreation
            'X-Auto-Recreate-Blueprint': 'true' // Enable automatic blueprint recreation
          },
          body: JSON.stringify({
            blueprint_id: blueprintId,
            responses: {
              [questionId]: response
            }
          }),
        });
        
        const responseText = await saveResponse.text();
        console.log(`Response status: ${saveResponse.status}, Text: ${responseText}`);
        
        // Parse the response data
        const responseData = (() => {
          try {
            return JSON.parse(responseText);
          } catch (parseError) {
            console.error("Error parsing response JSON:", parseError);
            return { error: "Failed to parse response", details: responseText };
          }
        })();
        
        if (!saveResponse.ok) {
          const statusCode = saveResponse.status;
          console.error(`Attempt ${attemptCount} failed to save response:`, 
            statusCode, responseData);
          
          // Handle specific error cases
          if (statusCode === 401 || statusCode === 403) {
            // Authentication or authorization error
            console.error('Authentication/authorization error saving response');
            toast.error("Access error. Please try logging in again.");
            throw new Error(`Access error: ${responseData.error || 'Unknown error'}`);
          } 
          
          if (statusCode === 404) {
            // Blueprint not found - let's recreate it
            console.warn('Blueprint not found (404), recreating temporary blueprint...');
            
            try {
              const recreateResponse = await fetch('/api/blueprints', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  title: prompt.split('\n')[0].slice(0, 50) || 'Draft Blueprint',
                  search_query: prompt,
                  visibility: 'private',
                  is_temporary: true
                }),
              });
              
              if (recreateResponse.ok) {
                const newBlueprintData = await recreateResponse.json();
                console.log('Successfully recreated temporary blueprint:', newBlueprintData.id);
                
                // Update our state with the new ID
                setTempBlueprintId(newBlueprintData.id);
                
                // Try again with the new blueprint ID
                blueprintId = newBlueprintData.id;
                
                // Small delay before retrying
                await new Promise(resolve => setTimeout(resolve, 500));
                continue; // Skip to next retry with new ID
              } else {
                console.error('Failed to recreate temporary blueprint:', await recreateResponse.text());
              }
            } catch (recreateError) {
              console.error('Error recreating blueprint:', recreateError);
            }
            
            lastError = new Error(responseData.error || 'Blueprint not found');
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          // General error handler
          lastError = new Error(`Failed to save response: ${statusCode} ${responseData.error || 'Unknown error'}`);
          
          // For 5xx errors, retry after a longer delay
          if (statusCode >= 500) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attemptCount));
            continue;
          }
          
          // For other errors, throw immediately
          throw lastError;
        }
        
        console.log('Response saved successfully:', responseData);
        
        // Check if the blueprint was automatically recreated
        if (responseData.recreated && responseData.blueprint_id) {
          console.log(`Blueprint was automatically recreated with new ID: ${responseData.blueprint_id}`);
          setTempBlueprintId(responseData.blueprint_id);
          toast.success("Blueprint recreated", {
            description: "Your responses were saved to a newly created blueprint."
          });
        }
        
        // Successfully saved, no need to continue retrying
        return;
      } catch (error) {
        console.error(`Attempt ${attemptCount} error:`, error);
        lastError = error;
        
        // Add a small delay before retrying, increasing with each attempt
        if (attemptCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attemptCount));
        }
      }
    }
    
    // If we get here, all retry attempts failed
    console.error(`Failed to save response after ${maxRetries} attempts`);
    toast.error("Failed to save your response. Please try again.");
    throw lastError || new Error('Failed to save response after multiple attempts');
  };
  
  // Handle creating the final blueprint
  const handleCreateBlueprint = async () => {
    if (!finalData) return;
    
    setIsLoading(true);
    
    try {
      // Determine if we're updating an existing blueprint or creating a new one
      const isUpdating = !!createdBlueprintId;
      console.log(isUpdating ? "Updating existing blueprint" : "Creating new blueprint");
      
      const method = isUpdating ? 'PATCH' : 'POST';
      const endpoint = isUpdating 
        ? `/api/blueprints/${createdBlueprintId}` 
        : '/api/blueprints';
      
      // Combine question responses into content object
      const content = {
        questions,
        responses
      };
      
      // Prepare the blueprint data
      const blueprintData = {
        title: finalData.title,
        search_query: finalData.search_query,
        prompt,
        content,
        complexity: finalData.complexity,
        estimated_time: finalData.estimated_time,
        is_temporary: false, // Important: Set is_temporary to false to mark it as permanent
      };
      
      console.log(`Sending ${method} request to ${endpoint}:`, blueprintData);
      
      // Create or update the blueprint
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blueprintData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isUpdating ? 'update' : 'create'} blueprint: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Blueprint ${isUpdating ? 'updated' : 'created'}:`, data);
      
      // If we're creating a new blueprint, update the ID
      if (!isUpdating && data) {
        setCreatedBlueprintId(data.id);
      }
      
      // Show success message
      toast.success(`Blueprint ${isUpdating ? 'updated' : 'created'} successfully!`);
      
      // Close the modal and redirect to the blueprint page
      if (externalOnOpenChange) {
        externalOnOpenChange(false);
      } else {
        setInternalIsOpen(false);
      }
      
      // Navigate to the blueprint page
      window.location.href = `/blueprints/${data.id || createdBlueprintId}`;
    } catch (error) {
      console.error(`Error ${createdBlueprintId ? 'updating' : 'creating'} blueprint:`, error);
      toast.error(`Failed to ${createdBlueprintId ? 'update' : 'create'} blueprint`);
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
        responses: { ...responses } // Use all collected responses
      };
      
      // Call the API to generate the final blueprint
      const response = await fetch('/api/blueprints/reason/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate final blueprint: ${response.status} ${errorText}`);
      }
      
      // Parse and update the final data
      const data = await response.json();
      
      // Update the final data state
      setFinalData({
        title: data.title || title,
        search_query: data.search_query || prompt,
        complexity: data.skill_level || 'beginner',
        estimated_time: data.estimated_time || '1-2 hours',
        prerequisites: data.prerequisites || []
      });
      
      console.log("Final blueprint data generated:", data);
      return data;
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

  // Handle form submission based on current step
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    try {
      if (currentStep === 'prompt') {
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

  // Update current active question with response
  const handleResponseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentResponse(e.target.value);
  };

  // Update tempBlueprintId whenever temporaryBlueprintId prop changes  
  useEffect(() => {
    if (temporaryBlueprintId) {
      console.log("temporaryBlueprintId prop changed to:", temporaryBlueprintId);
      setTempBlueprintId(temporaryBlueprintId);
    }
  }, [temporaryBlueprintId]);

  // Add debug functionality to the debugging section:
  const debugBlueprint = async () => {
    if (!tempBlueprintId) {
      setDebugResults("No tempBlueprintId found");
      return;
    }
    
    setDebugResults(`Checking blueprint status for ID: ${tempBlueprintId}`);
    
    // Use GET instead of HEAD to get full blueprint details
    try {
      const verifyResponse = await fetch(`/api/blueprints/${tempBlueprintId}`, {
        method: 'GET',
      });
      
      // Parse response data if available
      let responseData = null;
      try {
        if (verifyResponse.status !== 204) { // Skip parsing empty responses
          const contentType = verifyResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            responseData = await verifyResponse.json();
          } else {
            responseData = await verifyResponse.text();
          }
        }
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
      }
      
      // Gather debug information
      const debugInfo = {
        tempBlueprintId,
        responseStatus: verifyResponse.status,
        responseStatusText: verifyResponse.statusText,
        responseHeaders: Object.fromEntries([...verifyResponse.headers.entries()]),
        responseData,
        timestamp: new Date().toISOString()
      };
      
      // Display debug info
      setDebugResults(JSON.stringify(debugInfo, null, 2));
      
      if (verifyResponse.ok) {
        console.log("Blueprint verification successful:", debugInfo);
        toast.success("Blueprint exists", {
          description: `Blueprint with ID ${tempBlueprintId} was found.`
        });
      } else {
        console.warn("Blueprint verification failed:", debugInfo);
        
        if (verifyResponse.status === 404) {
          toast.error("Blueprint not found", {
            description: "The blueprint ID does not exist in the database. Creating a new temporary blueprint..."
          });
          
          // Create a new temporary blueprint
          await createNewTempBlueprint();
        } else {
          toast.error(`Verification failed: ${verifyResponse.status}`, {
            description: verifyResponse.statusText || "Unknown error"
          });
        }
      }
    } catch (error) {
      console.error("Blueprint verification error:", error);
      setDebugResults(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
      toast.error("Verification error", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  // Helper function to create a new temporary blueprint
  const createNewTempBlueprint = async () => {
    try {
      const response = await fetch('/api/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prompt.split('\n')[0].slice(0, 50) || 'Draft Blueprint',
          search_query: prompt,
          visibility: 'private',
          is_temporary: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create blueprint: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data && data.id) {
        setTempBlueprintId(data.id);
        console.log(`Created new temporary blueprint with ID: ${data.id}`);
        toast.success("Created new blueprint", {
          description: `New blueprint ID: ${data.id.slice(0, 8)}...`
        });
        setDebugResults(JSON.stringify({
          action: "Created new blueprint",
          newId: data.id,
          response: data,
          timestamp: new Date().toISOString()
        }, null, 2));
      } else {
        throw new Error("Invalid response data when creating blueprint");
      }
    } catch (error) {
      console.error("Failed to create new temporary blueprint:", error);
      toast.error("Creation failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
      setDebugResults(`Create Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="max-w-[80vw] max-h-[85vh] w-full h-[700px] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="px-8 py-6 border-b bg-background">
            <DialogTitle className="text-xl font-bold">Create New Blueprint</DialogTitle>
            
            <div className="flex justify-between items-center mt-1.5">
              <DialogDescription className="m-0">
                Describe what you want your AI to accomplish and we&apos;ll generate a blueprint for you.
              </DialogDescription>
              
              {/* Step Indicators */}
              <div className="flex items-center gap-6 text-sm">
                <div className={cn(
                  "flex items-center gap-2",
                  currentStep === 'prompt' ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  <div className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-full text-xs",
                    currentStep === 'prompt' 
                      ? "border-primary border text-primary font-medium" 
                      : "border border-muted-foreground/50 text-muted-foreground"
                  )}>
                    1
                  </div>
                  <span>Define Goal</span>
                </div>
                
                <div className={cn(
                  "flex items-center gap-2",
                  currentStep === 'conversation' ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  <div className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-full text-xs",
                    currentStep === 'conversation' 
                      ? "border-primary border text-primary font-medium" 
                      : "border border-muted-foreground/50 text-muted-foreground"
                  )}>
                    2
                  </div>
                  <span>Clarify Details</span>
                </div>
                
                {finalData && (
                  <div className={cn(
                    "flex items-center gap-2",
                    currentStep === 'review' ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    <div className={cn(
                      "w-5 h-5 flex items-center justify-center rounded-full text-xs",
                      currentStep === 'review' 
                        ? "border-primary border text-primary font-medium" 
                        : "border border-muted-foreground/50 text-muted-foreground"
                    )}>
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
                    onChange={(e) => setPrompt(e.target.value)}
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
                  <h3 className="text-lg font-semibold mb-3">Your Response</h3>
                  
                  <Textarea 
                    placeholder="Type your response here..." 
                    className="h-full resize-none text-lg p-6 border focus-visible:ring-offset-1"
                    value={currentResponse}
                    onChange={handleResponseChange}
                    disabled={isLoading}
                  />
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
                            "bg-background rounded-lg p-5 shadow-sm border mb-4 transition-all cursor-pointer",
                            activeQuestionIndex === index ? "border-primary" : "border-border hover:border-primary/30"
                          )}
                          onClick={() => handleQuestionClick(index)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-foreground">
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
                          <p className="text-sm text-muted-foreground">
                            {question.content}
                          </p>
                        </div>
                      ))}
                    </ScrollContainer>
                  )}
                </div>
              </div>
            )}
            
            {/* Review UI - kept from previous implementation */}
            {currentStep === 'review' && finalData && (
              <div className="flex flex-col p-8 h-full">
                <h3 className="text-lg font-semibold mb-5">Review Blueprint Details</h3>
                
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-base">Title</Label>
                      <Input 
                        id="title"
                        value={title || finalData.title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="search_query" className="text-base">Search Query</Label>
                      <Textarea 
                        id="search_query"
                        value={finalData.search_query}
                        onChange={(e) => setFinalData({...finalData, search_query: e.target.value})}
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="complexity" className="text-base">Complexity</Label>
                      <div className="text-sm p-2 border rounded-md mt-1 bg-background">
                        {finalData.complexity || 'Not specified'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="estimatedTime" className="text-base">Estimated Time</Label>
                      <div className="text-sm p-2 border rounded-md mt-1 bg-background">
                        {finalData.estimated_time || 'Not specified'}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="prerequisites" className="text-base">Prerequisites</Label>
                      <div className="text-sm p-2 border rounded-md mt-1 h-24 overflow-auto bg-background">
                        {finalData.prerequisites && finalData.prerequisites.length > 0 ? (
                          <ul className="list-disc pl-5">
                            {finalData.prerequisites.map((prereq, index) => (
                              <li key={index}>{prereq}</li>
                            ))}
                          </ul>
                        ) : (
                          'No prerequisites specified'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer with Back and Continue/Create buttons */}
          <DialogFooter className="border-t py-4 px-8 mt-auto">
            <div className="w-full flex items-center justify-between">
              <div>
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
                
                {/* Debug button - only shown in development mode */}
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-4 text-xs border-red-300 text-red-600 hover:bg-red-50"
                    onClick={debugBlueprint}
                  >
                    Debug
                  </Button>
                )}
              </div>
              <Button 
                type="button" 
                onClick={handleSubmit}
                disabled={
                  isLoading || 
                  (currentStep === 'prompt' && !prompt.trim()) ||
                  (currentStep === 'conversation' && questions.length > 0 && questions.every(q => questionStatus[q.id] === 'pending'))
                }
                className="gap-2 px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {currentStep === 'prompt' ? "Generating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {currentStep === 'prompt' && "Continue"}
                    {currentStep === 'conversation' && "Create Blueprint"}
                    {currentStep === 'review' && "Create Blueprint"}
                    {currentStep === 'prompt' && <ArrowRight className="h-4 w-4" />}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
          
          {/* Debug Results Display */}
          {debugResults && (
            <div className="mt-4 p-3 bg-slate-900 text-white text-xs rounded-md overflow-auto max-h-80 font-mono">
              <pre>{debugResults}</pre>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
} 