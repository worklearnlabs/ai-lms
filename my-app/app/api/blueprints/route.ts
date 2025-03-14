import { NextResponse } from 'next/server';
import { createServiceRoleClient } from "@/utils/supabase-admin";
import { ensureUserInDatabase } from '@/utils/user-sync';
import { z } from "zod";
import { createRouteHandler } from '@/utils/route-handlers';
import { NextRequest } from 'next/server';

// Define error response type
type ErrorResponse = { 
  error: string; 
  details?: unknown;
  original_error?: string;
};

// Type for API responses - using Record<string, unknown> for flexibility
// This is not ideal for type safety but helps us fix the linter errors
type ApiResponse = Record<string, unknown> | ErrorResponse;

// Define the blueprint creation schema
const BlueprintCreateSchema = z.object({
  title: z.string().default("Untitled Blueprint"),
  prompt: z.string().optional(),
  visibility: z.enum(["public", "private"]).default("private"),
  is_temporary: z.boolean().default(false),
  content: z.unknown().optional(),
  search_query: z.string().optional(),
  details: z.string().optional()
});

// Handler for GET /api/blueprints
export async function GET(request: Request) {
  // Get all blueprints that the user has access to
  try {
    const serviceClient = createServiceRoleClient();
    
    // In development mode, add a special query param to fetch all blueprints
    const url = new URL(request.url);
    const fetchAll = url.searchParams.get('fetchAll') === 'true';
    
    if (process.env.NODE_ENV === 'development' && fetchAll) {
      console.log("DEBUG: Fetching ALL blueprints from database regardless of user");
      
      const { data: allBlueprints, error: allError } = await serviceClient
        .from('blueprints')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (allError) {
        console.error("Error fetching all blueprints:", allError);
        return NextResponse.json({ error: allError.message }, { status: 500 });
      }
      
      console.log(`DEBUG: Found ${allBlueprints?.length || 0} total blueprints in database`);
      if (allBlueprints && allBlueprints.length > 0) {
        console.log("Blueprint IDs in database:", allBlueprints.map(b => b.id).join(", "));
        console.log("Blueprint user_ids in database:", allBlueprints.map(b => b.user_id).join(", "));
      }
      
      return NextResponse.json(allBlueprints || []);
    }
    
    // Get auth session to check if user is authenticated
    const authResponse = await serviceClient.auth.getSession();
    
    // Check if we have an authenticated user
    if (!authResponse.data.session || !authResponse.data.session.user) {
      console.log("No authenticated user - returning only public blueprints");
      // For non-authenticated users, return only public blueprints
      const { data, error } = await serviceClient
        .from('blueprints')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching public blueprints:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      
      return NextResponse.json(data);
    }
    
    // Get auth user ID and ensure user exists in database
    const authUserId = authResponse.data.session.user.id;
    console.log("Blueprint API: Authenticated user ID from session:", authUserId);
    
    // First fetch ALL blueprints in development mode to help debug
    if (process.env.NODE_ENV === 'development') {
      const { data: allBlueprints, error: allError } = await serviceClient
        .from('blueprints')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (allError) {
        console.error("Error fetching all blueprints for debugging:", allError);
      } else {
        console.log(`DEBUG: Found ${allBlueprints?.length || 0} total blueprints in database`);
        
        if (allBlueprints && allBlueprints.length > 0) {
          console.log("Blueprint user_ids in database:", allBlueprints.map(b => b.user_id).join(", "));
        }
      }
    }
    
    // Try to get user details to ensure correct mapping
    const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(authUserId);
    
    if (authError || !authData?.user) {
      console.error('Error fetching auth user details:', authError || 'No user found');
      // Return public blueprints as fallback
      const { data: publicOnlyBlueprints, error: publicError } = await serviceClient
        .from('blueprints')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
        
      if (publicError) {
        console.error("Error fetching public blueprints as fallback:", publicError);
        return NextResponse.json({ error: "Failed to fetch blueprints" }, { status: 500 });
      }
      
      console.log("Returning public blueprints only due to auth error");
      return NextResponse.json(publicOnlyBlueprints || []);
    }
    
    const userEmail = authData.user.email;
    
    // Try to find user by email if available
    let applicationUserId = authUserId; // Default to auth ID
    
    if (userEmail) {
      console.log("Looking up user by email:", userEmail);
      const { data: userByEmail, error: emailLookupError } = await serviceClient
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();
      
      if (!emailLookupError && userByEmail) {
        console.log("Found user by email lookup:", userByEmail.id);
        applicationUserId = userByEmail.id;
      } else if (emailLookupError && emailLookupError.code !== 'PGRST116') {
        console.error("Error looking up user by email:", emailLookupError);
      }
    }
    
    // Use our utility to ensure user exists and get the correct user ID
    const { success, userId, error } = await ensureUserInDatabase(authUserId);
    
    if (success && userId) {
      console.log("User mapping successful, application userId:", userId);
      applicationUserId = userId; // Override with value from ensureUserInDatabase
    } else {
      console.error("Failed to ensure user exists:", error);
      // Continue with the best ID we have rather than failing
    }
    
    console.log(`Using final user ID for blueprints query: ${applicationUserId}`);
    
    // Fetch user's own blueprints with the application user ID
    const { data: userBlueprints, error: userError } = await serviceClient
      .from('blueprints')
      .select('*')
      .eq('user_id', applicationUserId)
      .order('created_at', { ascending: false });

    if (userError) {
      console.error("Error fetching user's own blueprints:", userError);
    } else {
      console.log(`Found ${userBlueprints?.length || 0} blueprints owned by user ID: ${applicationUserId}`);
    }
    
    // Fetch public blueprints
    const { data: publicBlueprints, error: publicError } = await serviceClient
      .from('blueprints')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (publicError) {
      console.error("Error fetching public blueprints:", publicError);
    } else {
      console.log(`Found ${publicBlueprints?.length || 0} public blueprints`);
    }
    
    // Combine the results, removing duplicates
    const combinedBlueprints = userBlueprints || [];
    
    // Add public blueprints that aren't already in user's blueprints
    if (publicBlueprints) {
      for (const publicBlueprint of publicBlueprints) {
        if (!combinedBlueprints.some(bp => bp.id === publicBlueprint.id)) {
          combinedBlueprints.push(publicBlueprint);
        }
      }
    }
    
    console.log(`Returning ${combinedBlueprints.length} total blueprints`);
    if (combinedBlueprints.length > 0) {
      console.log("Blueprint IDs:", combinedBlueprints.map(b => b.id).join(", "));
    } else {
      console.log("No blueprints found to return");
    }

    return NextResponse.json(combinedBlueprints);
  } catch (error) {
    console.error("Error in blueprints GET route:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprints" },
      { status: 500 }
    );
  }
}

// Handler for POST /api/blueprints
export const POST = createRouteHandler<ApiResponse>(
  ['POST'],
  async (req: NextRequest, { user }) => {
    try {
      // Parse request body
      const json = await req.json();

      // Validate input
      const result = BlueprintCreateSchema.safeParse(json);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: result.error.format() },
          { status: 400 }
        );
      }

      const { title, prompt, visibility, is_temporary, search_query, details } = result.data;
      
      // Don't allow setting search_query during initial blueprint creation
      if (search_query) {
        console.warn('Ignoring search_query provided during blueprint creation - this should only be set during finalization');
      }

      // For all operations, we'll use the service client for consistent access
      const serviceClient = createServiceRoleClient();
      
      // Require authentication for all blueprint creation (even temporary blueprints)
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required to create a blueprint' },
          { status: 401 }
        );
      }
      
      // Log authentication status for debugging
      console.log('Blueprint creation auth status:', {
        authenticated: !!user,
        userEmail: user?.email || 'Not authenticated',
        is_temporary: is_temporary
      });

      // We need a valid user_id due to foreign key constraints
      let userIdToUse = null;

      if (user?.email) {
        // If user is authenticated, look up their ID in the users table by email
        console.log('User is authenticated, looking up in users table by email:', user.email);
        
        const { data: dbUser } = await serviceClient
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();
          
        if (dbUser) {
          userIdToUse = dbUser.id;
          console.log('Found user in users table by email:', user.email, 'Using ID:', userIdToUse);
        } else {
          console.log('WARNING: Authenticated user email not found in users table:', user.email);
          
          // User must exist in the users table to create blueprints
          return NextResponse.json(
            { error: 'User not found in database', details: 'Your user account could not be found in the application database' },
            { status: 400 }
          );
        }
      } else {
        // This shouldn't happen since we already checked for user authentication above,
        // but adding as a safeguard
        return NextResponse.json(
          { error: 'Authentication required to create a blueprint' },
          { status: 401 }
        );
      }
      
      // At this point, we should have a valid userIdToUse or have returned an error
      
      // Create the blueprint data object with the valid user ID
      const blueprintData = {
        title,
        prompt,
        details: details || "", // Use details from request if provided
        is_verified: false,
        visibility: visibility || 'private',
        content: [], // Empty array for content
        is_temporary: is_temporary,
        search_query: '', // IMPORTANT: Explicitly set search_query to empty string, not null or undefined
        user_id: userIdToUse // Use the user ID we determined above
      };

      console.log('Creating new blueprint:', {
        ...blueprintData,
        user_id: userIdToUse ? `${String(userIdToUse).substring(0, 8)}...` : 'NULL (unknown)'
      });
      
      try {
        // Use service client for all blueprint creation for consistency
        const { data: blueprint, error } = await serviceClient
          .from('blueprints')
          .insert(blueprintData)
          .select('*')
          .single();

        if (error) {
          console.error('Error creating blueprint:', error);
          
          // Check if it's a foreign key constraint error
          if (error.message && error.message.includes('violates foreign key constraint')) {
            return NextResponse.json(
              { 
                error: 'Failed to create blueprint', 
                details: 'Database is configured to require a valid user_id',
                original_error: error.message
              },
              { status: 500 }
            );
          }
          
          return NextResponse.json(
            { error: 'Failed to create blueprint', details: error.message },
            { status: 500 }
          );
        }

        console.log('Blueprint created successfully:', blueprint.id);
        
        // Return the created blueprint
        return NextResponse.json(blueprint);
      } catch (err) {
        console.error('Exception creating blueprint:', err);
        return NextResponse.json(
          { 
            error: 'Exception creating blueprint', 
            details: err instanceof Error ? err.message : 'Unknown error' 
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error in blueprints POST route:", error);
      return NextResponse.json(
        { error: "Failed to create blueprint", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  }
); 