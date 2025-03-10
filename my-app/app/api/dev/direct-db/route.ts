// FOR DEVELOPMENT ONLY - NEVER USE IN PRODUCTION
// Direct database inspection endpoint

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Development only' }, { status: 403 });
  }
  
  try {
    // Create a direct Supabase client using service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables'
      }, { status: 500 });
    }
    
    // Create a direct client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Step 1: Try to fetch a blueprint
    const { data: blueprint, error: blueprintError } = await supabase
      .from('blueprints')
      .select('*')
      .limit(1)
      .single();
      
    if (blueprintError) {
      return NextResponse.json({
        error: 'Failed to fetch blueprint',
        details: blueprintError
      }, { status: 500 });
    }
    
    // Use the user_id from the existing blueprint
    const userId = blueprint.user_id;
    console.log('Using existing user_id from blueprint:', userId);
      
    // Step 2: Try to create a test blueprint
    const { data: testBlueprint, error: testError } = await supabase
      .from('blueprints')
      .insert({
        title: 'Test Blueprint ' + new Date().toISOString(),
        is_verified: false,
        visibility: 'private',
        user_id: userId, // Use actual UUID from existing blueprint
        prompt: 'Test prompt',
        content: [] // Empty array for content
      })
      .select()
      .single();
      
    if (testError) {
      return NextResponse.json({
        error: 'Failed to create test blueprint',
        details: testError,
        existingBlueprint: blueprint
      }, { status: 500 });
    }
    
    // Step 3: Try to create a reasoning session
    const { data: session, error: sessionError } = await supabase
      .from('reasoning_sessions')
      .insert({
        blueprint_id: testBlueprint.id,
        status: 'active',
        context: { test: true }
      })
      .select()
      .single();
      
    if (sessionError) {
      // Clean up the test blueprint
      await supabase
        .from('blueprints')
        .delete()
        .eq('id', testBlueprint.id);
        
      return NextResponse.json({
        error: 'Failed to create reasoning session',
        details: sessionError,
        testBlueprint
      }, { status: 500 });
    }
    
    // Clean up both test resources
    await supabase
      .from('reasoning_sessions')
      .delete()
      .eq('id', session.id);
      
    await supabase
      .from('blueprints')
      .delete()
      .eq('id', testBlueprint.id);
    
    // Return success with sample data
    return NextResponse.json({
      success: true,
      message: 'All database operations successful',
      blueprintSample: {
        id: blueprint.id,
        title: blueprint.title
      },
      testResults: {
        createdBlueprint: testBlueprint.id,
        createdSession: session.id
      }
    });
  } catch (error) {
    console.error('DB test error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 