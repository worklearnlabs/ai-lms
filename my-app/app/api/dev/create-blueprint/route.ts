// FOR DEVELOPMENT ONLY - NEVER USE IN PRODUCTION
// Direct blueprint creation endpoint

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Development only endpoint' }, { status: 403 });
  }
  
  try {
    // Parse request body
    const body = await req.text();
    console.log('Create blueprint request:', body);
    
    let json;
    try {
      json = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request' }, { status: 400 });
    }
    
    const { title, searchQuery, sessionId, complexity, estimatedTime, prompt, skillLevel, learningObjective } = json;
    
    if (!title || !searchQuery) {
      return NextResponse.json({ 
        error: 'Missing required fields', 
        required: ['title', 'searchQuery'] 
      }, { status: 400 });
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
    
    // Create the blueprint
    const { data: newBlueprint, error: createError } = await supabase
      .from('blueprints')
      .insert({
        title,
        search_query: searchQuery,
        is_verified: false,
        visibility: 'private',
        user_id: userId,
        content: [],
        prompt: prompt || title,
        skill_level: skillLevel || null,
        learning_objective: learningObjective || null,
        complexity: complexity === 'beginner' ? 'low' : 
                   complexity === 'intermediate' ? 'medium' : 
                   complexity === 'advanced' ? 'high' : null,
        estimated_time: estimatedTime || null
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating blueprint:', createError);
      return NextResponse.json({
        error: 'Failed to create blueprint',
        details: createError
      }, { status: 500 });
    }
    
    // If we have a session ID, update the session's blueprint_id
    if (sessionId) {
      const { error: updateError } = await supabase
        .from('reasoning_sessions')
        .update({ blueprint_id: newBlueprint.id })
        .eq('id', sessionId);
        
      if (updateError) {
        console.warn('Warning: Failed to update session with blueprint ID:', updateError);
        // Continue anyway since the blueprint was created
      }
    }
    
    return NextResponse.json({
      id: newBlueprint.id,
      title: newBlueprint.title,
      message: 'Blueprint created successfully'
    });
    
  } catch (error) {
    console.error('Unexpected error in create-blueprint endpoint:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 