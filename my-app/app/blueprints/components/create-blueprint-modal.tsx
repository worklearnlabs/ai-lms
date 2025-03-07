"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/utils/utils"

interface CreateBlueprintModalProps {
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  const [conversation, setConversation] = useState<{role: 'user' | 'assistant', content: string}[]>([])
  
  // Sample conversation for demo purposes
  const demoConversation = [
    { role: 'assistant' as const, content: 'Can you tell me more about what specific LinkedIn data you want to analyze?' },
    { role: 'user' as const, content: 'I want to track posts about AI and machine learning from VCs and tech leaders.' },
    { role: 'assistant' as const, content: 'How frequently would you like to collect this data? Daily, weekly, or on-demand?' },
    { role: 'user' as const, content: 'Daily would be ideal, with a summary report.' },
    { role: 'assistant' as const, content: 'Would you prefer the summary to focus on sentiment analysis, topic extraction, or both?' },
  ]

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
    e.preventDefault()
    
    if (!title.trim() && currentStep === 'review') {
      toast.error("Please enter a title for your blueprint")
      return
    }
    
    if (!prompt.trim() && currentStep === 'prompt') {
      toast.error("Please enter a prompt for your blueprint")
      return
    }
    
    if (currentStep === 'prompt') {
      setCurrentStep('conversation')
      // In a real implementation, this is where you'd send the prompt to the AI
      // and start the conversation
      setConversation([
        ...demoConversation
      ])
      return
    }
    
    if (currentStep === 'conversation') {
      setCurrentStep('review')
      return
    }
    
    try {
      setIsLoading(true)
      
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success("Blueprint created successfully")
      setIsOpen(false)
      
      // Reset form
      setTitle("")
      setPrompt("")
      setCurrentStep('prompt')
      setConversation([])
    } catch (error) {
      toast.error("Failed to create blueprint", {
        description: (error as Error).message || "Please try again later"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleBack = () => {
    if (currentStep === 'conversation') {
      setCurrentStep('prompt')
    } else if (currentStep === 'review') {
      setCurrentStep('conversation')
    }
  }
  
  const handleUserMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('userMessage') as HTMLInputElement
    
    if (!input.value.trim()) return
    
    setConversation([
      ...conversation,
      { role: 'user', content: input.value },
      { role: 'assistant', content: 'Based on our conversation, I think we have enough information. Let&apos;s review the blueprint details.' }
    ])
    
    input.value = ''
    
    // Move to review step after a short delay to simulate AI processing
    setTimeout(() => {
      setCurrentStep('review')
      // In a real implementation, title would be suggested by the AI
      if (!title) setTitle("Daily LinkedIn Posts Summarizer")
    }, 1500)
  }

  const handleExampleClick = (exampleContent: string) => {
    setPrompt(exampleContent)
  }

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
              
              {/* Minimalist Step Indicators */}
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
                  <span>Review & Create</span>
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
                  
                  <div className="relative flex-1 overflow-hidden">
                    {/* Added padding-right to prevent scrollbar overlap */}
                    <div className="absolute inset-0 overflow-y-auto pr-4 space-y-4 pb-8 mask-fade-bottom">
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
                          <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors">
                            {example.content}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Fade-out effect at the bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 'conversation' && (
              <div className="grid grid-cols-3 gap-8 p-8 h-full">
                <div className="col-span-2 flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">Let&apos;s clarify your requirements</h3>
                  
                  <div className="flex-1 overflow-auto bg-muted/20 rounded-xl p-6 mb-4 border border-border/40 h-[280px]">
                    {conversation.map((message, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "mb-4 max-w-[80%] rounded-xl p-4",
                          message.role === 'user' 
                            ? "ml-auto bg-primary text-primary-foreground shadow-sm" 
                            : "mr-auto bg-background border border-border/50 shadow-sm"
                        )}
                      >
                        {message.content}
                      </div>
                    ))}
                  </div>
                  
                  <form onSubmit={handleUserMessage} className="flex gap-3">
                    <Input 
                      name="userMessage" 
                      placeholder="Type your response..." 
                      className="flex-1 py-6 text-base focus-visible:ring-offset-1"
                    />
                    <Button type="submit" size="default" className="px-6">
                      Send
                    </Button>
                  </form>
                </div>
                
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">Your Original Request</h3>
                  
                  <div className="bg-background rounded-xl p-4 shadow-sm border border-border/40 mb-6">
                    <p className="text-muted-foreground whitespace-pre-wrap">{prompt}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Agent Status</h3>
                    <div className="bg-background rounded-xl p-5 shadow-sm border border-border/40">
                      <div className="flex items-center text-amber-500 mb-4">
                        <div className="h-4 w-4 mr-3 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium">Understanding request context</span>
                      </div>
                      <div className="flex items-center text-blue-500 mb-4">
                        <div className="h-4 w-4 mr-3 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium">Gathering required details</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <div className="h-4 w-4 mr-3 rounded-full border-2 border-muted flex-shrink-0 animate-pulse" />
                        <span className="text-sm font-medium">Finalizing blueprint structure</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 'review' && (
              <div className="grid grid-cols-2 gap-8 p-8 h-full">
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-5">Review Your Blueprint</h3>
                  
                  <div className="grid gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="text-base font-medium">Blueprint Title</Label>
                      <Input 
                        id="title" 
                        placeholder="E.g., LinkedIn Data Scraper" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="py-6 text-base focus-visible:ring-offset-1"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="searchQuery" className="text-base font-medium">Refined Search Query</Label>
                      <Input 
                        id="searchQuery" 
                        placeholder="LinkedIn post ideas for venture capital, AI, and Google Bard updates" 
                        value="LinkedIn posts about AI, machine learning, venture capital from tech leaders, daily updates"
                        className="py-6 text-base bg-muted/30 border-dashed"
                        readOnly
                      />
                    </div>
                    
                    <div className="bg-muted/30 p-5 rounded-xl border border-border/40 mt-3">
                      <h4 className="font-semibold mb-3 text-primary">Blueprint Summary</h4>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        A system that will monitor LinkedIn daily for posts about AI and machine learning from venture capitalists and tech leaders. It will extract key content, analyze topics and sentiment, and generate a daily summary report highlighting important trends and discussions.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">Conversation Summary</h3>
                  
                  <div className="overflow-auto max-h-[250px] pr-2 bg-background rounded-xl p-4 border border-border/40 mb-6">
                    {conversation.map((message, index) => (
                      <div key={index} className="mb-5 last:mb-0">
                        <p className="text-xs font-semibold mb-1.5 text-primary/80">
                          {message.role === 'user' ? 'You' : 'AI Assistant'}:
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-3">What&apos;s Next</h3>
                    <div className="bg-background rounded-xl p-5 shadow-sm border border-border/40">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        After creating this blueprint, our AI will generate a detailed step-by-step implementation plan. You&apos;ll be able to track progress, make adjustments, and finalize the solution to exactly match your requirements.
                      </p>
                      <div className="mt-4 text-xs text-muted-foreground border-t border-border/40 pt-4">
                        <span className="font-medium">Note:</span> The implementation plan will include estimated completion times and required tools for each step.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Simplified footer without the text */}
          <DialogFooter className="border-t py-4 px-8 mt-auto">
            <div className="w-full flex items-center justify-end">
              <div className="flex items-center gap-3 flex-shrink-0">
                {currentStep !== 'prompt' && (
                  <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
                <Button 
                  type={currentStep === 'review' ? 'submit' : 'button'} 
                  onClick={currentStep !== 'review' ? handleSubmit : undefined}
                  disabled={isLoading}
                  className="gap-2 px-8"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      {currentStep === 'prompt' && "Continue"}
                      {currentStep === 'conversation' && "Review Blueprint"}
                      {currentStep === 'review' && "Create Blueprint"}
                      {currentStep !== 'review' && <ArrowRight className="h-4 w-4" />}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 