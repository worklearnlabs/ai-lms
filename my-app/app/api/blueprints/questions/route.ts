import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Allow longer timeout for the AI to generate questions
export const maxDuration = 30;

// Define the Question schema
const QuestionSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string()
});

// Commented out for now, but keeping for future validation if needed
// const QuestionsSchema = z.array(QuestionSchema);

// Define the schema for the request body
const QuestionsRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
  learning_objective: z.string().optional(),
});

// Define the Question type for TypeScript
export type Question = {
  id: number;
  title: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    // Parse request body
    const json = await req.json();
    console.log('Received request:', json);
    
    // Validate input using Zod schema
    const validationResult = QuestionsRequestSchema.safeParse(json);
    if (!validationResult.success) {
      console.error('Invalid input:', validationResult.error.format());
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }
    
    const { prompt, skill_level, learning_objective } = validationResult.data;
    console.log('Processing prompt:', prompt);
    
    // Create system prompt for the AI
    const systemPrompt = `
You are an AI educator and consultant assistant.
Based on the user's request for: "${prompt}"

Generate exactly 4 clarifying questions that would help you understand the user's requirements better.
${skill_level ? `- Consider the user's skill level: ${skill_level}` : ''}
${learning_objective ? `- Consider the user's learning objective: ${learning_objective}` : ''}

Be thoughtful and specific. Each question should help clarify an important aspect of the project that would be necessary for implementation.
Avoid generic questions. Make each question targeted to the specific AI project being requested.

You MUST respond in JSON format with an array of question objects. Each object MUST have these properties:
- "id": a numeric identifier (1-4)
- "title": a short title for the question
- "content": the full text of the question
`;

    try {
      console.log('Calling Vercel AI SDK with gpt-4-turbo and JSON response format...');
      
      // Use the Vercel AI SDK to generate text with JSON formatting
      const { text: responseText } = await generateText({
        model: openai('gpt-4-turbo'),
        prompt: systemPrompt,
        temperature: 0.2,
        maxTokens: 800,
        providerOptions: {
          openai: {
            response_format: { type: 'json_object' }
          }
        }
      });
      
      console.log('AI SDK response received');
      console.log('Raw response:', responseText);
      
      try {
        // Remove markdown code blocks if present (like ```json ... ```)
        let cleanedResponse = responseText;
        if (responseText.includes('```')) {
          console.log('Markdown code blocks detected, removing them');
          cleanedResponse = responseText.replace(/```(?:json|javascript)?\n?([\s\S]*?)```/g, '$1');
        }
        
        // Check if the response is an array directly (without a "questions" property)
        if (cleanedResponse.trim().startsWith('[') && cleanedResponse.trim().endsWith(']')) {
          console.log('Response appears to be a direct array');
          try {
            const parsedArray = JSON.parse(cleanedResponse);
            if (Array.isArray(parsedArray)) {
              console.log('Successfully parsed array directly');
              return NextResponse.json({ questions: parsedArray });
            }
          } catch (parseError) {
            console.warn('Failed to parse direct array:', parseError.message);
            // Continue with other methods
          }
        }
        
        // Check if it's a JSON object with a questions property
        if (cleanedResponse.includes('"questions"')) {
          try {
            const parsedObj = JSON.parse(cleanedResponse);
            if (parsedObj && Array.isArray(parsedObj.questions)) {
              console.log('Successfully parsed object with questions property');
              return NextResponse.json({ questions: parsedObj.questions });
            }
          } catch (parseError) {
            console.warn('Failed to parse object with questions property:', parseError.message);
            // Continue with other methods
          }
        }
        
        // If we reach here, try more aggressive approaches
        console.log('Standard parsing failed, using regex extraction');
        
        // Extract all objects that look like questions
        const questionRegex = /"id"\s*:\s*(\d+)[^}]*"title"\s*:\s*"([^"]+)"[^}]*"content"\s*:\s*"([^"]+)"/g;
        const matches = [...cleanedResponse.matchAll(questionRegex)];
        
        if (matches.length > 0) {
          console.log(`Found ${matches.length} question-like structures with regex`);
          const extractedQuestions = matches.map((match, index) => ({
            id: parseInt(match[1]) || index + 1,
            title: match[2] || `Question ${index + 1}`,
            content: match[3] || "Please provide more details."
          }));
          
          return NextResponse.json({ questions: extractedQuestions });
        }
        
        // If we still can't extract questions, throw an error
        throw new Error('Could not extract questions from the response');
      } catch (error) {
        console.error('Failed to process JSON response:', error);
        throw error;
      }
    } catch (aiError) {
      console.error('AI SDK error:', aiError);
      throw aiError;
    }
  } catch (error) {
    console.error('Error in questions API:', error);
    
    // Return a helpful error response with fallback questions
    const fallbackQuestions = [
      {
        id: 1,
        title: "Define your audience",
        content: "Can you tell me more about who will be using this tool? Are they marketers, sales professionals, or executives?"
      },
      {
        id: 2,
        title: "Data collection frequency",
        content: "How frequently would you like to collect data? Daily, weekly, or on-demand?"
      },
      {
        id: 3,
        title: "Analysis focus",
        content: "What specific metrics and insights would be most valuable to you?"
      },
      {
        id: 4,
        title: "Output format",
        content: "How would you like the results presented? As a dashboard, PDF report, email summary, or in another format?"
      }
    ];
    
    // Extract useful error information
    let errorDetails = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = `${error.name}: ${error.message}`;
      if ('cause' in error && error.cause) {
        errorDetails += ` (Cause: ${String(error.cause)})`;
      }
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorDetails = JSON.stringify(error);
      } catch {
        errorDetails = String(error);
      }
    } else {
      errorDetails = String(error);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate questions',
        details: errorDetails,
        questions: fallbackQuestions
      },
      { status: 200 } // Still return 200 since we're providing fallback questions
    );
  }
} 