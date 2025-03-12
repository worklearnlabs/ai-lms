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
import { blueprintApi } from "@/utils/blueprints-api"

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
    estimatedTime?: string;
    prerequisites?: string[];
  } | null>(null);
  
  // Example blueprints with difficulty levels
  const examples = [
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
  ]
  
  // Difficulty color mapping
  const difficultyColors = {
    Easy: "text-green-500 bg-green-50 dark:bg-green-950/30",
    Medium: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
    Hard: "text-red-500 bg-red-50 dark:bg-red-950/30",
  }
  
  // Use external state if provided, otherwise use internal state
  const isControlled = externalIsOpen !== undefined && externalOnOpenChange !== undefined
  const isOpen = isControlled ? externalIsOpen : internalIsOpen
  const setIsOpen = isControlled 
    ? externalOnOpenChange 
    : setInternalIsOpen
    
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

          // Helper function to process the loaded blueprint data
          const processLoadedBlueprint = (data: BlueprintData) => {
            // Set the title and prompt
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
                estimatedTime: data.estimated_time,
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
              
              // Set question status based on responses
              const newQuestionStatus: QuestionStatusMap = {};
              for (const questionId in data.content.responses) {
                newQuestionStatus[parseInt(questionId)] = "complete";
              }
              setQuestionStatus(newQuestionStatus);
              
              // If we have responses and not final data, move to the conversation step
              if (!data.search_query) {
                setCurrentStep('conversation');
                setActiveQuestionIndex(Object.keys(data.content.responses).length);
              }
            }
            
            // Set the blueprint ID
            setCreatedBlueprintId(temporaryBlueprintId);
          };
          
          // Try using the blueprintApi utility directly without any pre-verification
          try {
            console.log("Attempting to load blueprint with blueprintApi:", temporaryBlueprintId);
            const { data, error } = await blueprintApi.getBlueprintById(temporaryBlueprintId);
            
            if (error) {
              console.error("Error using blueprintApi:", error);
              throw new Error("Failed to load with blueprintApi");
            }
            
            if (data) {
              console.log("Successfully loaded blueprint with blueprintApi:", data);
              processLoadedBlueprint(data);
              return;
            }
          } catch (apiError) {
            console.error("Error with blueprintApi approach:", apiError);
            // Continue to fallback approach
          }
          
          // Fallback: Direct fetch to the API endpoint
          console.log("Attempting direct API fetch as fallback");
          
          try {
            const response = await fetch(`/api/blueprints/${temporaryBlueprintId}`);
            
            if (!response.ok) {
              console.error(`API response error: ${response.status} ${response.statusText}`);
              
              // Blueprint couldn't be found/accessed, start a fresh blueprint process
              startFreshBlueprint(
                "Your previous draft couldn't be loaded", 
                "Starting a new blueprint creation process"
              );
              return;
            }
            
            const data = await response.json();
            console.log("API response data:", data);
            
            // API now returns the blueprint directly, not wrapped in an object
            if (!data) {
              console.error("No blueprint data in API response");
              startFreshBlueprint(
                "Blueprint data was empty", 
                "Starting a new blueprint creation process"
              );
              return;
            }
            
            console.log("Loaded temporary blueprint data:", data);
            processLoadedBlueprint(data);
          } catch (fetchError) {
            console.error("Error fetching blueprint directly:", fetchError);
            startFreshBlueprint(
              "Error loading your previous draft", 
              "Starting a new blueprint creation process"
            );
          }
        } catch (error) {
          console.error("Unexpected error loading temporary blueprint:", error);
          
          // Handle any unexpected errors by starting fresh
          setTitle("");
          setPrompt("");
          setCurrentStep('prompt');
          setQuestions([]);
          setResponses({});
          setQuestionStatus({});
          setActiveQuestionIndex(0);
          
          toast.error("Unexpected error", {
            description: "Starting a new blueprint creation process"
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      loadTemporaryBlueprint();
    }
  }, [temporaryBlueprintId]);

  // Define an interface for the question object from API
  interface QuestionResponse {
    id?: number;
    title?: string;
    content?: string;
    [key: string]: unknown;
  }

  // New state for temporary blueprint
  const [tempBlueprintId, setTempBlueprintId] = useState<string | null>(null);
  
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
          throw new Error(`Failed to create temporary blueprint: ${blueprintResponse.status}`);
        }
        
        const blueprintData = await blueprintResponse.json();
        setTempBlueprintId(blueprintData.id);
        console.log('Created temporary blueprint:', blueprintData.id);
        
        // Step 2: Now fetch questions using the temporary blueprint ID
        await fetchQuestions(prompt, blueprintData.id);
      } else {
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
  
  // Handle question click to change active question
  const handleQuestionClick = async (index: number) => {
    // If there's a current response, save it before switching
    if (currentResponse.trim()) {
      const currentQuestion = questions[activeQuestionIndex];
      
      if (currentQuestion) {
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
        
        // Save response to database if we have a blueprint_id
        if (tempBlueprintId) {
          try {
            await saveResponseToDatabase(tempBlueprintId, currentQuestion.id.toString(), currentResponse);
            console.log(`Response saved for question ${currentQuestion.id}`);
          } catch (error) {
            console.error('Error saving response:', error);
            // Continue despite error - we've already updated the UI state
            toast.error("Couldn't save your response", { 
              description: "Your response was saved locally but not synced to the server."
            });
          }
        } else {
          console.warn('No temporary blueprint ID available, response not saved to database');
        }
      }
      
      // Clear the response field for the next question
      setCurrentResponse("");
    }
    
    // Set the new active question
    setActiveQuestionIndex(index);
    
    // If this question has a saved response, populate the text field
    const nextQuestion = questions[index];
    if (nextQuestion && responses[nextQuestion.id]) {
      setCurrentResponse(responses[nextQuestion.id]);
    }
  };
  
  // New function to save responses to the database
  const saveResponseToDatabase = async (blueprintId: string, questionId: string, response: string): Promise<void> => {
    // Implement retry logic
    const maxRetries = 3;
    let attemptCount = 0;
    let lastError = null;
    
    while (attemptCount < maxRetries) {
      try {
        attemptCount++;
        console.log(`Attempt ${attemptCount} to save response for question ${questionId}`);
        
        // First check if questions record exists
        if (attemptCount === 1) {
          try {
            const checkResponse = await fetch(`/api/blueprints/questions/responses?blueprint_id=${blueprintId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (!checkResponse.ok && checkResponse.status === 404) {
              console.warn('Questions record not found, creating placeholder in UI state');
              // Continue - the endpoint will now create a placeholder if needed
            }
          } catch (checkError) {
            console.error('Error checking for questions record:', checkError);
            // Continue with post despite check error
          }
        }
        
        // Save the response
        const saveResponse = await fetch('/api/blueprints/questions/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            blueprint_id: blueprintId,
            responses: {
              [questionId]: response
            }
          }),
        });
        
        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          console.error(`Attempt ${attemptCount} failed to save response:`, errorText);
          
          // If it's a 404 error, we need to handle it specially
          if (saveResponse.status === 404 && attemptCount === 1) {
            // The endpoint now has logic to create a placeholder record if needed
            console.warn('404 error, retrying as endpoint should now create placeholder');
            lastError = new Error(errorText);
            // Small delay before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          throw new Error(`Failed to save response: ${saveResponse.status} ${errorText}`);
        }
        
        console.log('Response saved successfully');
        return;
      } catch (error) {
        console.error(`Attempt ${attemptCount} error:`, error);
        lastError = error;
        
        // Add a small delay before retrying
        if (attemptCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * attemptCount));
        }
      }
    }
    
    // If we get here, all retry attempts failed
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
        estimated_time: finalData.estimatedTime,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (currentStep === 'review' && finalData) {
        await handleCreateBlueprint();
      } else if (currentStep === 'conversation') {
        await handleCreateBlueprint();
      } else if (currentStep === 'prompt') {
        await handleInitialPrompt();
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
                  <h3 className="text-lg font-semibold mb-3">Examples</h3>
                  
                  <ScrollContainer className="pr-4">
                    {examples.map((example, index) => (
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
                    ))}
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
                        {finalData.estimatedTime || 'Not specified'}
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
        </form>
      </DialogContent>
    </Dialog>
  );
} 