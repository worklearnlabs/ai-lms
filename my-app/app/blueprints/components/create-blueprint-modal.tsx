"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { ArrowRight, ArrowLeft } from "lucide-react"

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

interface CreateBlueprintModalProps {
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Question status type
type QuestionStatusMap = {
  [key: number]: "pending" | "complete";
};

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [title, setTitle] = useState("")
  const [prompt, setPrompt] = useState("")
  const [currentStep, setCurrentStep] = useState<'prompt' | 'conversation'>('prompt')
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [conversation, setConversation] = useState<{role: 'user' | 'assistant', content: string, questionId?: number}[]>([])
  const [currentResponse, setCurrentResponse] = useState("")
  
  // Sample questions for the Clarify Details step
  const questions = [
    {
      id: 1,
      title: "Define your audience",
      content: "Can you tell me more about who will be using this LinkedIn content analyzer? Are they marketers, sales professionals, or executives?",
      status: "pending" // This will be updated to "complete" once answered
    },
    {
      id: 2,
      title: "Data collection frequency",
      content: "How frequently would you like to collect data from LinkedIn? Daily, weekly, or on-demand?",
      status: "pending"
    },
    {
      id: 3,
      title: "Analysis focus",
      content: "What specific metrics and insights would be most valuable to you? Engagement rates, sentiment analysis, topic trends, or something else?",
      status: "pending"
    },
    {
      id: 4,
      title: "Output format",
      content: "How would you like the results presented? As a dashboard, PDF report, email summary, or in another format?",
      status: "pending"
    }
  ]
  
  // Track question status - initialize with all questions as pending
  const [questionStatus, setQuestionStatus] = useState<QuestionStatusMap>(
    questions.reduce((acc, q) => ({...acc, [q.id]: "pending"}), {})
  );

  // Save current question response when selecting a new question
  useEffect(() => {
    // Skip on first render or when response is empty
    if (conversation.length === 0 || !currentResponse.trim()) return;
    
    // Get the previously active question
    const prevQuestion = questions.find((q, i) => i === activeQuestionIndex);
    if (!prevQuestion) return;
    
    // Save response and mark as complete
    const saveResponse = () => {
      // Add the response to conversation
      setConversation(prev => [
        ...prev,
        { role: 'assistant', content: prevQuestion.content, questionId: prevQuestion.id },
        { role: 'user', content: currentResponse, questionId: prevQuestion.id }
      ]);
      
      // Mark as complete
      setQuestionStatus(prev => ({
        ...prev,
        [prevQuestion.id]: "complete"
      }));
      
      // Clear the response field
      setCurrentResponse("");
    };
    
    saveResponse();
  }, [activeQuestionIndex]); // This will run when activeQuestionIndex changes
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 'conversation') {
      // Save current response if any
      if (currentResponse.trim()) {
        const currentQuestion = questions[activeQuestionIndex];
        setConversation([
          ...conversation,
          { role: 'assistant', content: currentQuestion.content, questionId: currentQuestion.id },
          { role: 'user', content: currentResponse, questionId: currentQuestion.id }
        ]);
        
        setQuestionStatus({
          ...questionStatus,
          [currentQuestion.id]: "complete"
        });
        
        setCurrentResponse("");
      }
      
      // Check if all questions are answered
      const allAnswered = questions.every(q => questionStatus[q.id] === "complete");
      if (!allAnswered) {
        toast.error("Please answer all questions before proceeding");
        return;
      }
      
      // Create the blueprint directly
      try {
        setIsLoading(true);
        
        // This would be replaced with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.success("Blueprint created successfully");
        setIsOpen(false);
        
        // Reset form
        setTitle("");
        setPrompt("");
        setCurrentStep('prompt');
        setConversation([]);
        setQuestionStatus(questions.reduce((acc, q) => ({...acc, [q.id]: "pending"}), {}));
      } catch (error) {
        toast.error("Failed to create blueprint", {
          description: (error as Error).message || "Please try again later"
        });
      } finally {
        setIsLoading(false);
      }
      
      return;
    }
    
    if (currentStep === 'prompt') {
      if (!prompt.trim()) {
        toast.error("Please enter a prompt for your blueprint");
        return;
      }
      
      setTitle(prompt.split('\n')[0].slice(0, 50) + (prompt.length > 50 ? '...' : ''));
      setCurrentStep('conversation');
      return;
    }
  };
  
  const handleBack = () => {
    if (currentStep === 'conversation') {
      setCurrentStep('prompt');
    }
  };
  
  const handleExampleClick = (exampleContent: string) => {
    setPrompt(exampleContent);
  };
  
  const handleQuestionClick = (index: number) => {
    // If there's a current response, save it before switching
    if (currentResponse.trim()) {
      const currentQuestion = questions[activeQuestionIndex];
      setConversation([
        ...conversation,
        { role: 'assistant', content: currentQuestion.content, questionId: currentQuestion.id },
        { role: 'user', content: currentResponse, questionId: currentQuestion.id }
      ]);
      
      setQuestionStatus({
        ...questionStatus,
        [currentQuestion.id]: "complete"
      });
      
      setCurrentResponse("");
    }
    
    // Switch to the new question
    setActiveQuestionIndex(index);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="max-w-[80vw] max-h-[85vh] w-full h-[700px] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="px-8 py-6 border-b bg-background">
            <DialogTitle className="text-xl font-bold">Create New Blueprint</DialogTitle>
            
            {/* Combined container for subtitle and step indicators */}
            <div className="flex justify-between items-center mt-1.5">
              <DialogDescription className="m-0">
                Describe what you want your AI to accomplish and we&apos;ll generate a blueprint for you.
              </DialogDescription>
              
              {/* Minimalist Step Indicators - only 2 steps now */}
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
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 h-[480px] flex flex-col">
            {currentStep === 'prompt' && (
              <div className="grid grid-cols-2 gap-8 p-8 h-full">
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-3">What do you want to build?</h3>
                  
                  <Textarea 
                    id="prompt" 
                    placeholder="E.g., Run a daily search of LinkedIn posts for specific keywords, extract post data, and summarize the content..." 
                    className="h-full resize-none text-lg p-6 border focus-visible:ring-offset-1"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    required
                  />
                </div>
                
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
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-3">Your Response</h3>
                  
                  {/* Response textarea - removed the dynamic question title */}
                  <Textarea 
                    placeholder="Type your response here..." 
                    className="h-full resize-none text-lg p-6 border focus-visible:ring-offset-1"
                    value={currentResponse}
                    onChange={(e) => setCurrentResponse(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-3">Questions</h3>
                  
                  <ScrollContainer className="pr-4">
                    {questions.map((question, index) => (
                      <div 
                        key={question.id}
                        className={cn(
                          "bg-background rounded-lg p-5 shadow-sm border transition-all cursor-pointer",
                          activeQuestionIndex === index ? "border-primary" : "border-border hover:border-primary/30",
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
                </div>
              </div>
            )}
          </div>
          
          {/* Footer - simplified with two steps */}
          <DialogFooter className="border-t py-4 px-8 mt-auto">
            <div className="w-full flex items-center justify-between">
              <div>
                {currentStep !== 'prompt' && (
                  <Button type="button" variant="ghost" onClick={handleBack} disabled={isLoading} className="gap-2 text-muted-foreground hover:text-foreground">
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
                  (currentStep === 'conversation' && questions.every(q => questionStatus[q.id] === 'pending'))
                }
                variant={currentStep === 'conversation' ? "default" : "ghost"}
                className={cn(
                  "gap-2",
                  currentStep === 'conversation' ? "px-8" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    {currentStep === 'prompt' && (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                    {currentStep === 'conversation' && "Create Blueprint"}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 