# Blueprint Modal Improvements Implementation Plan

## Overview

Based on the analysis of the current implementation of the `CreateBlueprintModal` component, several improvements are required:

1. Direct users to the second slide for temporary blueprints
2. Enable step navigation through the top navigation indicators
3. Disable CTA for existing blueprints with proper text
4. Make CTA clickable when text changes with confirmation modal
5. Add AI-generated boilerplate answer functionality
6. Fix user_id issue when creating temporary blueprints
7. Fix blueprint title generation issue

## Current Implementation Analysis

### Modal Flow and State Management

The current modal has three main steps:

1. **Define Goal** (`prompt` step): User inputs what they want to build
2. **Clarify Details** (`conversation` step): User answers questions for detail clarification
3. **Review** (`review` step): User reviews the final blueprint before creation

The component manages state for temporary blueprints using `temporaryBlueprintId` prop and `tempBlueprintId` state, loading data when opening an existing blueprint.

### Issues Identified

1. **Temporary Blueprint Navigation**: Current implementation always starts at the first slide regardless of whether it's a temporary blueprint
2. **Step Nav Links**: The step indicators are displayed but not clickable
3. **CTA Button Behavior**: The CTA button doesn't adapt when opening existing blueprints
4. **Missing Confirmation**: No confirmation when regenerating questions for existing blueprints
5. **Missing AI Assistance**: No way to generate boilerplate answers
6. **User ID Issue**: Temporary blueprints aren't properly associated with users
7. **Title Generation Issue**: Issues with extracting title from OpenAI responses

## Implementation Plan

### 1. Direct Users to Second Slide for Temporary Blueprints

#### Changes Required:

```typescript
// In the useEffect that loads temporary blueprints
useEffect(() => {
  if (temporaryBlueprintId) {
    const loadTemporaryBlueprint = async () => {
      try {
        // Existing loading code...

        // After loading blueprint data
        const processLoadedBlueprint = (data: BlueprintData) => {
          // Existing data processing code...

          // Check if this is a temporary blueprint and has questions
          if (
            data.is_temporary &&
            data.content &&
            data.content.questions &&
            data.content.questions.length > 0
          ) {
            // Direct to the second slide (conversation)
            setCurrentStep("conversation");
          } else if (data.search_query) {
            // If there's a search_query, we have final data, go to review
            setCurrentStep("review");
          } else {
            // For non-temporary blueprints with no questions yet, start at prompt step
            setCurrentStep("prompt");
          }

          // Rest of the existing processing code...
        };

        // Existing blueprint loading and processing...
      } catch (error) {
        // Error handling...
      }
    };

    loadTemporaryBlueprint();
  }
}, [temporaryBlueprintId]);
```

### 2. Enable Step Navigation Links

#### Changes Required:

```typescript
// Add click handlers to the step indicators in the DialogHeader
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
    {/* Existing step indicator content */}
  </div>

  <div
    className={cn(
      "flex items-center gap-2 cursor-pointer",
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
    {/* Existing step indicator content */}
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
      {/* Existing step indicator content */}
    </div>
  )}
</div>
```

### 3. Disable CTA for Existing Blueprints

#### Changes Required:

```typescript
// Add state to track if this is an existing blueprint and if text was changed
const [isExistingBlueprint, setIsExistingBlueprint] = useState(false);
const [promptChanged, setPromptChanged] = useState(false);

// Update when loading blueprint
useEffect(() => {
  if (temporaryBlueprintId) {
    // In loadTemporaryBlueprint function
    const processLoadedBlueprint = (data: BlueprintData) => {
      // Existing code...

      // Mark as existing blueprint
      setIsExistingBlueprint(true);
      setPromptChanged(false); // Reset the changed flag
    };
  }
}, [temporaryBlueprintId]);

// Track prompt changes
const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newValue = e.target.value;
  setPrompt(newValue);

  // Track if prompt was changed from initial value
  if (isExistingBlueprint && newValue !== initialPrompt) {
    setPromptChanged(true);
  }
};

// Update in the Textarea
<Textarea
  id="prompt"
  placeholder="E.g., Run a daily search of LinkedIn posts..."
  className="h-full resize-none text-lg p-6 border focus-visible:ring-offset-1"
  value={prompt}
  onChange={handlePromptChange} // Use the new handler
  disabled={isLoading}
  required
/>

// Modify the CTA button for prompt step
{currentStep === 'prompt' && (
  isExistingBlueprint
    ? (promptChanged ? "Refresh Questions" : "Continue")
    : "Continue"
)}

// Add a condition to the disable prop of the button
disabled={
  isLoading ||
  (currentStep === 'prompt' && !prompt.trim()) ||
  (currentStep === 'prompt' && isExistingBlueprint && !promptChanged) || // Disable for existing blueprints unless changed
  (currentStep === 'conversation' && questions.length > 0 && questions.every(q => questionStatus[q.id] === 'pending'))
}
```

### 4. Confirmation Modal for Regenerating Questions

#### Changes Required:

```typescript
// Add state for confirmation modal
const [showConfirmation, setShowConfirmation] = useState(false);

// Modify handleSubmit for prompt step
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (isLoading) return;

  try {
    if (currentStep === "prompt") {
      // Check if this is an existing blueprint with changes
      if (isExistingBlueprint && promptChanged) {
        // Show confirmation instead of proceeding directly
        setShowConfirmation(true);
        return;
      }

      await handleInitialPrompt();
    }
    // Rest of the existing code...
  } catch (error) {
    // Error handling...
  }
};

// Add confirmation dialog
{
  showConfirmation && (
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Refresh Questions?</DialogTitle>
          <DialogDescription>
            This will generate new questions based on your updated prompt. Your
            previous answers will be lost and you'll need to answer the new
            questions.
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
  );
}
```

### 5. Add AI-Generated Boilerplate Answer Button

#### Changes Required:

```typescript
// Add function to generate boilerplate answer
const generateBoilerplateAnswer = async (
  questionId: number,
  questionContent: string
) => {
  try {
    setIsLoading(true);
    toast.loading("Generating answer...", { id: "generate-answer" });

    const response = await fetch("/api/blueprints/generate-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        question: questionContent,
        blueprint_id: tempBlueprintId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate answer: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.answer) {
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
      description: error instanceof Error ? error.message : "Please try again",
    });
  } finally {
    setIsLoading(false);
  }
};

// Add button to the textarea container
<div className="flex flex-col h-full relative">
  <h3 className="text-lg font-semibold mb-3">
    Your Response
    {autoSaving && (
      <span className="ml-2 text-sm text-muted-foreground">
        (Auto-saving...)
      </span>
    )}
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

    <Button
      type="button"
      size="sm"
      variant="outline"
      className="absolute bottom-3 right-3 text-xs"
      onClick={() => {
        const currentQuestion = questions[activeQuestionIndex];
        if (currentQuestion) {
          generateBoilerplateAnswer(
            currentQuestion.id,
            currentQuestion.content
          );
        }
      }}
      disabled={isLoading}
    >
      <MagicWand className="h-3 w-3 mr-1" />
      Generate Answer
    </Button>
  </div>
</div>;
```

### 6. Fix User ID Issue with Temporary Blueprints

#### Changes Required:

```typescript
// In handleInitialPrompt function
const handleInitialPrompt = async () => {
  setIsLoading(true);

  try {
    // Create a temporary blueprint first to get an ID
    let blueprint_id = tempBlueprintId;

    if (!blueprint_id) {
      console.log("Creating temporary blueprint...");

      const createResponse = await fetch("/api/blueprints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include", // Ensure credentials are included
        body: JSON.stringify({
          title: `Draft: ${prompt.substring(0, 30)}...`,
          prompt: prompt,
          is_temporary: true,
          // Don't need to explicitly add user_id here, the API should handle it
        }),
      });

      // Rest of the existing code...
    }

    // Rest of the existing code...
  } catch (error) {
    // Error handling...
  }
};
```

### 7. Fix Blueprint Title Generation

#### Changes Required:

Create a new API route for title generation that properly extracts the title from OpenAI's responses:

```typescript
// api/blueprints/generate-title/route.ts
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/utils/route-handlers";
import { Configuration, OpenAIApi } from "openai";

export const POST = createRouteHandler(
  ["POST"],
  async (req, { supabase, user }) => {
    try {
      const { prompt } = await req.json();

      if (!prompt || typeof prompt !== "string") {
        return NextResponse.json(
          { error: "Invalid input. Prompt is required." },
          { status: 400 }
        );
      }

      // Initialize OpenAI
      const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const openai = new OpenAIApi(configuration);

      // Explicitly request a title in a specific format
      const titlePrompt = `
        Generate a concise, descriptive title (5-8 words) for an AI system that does the following:
        
        ${prompt}
        
        Respond with ONLY the title, without quotes or formatting. The title should be clear, professional, and accurately describe the AI system's purpose.
      `;

      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates concise, descriptive titles.",
          },
          { role: "user", content: titlePrompt },
        ],
        max_tokens: 50,
        temperature: 0.7,
      });

      // Extract and clean up the title
      let title = response.data.choices[0]?.message?.content?.trim() || "";

      // Remove any quotes or artifacts that might be present
      title = title.replace(/^["']|["']$/g, "");

      // Ensure it's not too long
      if (title.length > 100) {
        title = title.substring(0, 97) + "...";
      }

      return NextResponse.json({ title });
    } catch (error) {
      console.error("Error generating title:", error);
      return NextResponse.json(
        { error: "Failed to generate title" },
        { status: 500 }
      );
    }
  },
  { requireAuth: false } // Allow unauthenticated access
);
```

Then update the blueprint generation logic to use this endpoint:

```typescript
// In handleInitialPrompt
const generateTitle = async (promptText: string) => {
  const titleResponse = await fetch("/api/blueprints/generate-title", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    credentials: "include",
    body: JSON.stringify({
      prompt: promptText,
    }),
  });

  if (!titleResponse.ok) {
    console.error("Failed to generate title:", titleResponse.statusText);
    return `Draft: ${promptText.substring(0, 30)}...`;
  }

  const titleData = await titleResponse.json();
  return titleData.title || `Draft: ${promptText.substring(0, 30)}...`;
};

// Then use it when creating the blueprint
const title = await generateTitle(prompt);
```

## API Requirements

### New API Endpoints Needed:

1. **Generate Answer API**

   - Path: `/api/blueprints/generate-answer`
   - Method: POST
   - Purpose: Generate a boilerplate answer for a question
   - Inputs: question content, blueprint_id
   - Outputs: generated answer text

2. **Generate Title API**
   - Path: `/api/blueprints/generate-title`
   - Method: POST
   - Purpose: Generate a title for a blueprint from a prompt
   - Inputs: prompt text
   - Outputs: generated title text

## Testing Plan

1. **Temporary Blueprint Navigation**

   - Create a temporary blueprint and leave it unfinished
   - Return to it later and verify it opens on the second slide

2. **Step Navigation**

   - Create a new blueprint and navigate through each step
   - Verify ability to navigate back and forth using the step indicators

3. **CTA Button Behavior**

   - Open an existing blueprint and verify CTA is disabled
   - Make changes to the prompt and verify CTA becomes enabled with "Refresh Questions" text

4. **Confirmation Dialog**

   - Change the prompt for an existing blueprint and click "Refresh Questions"
   - Verify confirmation dialog appears with appropriate warning

5. **AI Answer Generation**

   - Test the "Generate Answer" button on various questions
   - Verify quality and relevance of generated answers

6. **User ID Association**

   - Create a temporary blueprint while logged in
   - Verify in the database that user_id is correctly populated

7. **Title Generation**
   - Test the title generation with various prompts
   - Verify titles are properly formatted and relevant

## Implementation Strategy

1. Start with the navigation issues (issues #1 and #2) as they are simpler UI changes
2. Implement the CTA button behavior and confirmation dialog (issues #3 and #4)
3. Create the new API endpoints for answer generation and title generation
4. Fix the user_id association issue with temporary blueprints
5. Add the AI answer generation button

This implementation plan addresses all the requested improvements while maintaining the existing functionality and enhancing the user experience with the blueprint creation process.
