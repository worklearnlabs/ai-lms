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
  onOpenChange: externalOnOpenChange 
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
      // If there's a created blueprint but the process wasn't completed, delete it
      if (createdBlueprintId && currentStep !== 'review') {
        try {
          // Clean up the abandoned blueprint
          console.log('Cleaning up abandoned blueprint:', createdBlueprintId);
          blueprintApi.deleteBlueprint(createdBlueprintId)
            .catch(error => console.error('Error deleting abandoned blueprint:', error));
        } catch (error) {
          console.error('Failed to clean up blueprint:', error);
        }
      }
      
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
  }, [isOpen, createdBlueprintId, currentStep]);

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
      console.error('Failed to save response:', errorText);
      throw new Error(`Failed to save response: ${saveResponse.status} ${errorText}`);
    }
    
    console.log('Response saved successfully');
  };
  
  // Handle creating the final blueprint
  const handleCreateBlueprint = async () => {
    // Check if all questions are answered
    const allAnswered = questions.length > 0 && 
                        questions.every(q => questionStatus[q.id] === "complete");
    
    if (!allAnswered) {
      // Save current question if there's content
      if (currentResponse.trim()) {
        const currentQuestion = questions[activeQuestionIndex];
        
        if (currentQuestion) {
          const updatedResponses = {
            ...responses,
            [currentQuestion.id]: currentResponse
          };
          
          setResponses(updatedResponses);
          
          setQuestionStatus(prev => ({
            ...prev,
            [currentQuestion.id]: "complete"
          }));
          
          // Save final response to database
          if (tempBlueprintId) {
            try {
              await saveResponseToDatabase(tempBlueprintId, currentQuestion.id.toString(), currentResponse);
            } catch (error) {
              console.error('Error saving final response:', error);
              // Continue despite this error
            }
          }
        }
      }
      
      // Check again after saving
      const stillMissing = questions.some(q => questionStatus[q.id] !== "complete");
      if (stillMissing) {
        toast.error("Please answer all questions before proceeding");
        return;
      }
    }
    
    try {
      setIsLoading(true);
      
      if (!tempBlueprintId) {
        toast.error("No temporary blueprint found");
        setIsLoading(false);
        return;
      }
      
      console.log('Finalizing blueprint with ID:', tempBlueprintId);
      
      // Get all the responses together to generate a refined search query
      const refinedSearchQuery = await generateRefinedSearchQuery(prompt, responses);
      
      // Update the blueprint with the final details
      const updateResult = await fetch(`/api/blueprints/${tempBlueprintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: prompt.split('\n')[0].slice(0, 50) || 'New Blueprint',
          search_query: refinedSearchQuery,
          is_temporary: false, // Mark as a permanent blueprint
          content: { 
            original_prompt: prompt,
            questions: questions.map(q => ({ id: q.id, title: q.title, content: q.content })),
            responses: responses
          },
        }),
      });
      
      if (!updateResult.ok) {
        const errorText = await updateResult.text();
        throw new Error(`Failed to update blueprint: ${updateResult.status} ${errorText}`);
      }
      
      const updatedBlueprint = await updateResult.json();
      console.log('Blueprint updated successfully:', updatedBlueprint);
      
      toast.success("Blueprint created successfully");
      setIsOpen(false);
      
      // Redirect to the blueprint page
      window.location.href = `/blueprints/${tempBlueprintId}`;
      
    } catch (error) {
      console.error('Error creating blueprint:', error);
      toast.error("Failed to create blueprint", {
        description: error instanceof Error ? error.message : "Please try again later"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to generate a refined search query based on responses
  const generateRefinedSearchQuery = async (originalPrompt: string, questionResponses: { [key: number]: string }): Promise<string> => {
    try {
      // For now, we'll just concatenate the prompt with responses
      // In a real implementation, you might use an AI to refine this
      const combinedResponses = Object.values(questionResponses).join(' ');
        
      return `${originalPrompt} ${combinedResponses}`.substring(0, 500);
    } catch (error) {
      console.error('Error generating refined search query:', error);
      return originalPrompt;
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