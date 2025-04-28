import { NextRequest, NextResponse } from 'next/server';
import { createStandardServerClient } from '@/utils/supabase';
import { withRouteAuth } from '@/utils/route-handlers';

/**
 * API endpoint to handle conversion of numeric IDs to UUIDs
 * Returns the UUID if found, otherwise returns a 404
 */
export async function GET(
  req: NextRequest, 
  context: { params: { id: string } }
) {
  try {
    // Properly await the params object
    const params = await context.params;
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`GET /api/blueprints/by-numeric-id/${id} - Looking up blueprint UUID`);
    
    // Validate that it's a numeric ID
    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: 'ID must be numeric' },
        { status: 400 }
      );
    }
    
    // Get the Supabase client
    const auth = await withRouteAuth(req);
    const supabase = auth.isAuthenticated && auth.supabase 
      ? auth.supabase
      : createStandardServerClient();
    
    // Look up by alternate_id (numeric ID) or try pattern matching
    // This assumes the database has a column for alternate IDs
    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .select('id')
      .eq('alternate_id', id)
      .single();
    
    if (error) {
      console.log(`No direct mapping found for numeric ID ${id}`);
      
      // Fallback: Try a more generic search (this is less reliable)
      try {
        // Try to find by legacy_id (another column that might have been added)
        const { data: legacyResult } = await supabase
          .from('blueprints')
          .select('id')
          .eq('legacy_id', id)
          .single();
        
        if (legacyResult?.id) {
          console.log(`Found UUID ${legacyResult.id} via legacy_id mapping`);
          return NextResponse.json({
            uuid: legacyResult.id,
            source: 'legacy_id'
          });
        }
      } catch (_legacyError) {
        console.log(`No legacy mapping found for numeric ID ${id}`);
      }
      
      // Return not found if all lookups fail
      return NextResponse.json(
        { error: 'No blueprint found with this numeric ID' },
        { status: 404 }
      );
    }
    
    console.log(`Found UUID ${blueprint.id} for numeric ID ${id}`);
    return NextResponse.json({
      uuid: blueprint.id,
      source: 'alternate_id'
    });
  } catch (error) {
    console.error(`Error in numeric ID lookup:`, error);
    return NextResponse.json(
      { error: 'Server error processing numeric ID' },
      { status: 500 }
    );
  }
} 