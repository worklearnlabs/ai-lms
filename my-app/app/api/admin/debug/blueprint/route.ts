import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase-admin';

/**
 * Admin debug endpoint to fetch raw blueprint data
 * This endpoint should only be accessible in development mode
 */
export async function GET(req: Request) {
  // Only allow this endpoint in development mode for security
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Get blueprint ID from query param
    const url = new URL(req.url);
    const blueprintId = url.searchParams.get('id');

    if (!blueprintId) {
      return NextResponse.json(
        { error: 'Blueprint ID is required' },
        { status: 400 }
      );
    }

    // Use service role client to access the database directly
    const supabase = createServiceRoleClient();

    // Fetch the blueprint directly from the database
    const { data, error } = await supabase
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .single();

    if (error) {
      console.error('Admin debug: Error fetching blueprint:', error);
      return NextResponse.json(
        { error: 'Failed to fetch blueprint', details: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 }
      );
    }

    // Cast the data to any type for debugging purposes
    // This is intentional for the debug endpoint to access any field that might exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blueprint = data as any;

    // Add special debug section to highlight search_query field
    const debugInfo = {
      raw_db_data: blueprint,
      search_query_analysis: {
        is_defined: blueprint.search_query !== undefined && blueprint.search_query !== null,
        data_type: typeof blueprint.search_query,
        value: blueprint.search_query,
        string_value: String(blueprint.search_query || ''),
        length: blueprint.search_query ? blueprint.search_query.length : 0,
        is_empty_string: blueprint.search_query === '',
      },
      prompt_analysis: {
        is_defined: blueprint.prompt !== undefined && blueprint.prompt !== null,
        data_type: typeof blueprint.prompt,
        excerpt: blueprint.prompt ? blueprint.prompt.substring(0, 100) + '...' : 'N/A',
        length: blueprint.prompt ? blueprint.prompt.length : 0,
      },
      metadata: {
        is_temporary: blueprint.is_temporary,
        created_at: blueprint.created_at,
        updated_at: blueprint.updated_at,
        fetch_timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Unhandled error in admin debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 