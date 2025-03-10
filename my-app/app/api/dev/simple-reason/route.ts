// FOR DEVELOPMENT ONLY - NEVER USE IN PRODUCTION
// Simplified reasoning API that bypasses complex logic

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define a simple mock response for testing
const MOCK_RESPONSE = {
  content: `{
    "title": "Customer Support Ticket Analysis System",
    "searchQuery": "AI system for analyzing customer support tickets and suggesting solutions",
    "complexity": "intermediate",
    "estimatedTime": "3-4 weeks",
    "prerequisites": ["Node.js", "Basic ML knowledge", "Experience with NLP"]
  }`
};

export async function POST(req: Request) {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Development only endpoint' }, { status: 403 });
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
      return NextResponse.json({ error: 'Invalid JSON in request' }, { status: 400 });
    }
    
    const { prompt, sessionId } = json;
    
    if (!prompt && !sessionId) {
      return NextResponse.json({ error: 'Missing prompt or sessionId' }, { status: 400 });
    }
    
    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Check if using existing session or creating new one
    let currentSessionId = sessionId;
    let blueprintId = null;
    
    if (sessionId) {
      // Get existing session
      const { data: session, error: sessionError } = await supabase
        .from('reasoning_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      blueprintId = session.blueprint_id;
      
      // Add user message to session
      await supabase
        .from('reasoning_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: prompt
        });
    } else {
      // Need to create new session
      
      // First, fetch a valid user ID
      const { data: blueprints, error: blueprintError } = await supabase
        .from('blueprints')
        .select('user_id')
        .limit(1);
        
      if (blueprintError || !blueprints || blueprints.length === 0) {
        console.error('Error fetching user ID:', blueprintError);
        return NextResponse.json({ error: 'Failed to get valid user ID' }, { status: 500 });
      }
      
      const userId = blueprints[0].user_id;
      console.log('Using user_id:', userId);
      
      // Create temporary blueprint
      const { data: tempBlueprint, error: tempBlueprintError } = await supabase
        .from('blueprints')
        .insert({
          title: 'Temp Blueprint: ' + prompt.substring(0, 30),
          is_verified: false,
          visibility: 'private',
          user_id: userId,
          content: [],
          prompt: prompt
        })
        .select()
        .single();
        
      if (tempBlueprintError) {
        console.error('Error creating temp blueprint:', tempBlueprintError);
        return NextResponse.json({ error: 'Failed to create temp blueprint' }, { status: 500 });
      }
      
      blueprintId = tempBlueprint.id;
      console.log('Created temp blueprint:', blueprintId);
      
      // Create reasoning session
      const { data: newSession, error: newSessionError } = await supabase
        .from('reasoning_sessions')
        .insert({
          blueprint_id: blueprintId,
          status: 'active',
          context: { original_prompt: prompt }
        })
        .select()
        .single();
        
      if (newSessionError) {
        console.error('Error creating session:', newSessionError);
        
        // Clean up blueprint
        await supabase
          .from('blueprints')
          .delete()
          .eq('id', blueprintId);
          
        return NextResponse.json({ error: 'Failed to create reasoning session' }, { status: 500 });
      }
      
      currentSessionId = newSession.id;
      console.log('Created session:', currentSessionId);
      
      // Add initial messages
      await supabase
        .from('reasoning_messages')
        .insert([
          {
            session_id: currentSessionId,
            role: 'system',
            content: 'You are an AI assistant helping create blueprint specifications.'
          },
          {
            session_id: currentSessionId,
            role: 'user',
            content: prompt
          }
        ]);
    }
    
    // Add mock assistant response
    const isComplete = !sessionId; // First interaction is complete in our simplified version
    
    await supabase
      .from('reasoning_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: MOCK_RESPONSE.content
      });
      
    // Get all messages for the session
    const { data: messages, error: messagesError } = await supabase
      .from('reasoning_messages')
      .select('role, content, created_at')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true });
      
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
    
    // Parse the JSON data if complete
    let parsedData = null;
    if (isComplete) {
      try {
        parsedData = JSON.parse(MOCK_RESPONSE.content);
      } catch (err) {
        console.error('Error parsing JSON data:', err);
      }
    }
    
    return NextResponse.json({
      sessionId: currentSessionId,
      blueprintId,
      message: MOCK_RESPONSE.content,
      isComplete,
      data: parsedData,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    });
  } catch (error) {
    console.error('Unexpected error in simple-reason endpoint:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 