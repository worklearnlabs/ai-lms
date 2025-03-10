// IMPORTANT: This is a development-only endpoint
// It should never be used in production

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createDevAdminClient } from '../admin-client';
import { generateWithFallback } from '@/utils/ai-orchestrator';

// Make sure this only runs in development
export function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 });
  }
  
  return NextResponse.json({ message: 'Development reasoning endpoint ready' });
}

// Define the request schema
const DevReasoningSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  sessionId: z.string().uuid().optional(),
  blueprint_id: z.string().uuid().optional()
});

export async function POST(req: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 });
  }
  
  try {
    // Parse request body
    const body = await req.text();
    console.log('Request body:', body);
    
    let json;
    try {
      json = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', body },
        { status: 400 }
      );
    }
    
    // Validate input
    const result = DevReasoningSchema.safeParse(json);
    if (!result.success) {
      console.error('Validation error:', result.error.format());
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format(), receivedData: json },
        { status: 400 }
      );
    }
    
    const { prompt, sessionId, blueprint_id } = result.data;
    
    // Get the admin client that bypasses RLS
    const supabase = createDevAdminClient();
    
    // Log the connection details (without sensitive info)
    console.log('Supabase client initialized with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Check database connectivity
    try {
      const { data: dbCheck, error: dbError } = await supabase
        .from('blueprints')
        .select('id')
        .limit(1);
      if (dbError) {
        console.error('Database connectivity test failed:', dbError);
        return NextResponse.json(
          { error: 'Database connectivity test failed', details: dbError },
          { status: 500 }
        );
      }
      console.log('Database connectivity test passed:', dbCheck);
    } catch (dbTestError) {
      console.error('Database connectivity exception:', dbTestError);
      return NextResponse.json(
        { error: 'Database connectivity exception', details: String(dbTestError) },
        { status: 500 }
      );
    }
    
    // Create a test blueprint if needed
    let sessionBlueprintId = blueprint_id;
    let tempBlueprintCreated = false;
    
    if (!sessionBlueprintId) {
      console.log('Creating a test blueprint...');
      
      // Create a simplified blueprint with minimal fields
      try {
        const { data: tempBlueprint, error: blueprintError } = await supabase
          .from('blueprints')
          .insert({
            title: 'Test Blueprint - ' + prompt.substring(0, 30),
            is_verified: false,
            visibility: 'private',
            user_id: 'any-user', // Use a fixed test user ID
            // Adding only required fields based on schema
            prompt: prompt
          })
          .select('id')
          .single();
          
        if (blueprintError) {
          console.error('Failed to create temp blueprint:', blueprintError);
          return NextResponse.json(
            { 
              error: 'Failed to create temporary blueprint', 
              details: blueprintError,
              attemptedData: {
                title: 'Test Blueprint - ' + prompt.substring(0, 30),
                is_verified: false,
                visibility: 'private',
                user_id: 'any-user',
                prompt: prompt
              }
            },
            { status: 500 }
          );
        }
        
        if (!tempBlueprint || !tempBlueprint.id) {
          console.error('Blueprint created but no ID returned');
          return NextResponse.json(
            { error: 'Blueprint created but no ID returned', result: tempBlueprint },
            { status: 500 }
          );
        }
        
        sessionBlueprintId = tempBlueprint.id;
        tempBlueprintCreated = true;
        console.log('Created test blueprint with ID:', sessionBlueprintId);
      } catch (blueprintCreationError) {
        console.error('Exception creating blueprint:', blueprintCreationError);
        return NextResponse.json(
          { 
            error: 'Exception creating blueprint', 
            details: String(blueprintCreationError) 
          },
          { status: 500 }
        );
      }
    }
    
    let currentSessionId = sessionId;
    
    // Create a new session if needed
    if (!currentSessionId) {
      console.log('Creating a test reasoning session...');
      
      const { data: newSession, error: sessionError } = await supabase
        .from('reasoning_sessions')
        .insert({
          blueprint_id: sessionBlueprintId,
          status: 'active',
          context: { original_prompt: prompt },
        })
        .select()
        .single();
      
      if (sessionError || !newSession) {
        console.error('Failed to create reasoning session:', sessionError);
        
        // Clean up temporary blueprint if it was created
        if (tempBlueprintCreated) {
          await supabase
            .from('blueprints')
            .delete()
            .eq('id', sessionBlueprintId);
          console.log('Cleaned up temporary blueprint');
        }
        
        return NextResponse.json(
          { error: 'Failed to create reasoning session', details: sessionError },
          { status: 500 }
        );
      }
      
      currentSessionId = newSession.id;
      console.log('Created test session with ID:', currentSessionId);
      
      // Save the initial system and user messages
      await supabase
        .from('reasoning_messages')
        .insert([
          {
            session_id: currentSessionId,
            role: 'system',
            content: `You are a blueprint creation assistant. Based on the user's prompt, provide a structured response in JSON format with title and searchQuery fields.`
          },
          {
            session_id: currentSessionId,
            role: 'user',
            content: prompt
          }
        ]);
    } else {
      // Add the new user message
      await supabase
        .from('reasoning_messages')
        .insert({
          session_id: currentSessionId,
          role: 'user',
          content: prompt
        });
    }
    
    // Get all messages for this session
    const { data: messages } = await supabase
      .from('reasoning_messages')
      .select('*')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true });
    
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found for session' },
        { status: 500 }
      );
    }
    
    // Format messages for AI
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Call the AI model
    const aiResponse = await generateWithFallback(
      "",
      {
        model: "gpt-3.5-turbo", // For testing
        messages: formattedMessages,
        temperature: 0.7,
      }
    );
    
    if (!aiResponse || !aiResponse.content) {
      return NextResponse.json(
        { error: 'Failed to generate AI response' },
        { status: 500 }
      );
    }
    
    // Save the assistant response
    await supabase
      .from('reasoning_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: aiResponse.content
      });
    
    // Check if the response is a complete JSON
    const isComplete = aiResponse.content.includes('"title"') && 
                       aiResponse.content.includes('"searchQuery"');
    
    // Try to extract JSON if complete
    let parsedData = null;
    if (isComplete) {
      try {
        // Find JSON in the response
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Could not parse JSON from response:', e);
      }
    }
    
    // Return the response
    return NextResponse.json({
      sessionId: currentSessionId,
      blueprintId: sessionBlueprintId,
      message: aiResponse.content,
      isComplete,
      data: parsedData,
      messages: formattedMessages.concat([{
        role: 'assistant',
        content: aiResponse.content
      }])
    });
  } catch (error) {
    console.error('Error in dev reasoning endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 