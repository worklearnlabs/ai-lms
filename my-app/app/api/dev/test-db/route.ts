// FOR DEVELOPMENT ONLY - NEVER USE IN PRODUCTION
// Simple database test endpoint to diagnose issues

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Development only' }, { status: 403 });
  }
  
  // Try to get URL query params
  const url = new URL(req.url);
  const table = url.searchParams.get('table') || 'blueprints';
  
  try {
    // Create a direct Supabase client using service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables', 
        variables: {
          url: !!supabaseUrl,
          key: !!supabaseKey
        }
      }, { status: 500 });
    }
    
    console.log('Creating direct client with URL:', supabaseUrl);
    
    // Create a direct client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // Run a simple query
    console.log(`Testing query on ${table} table...`);
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: error 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      table,
      count,
      sample: data,
      meta: {
        supabaseUrl
      }
    });
  } catch (error) {
    console.error('Test DB error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 