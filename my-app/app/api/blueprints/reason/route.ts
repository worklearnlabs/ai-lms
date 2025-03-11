import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createStandardServerClient } from '@/utils/supabase';
import { SkillLevelType, MessageRoleType } from '@/types/schema';
import { generateWithFallback } from '@/utils/ai-orchestrator';

// Only use Edge runtime in production to ensure development mode works properly
// In development, we need access to environment variables and admin clients
export const runtime = process.env.NODE_ENV === 'production' ? 'edge' : 'nodejs';

// Allow longer timeout for reasoning conversations
export const maxDuration = 60;

// Define the request schema
const ReasoningRequestSchema = z.object({
  // Required fields
  prompt: z.string().min(1, "Prompt is required"),
  
  // Optional fields
  sessionId: z.string().uuid().optional(),
  blueprint_id: z.string().uuid().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant'] as const),
      content: z.string(),
    })
  ).optional(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced'] as const).optional(),
  learning_objective: z.string().optional(),
  bypass_db: z.boolean().optional(), // New flag to completely bypass DB operations
});

// Reasoning Agent System Prompt
const getSystemPrompt = (skillLevel?: SkillLevelType, learningObjective?: string) => `
You are an AI educator and consultant assistant helping users define AI automation tasks.
Based on the user's initial request, ask clarifying questions considering:

1. Their skill level: ${skillLevel || '{Not provided yet. Assume beginner}'}
2. Their learning objective: ${learningObjective || '{Not provided yet. Assume general learning objective}'}
3. Specific constraints or requirements for the task

IMPORTANT: Your first response must always include both:
1. A suggested blueprint title based on the initial request
2. Clarifying questions to improve the implementation plan

Format your first response as JSON:
{
  "blueprint_title": "A clear, descriptive title for the overall AI system (30-60 chars)",
  "question": {
    "title": "Short title for this question",
    "content": "The full clarifying question here?"
  }
}

Example good blueprint titles:
- "Daily LinkedIn Posts Summarizer" (not "I want an AI that summarizes LinkedIn posts")
- "Customer Support Email Classifier" (not "Email classifier for support")
- "Meeting Transcription & Action Item Extractor" (not "Transcription system")

The blueprint title should be concise yet descriptive, focusing on what the AI will do.
Always tailor your questions to the user's apparent skill level.

After gathering all necessary information, your final response should contain:
{
  "searchQuery": "Detailed search terms for implementation research with clear instructions for formatting the response as JSON only"
}

The searchQuery should contain specific terms that will help generate a comprehensive implementation plan.
`;

export async function POST(req: Request) {
  try {
    // Parse request body
    const json = await req.json();
    
    // Validate input using Zod schema
    const result = ReasoningRequestSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input', 
          details: result.error.format() 
        },
        { status: 400 }
      );
    }
    
    const { prompt, sessionId, blueprint_id, messages, skill_level, learning_objective, bypass_db } = result.data;
    
    // For extreme debugging, bypass database completely in dev
    if (process.env.NODE_ENV === 'development' && (bypass_db || process.env.BYPASS_DB === 'true')) {
      console.log('DEVELOPMENT MODE: Bypassing database operations completely');
      const mockSessionId = generateFakeUUID();
      
      // Create a mock response with the user's prompt and a generic assistant response
      const mockMessages = [
        { role: 'system' as MessageRoleType, content: getSystemPrompt(skill_level, learning_objective) },
        { role: 'user' as MessageRoleType, content: prompt },
        { role: 'assistant' as MessageRoleType, content: 'This is a mock response. What else would you like to know about your blueprint?' }
      ];
      
      return NextResponse.json({
        sessionId: mockSessionId,
        message: mockMessages[2].content,
        isComplete: false,
        data: null,
        messages: mockMessages
      });
    }
    
    // Initialize Supabase client
    const supabase = createStandardServerClient();
    
    // If a sessionId is provided, verify it exists
    let session;
    if (sessionId) {
      const { data: existingSession, error } = await supabase
        .from('reasoning_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error || !existingSession) {
        return NextResponse.json(
          { error: 'Invalid session ID' },
          { status: 400 }
        );
      }
      
      session = existingSession;
    } else {
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required', details: 'You must be logged in to create a blueprint' },
          { status: 401 }
        );
      }
      
      const userId = user.id;
      
      // Use the provided blueprint_id or create a new blueprint
      let blueprintId = blueprint_id;
      
      // Create a new blueprint if one wasn't provided
      if (!blueprintId) {
        try {
          // Create a new blueprint record associated with the authenticated user
          const { data: newBlueprint, error: blueprintError } = await supabase
            .from('blueprints')
            .insert({
              title: 'Untitled Blueprint - Will be named by AI',
              is_verified: false,
              visibility: 'private',
              user_id: userId,
              content: [], // Empty array for content (required field)
              prompt: prompt
            })
            .select('id')
            .single();
            
          if (blueprintError || !newBlueprint) {
            console.error('Failed to create blueprint:', blueprintError);
            return NextResponse.json(
              { error: 'Failed to create blueprint', details: blueprintError?.message || 'Unknown error' },
              { status: 500 }
            );
          }
          
          blueprintId = newBlueprint.id;
          console.log('Created new blueprint:', blueprintId);
        } catch (error) {
          console.error('Error creating blueprint:', error);
          return NextResponse.json(
            { error: 'Error creating blueprint', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }
      }
      
      // Create a new reasoning session
      try {
        const { data: newSession, error: sessionError } = await supabase
          .from('reasoning_sessions')
          .insert({
            blueprint_id: blueprintId,
            status: 'active',
            context: { 
              original_prompt: prompt,
              user_id: userId
            },
            skill_level: skill_level || null,
            learning_objective: learning_objective || null,
          })
          .select()
          .single();
        
        if (sessionError || !newSession) {
          console.error('Failed to create reasoning session:', sessionError);
          return NextResponse.json(
            { 
              error: 'Failed to create reasoning session', 
              details: sessionError?.message || 'Unknown error',
              blueprint_id: blueprintId
            },
            { status: 500 }
          );
        }
        
        session = newSession;
        console.log('Created reasoning session:', session.id);
      } catch (error) {
        console.error('Error creating reasoning session:', error);
        return NextResponse.json(
          { 
            error: 'Error creating reasoning session', 
            details: error instanceof Error ? error.message : String(error),
            blueprint_id: blueprintId
          },
          { status: 500 }
        );
      }
      
      // Prepare conversation messages
      let conversationMessages = messages || [];
      
      // If this is a new session, add the initial prompt
      if (!sessionId) {
        // Add system message
        conversationMessages = [
          {
            role: 'system' as MessageRoleType,
            content: getSystemPrompt(skill_level, learning_objective),
          },
          {
            role: 'user' as MessageRoleType,
            content: prompt,
          }
        ];
        
        // Store these initial messages in the database
        try {
          for (const message of conversationMessages) {
            await supabase
              .from('reasoning_messages')
              .insert({
                session_id: session.id,
                role: message.role,
                content: message.content,
              });
          }
        } catch (error) {
          console.warn('Failed to store initial messages:', error);
          // Continue anyway - the messages are in memory
        }
      } else {
        // For an existing session, retrieve all previous messages
        const { data: existingMessages } = await supabase
          .from('reasoning_messages')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });
        
        // If we have existing messages, use those instead of what was passed
        if (existingMessages && existingMessages.length > 0) {
          conversationMessages = existingMessages.map(msg => ({
            role: msg.role as MessageRoleType,
            content: msg.content,
          }));
          
          // Add the new user message
          conversationMessages.push({
            role: 'user' as MessageRoleType,
            content: prompt,
          });
          
          // Store the new user message
          await supabase
            .from('reasoning_messages')
            .insert({
              session_id: session.id,
              role: 'user',
              content: prompt,
            });
        }
      }
      
      // Call the AI model for the response
      const response = await generateWithFallback(
        "", // Empty prompt since we're using the messages array
        {
          model: "claude-3-opus-20240229", // Prefer Claude for reasoning if available
          messages: conversationMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: 0.7,
        }
      );
      
      // Check if we have a response
      if (!response || !response.content) {
        return NextResponse.json(
          { error: 'Failed to generate response' },
          { status: 500 }
        );
      }
      
      // Store the AI response in the database
      await supabase
        .from('reasoning_messages')
        .insert({
          session_id: session.id,
          role: 'assistant',
          content: response.content,
        });
      
      // Check if the response contains a JSON with a blueprint title
      let extractedTitle = null;
      let data = null;
      try {
        // Try to find and parse JSON in the response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedJson = JSON.parse(jsonMatch[0]);
          
          // Extract title from blueprint_title field (only in initial response)
          if (parsedJson && parsedJson.blueprint_title) {
            extractedTitle = parsedJson.blueprint_title;
            console.log('Extracted blueprint_title from response:', extractedTitle);
            
            // Update the blueprint with the title immediately
            const { error: updateError } = await supabase
              .from('blueprints')
              .update({
                title: extractedTitle,
              })
              .eq('id', blueprintId);
              
            if (updateError) {
              console.error('Error updating blueprint with extracted title:', updateError);
            } else {
              console.log('Successfully updated blueprint title to:', extractedTitle);
            }
          }
          
          // Set data for isComplete check below
          data = parsedJson;
        }
      } catch (e) {
        console.warn('Could not parse JSON from response:', e);
      }
      
      // Check if the response contains a complete JSON with searchQuery (final response)
      const isComplete = response.content.includes('"searchQuery"');
      
      // If this is the final response with searchQuery, update the blueprint
      if (isComplete && data && data.searchQuery) {
        console.log('Updating blueprint with search query:', data.searchQuery);
        
        // Update the blueprint with the searchQuery
        const { error: updateError } = await supabase
          .from('blueprints')
          .update({
            search_query: data.searchQuery,
            // Don't update title again, we already did that above
          })
          .eq('id', blueprintId);
          
        if (updateError) {
          console.error('Error updating blueprint with search query:', updateError);
        } else {
          console.log('Successfully updated blueprint search query');
        }
      }
      
      // Get all messages for response
      const { data: allMessages } = await supabase
        .from('reasoning_messages')
        .select('role, content')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });
      
      // Return the result
      return NextResponse.json({
        sessionId: session.id,
        message: response.content,
        isComplete,
        data,
        messages: (allMessages || []).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        blueprint_id: blueprintId
      });
    }
  } catch (error) {
    console.error('Unhandled error in reasoning endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to generate a fake UUID for development
function generateFakeUUID(): string {
  return 'dev-session-' + Math.random().toString(36).substring(2, 9);
} 