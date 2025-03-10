// FOR DEVELOPMENT ONLY - NEVER USE IN PRODUCTION
// Database schema inspection endpoint

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Development only' }, { status: 403 });
  }
  
  // Get table from query params
  const url = new URL(req.url);
  const table = url.searchParams.get('table') || 'blueprints';
  
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
    
    // Run raw SQL to get table schema
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: table });
    
    if (columnsError) {
      // If RPC doesn't exist, try a raw query
      const { data: rawColumns, error: rawError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', table);
        
      if (rawError) {
        // Try with raw SQL as a last resort
        const { data: sqlColumns, error: sqlError } = await supabase
          .rpc('exec', { 
            query: `SELECT column_name, data_type, is_nullable, column_default 
                  FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = '${table}'`
          });
          
        if (sqlError) {
          return NextResponse.json({ 
            error: 'Failed to get schema information', 
            details: sqlError
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          table,
          columns: sqlColumns
        });
      }
      
      return NextResponse.json({ 
        table,
        columns: rawColumns
      });
    }
    
    return NextResponse.json({ 
      table,
      columns
    });
  } catch (error) {
    console.error('Schema inspection error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 