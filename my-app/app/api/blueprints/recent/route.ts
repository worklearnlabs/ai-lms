import { NextResponse } from 'next/server';
import { createStandardServerClient } from '@/utils/supabase';

/**
 * GET /api/blueprints/recent
 * Retrieve recently created blueprints with an optional limit (default 5)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);
    
    // Validate limit (ensure reasonable bounds)
    const validLimit = Math.min(Math.max(1, limit), 20);
    
    console.log(`Fetching ${validLimit} recent blueprints`);
    
    // Get the blueprints from Supabase
    const supabase = createStandardServerClient();
    const { data, error } = await supabase
      .from('blueprints')
      .select('id, title, prompt, is_temporary, created_at')
      .order('created_at', { ascending: false })
      .limit(validLimit);
    
    if (error) {
      console.error('Error fetching recent blueprints:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent blueprints' },
        { status: 500 }
      );
    }
    
    console.log(`Retrieved ${data?.length || 0} recent blueprints`);
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in recent blueprints endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
