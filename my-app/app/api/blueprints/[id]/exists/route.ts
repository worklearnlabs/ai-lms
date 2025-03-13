import { NextResponse } from 'next/server';
import { createStandardServerClient } from '@/utils/supabase';
import { createServiceRoleClient } from '@/utils/supabase-admin';

/**
 * GET /api/blueprints/[id]/exists
 * Checks if a blueprint exists in the database and returns its status
 * This is useful for debugging race conditions where a blueprint is created
 * but not immediately available for verification
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Blueprint ID is required' },
        { status: 400 }
      );
    }
    
    // Use both client types for redundancy
    const standardClient = createStandardServerClient();
    const serviceClient = createServiceRoleClient();
    
    // Check with standard client
    console.log(`Checking if blueprint ${id} exists`);
    const { data: standardData, error: standardError } = await standardClient
      .from('blueprints')
      .select('id, created_at, is_temporary')
      .eq('id', id)
      .single();
    
    // Also check with service role client for more reliability
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('blueprints')
      .select('id, created_at, is_temporary')
      .eq('id', id)
      .single();
    
    // Combine results for better diagnostic information
    return NextResponse.json({
      id,
      exists_standard: !standardError && !!standardData,
      exists_service: !serviceError && !!serviceData,
      exists: (!standardError && !!standardData) || (!serviceError && !!serviceData),
      standard_client: {
        error: standardError ? standardError.message : null,
        data: standardData
      },
      service_client: {
        error: serviceError ? serviceError.message : null,
        data: serviceData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking if blueprint exists:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check blueprint existence',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * HEAD /api/blueprints/[id]/exists
 * Simple existence check that returns appropriate status code
 * Returns 200 if blueprint exists, 404 if not found
 */
export async function HEAD(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return new Response(null, { status: 400 });
    }
    
    // Use service role client for most reliable check
    const serviceClient = createServiceRoleClient();
    
    // Check blueprint existence with count query for efficiency
    const { count, error } = await serviceClient
      .from('blueprints')
      .select('id', { count: 'exact', head: true })
      .eq('id', id);
    
    console.log(`Count query result for ID ${id}: ${count}`);
    
    if (error || !count || count === 0) {
      console.log(`Blueprint with ID ${id} does not exist (HEAD request)`);
      return new Response(null, { status: 404 });
    }
    
    console.log(`Blueprint with ID ${id} exists (HEAD request)`);
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Error in HEAD request to check blueprint existence:', error);
    return new Response(null, { status: 500 });
  }
} 