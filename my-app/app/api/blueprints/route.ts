import { NextResponse } from 'next/server';
import { createServiceRoleClient } from "@/utils/supabase-admin";
import { ensureUserInDatabase } from '@/utils/user-sync';
import { createStandardServerClient } from "@/utils/supabase";
import { z } from "zod";

// Define the blueprint creation schema
const BlueprintCreateSchema = z.object({
  title: z.string().default("Untitled Blueprint"),
  prompt: z.string().optional(),
  visibility: z.enum(["public", "private"]).default("private"),
  is_temporary: z.boolean().default(false),
  content: z.any().optional(),
  search_query: z.string().optional()
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
export async function POST(req: Request) {
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

    const { title, prompt, visibility, is_temporary, search_query } = result.data;
    
    // Don't allow setting search_query during initial blueprint creation
    if (search_query) {
      console.warn('Ignoring search_query provided during blueprint creation - this should only be set during finalization');
    }

    // Initialize Supabase client
    const supabase = createStandardServerClient();

    // Get the current authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    // Check if this is a temporary blueprint
    if (is_temporary === true) {
      console.log('Creating temporary blueprint - authentication not required');
      
      // For temporary blueprints, we can create without a user
      // Use service role client to bypass auth requirements
      const serviceClient = createServiceRoleClient();
      
      // Create the blueprint with a system user ID or no user ID
      const blueprintData = {
        title,
        prompt,
        is_verified: false,
        visibility: visibility || 'private',
        content: [], // Empty array for content
        is_temporary: true, // Force is_temporary to true for safety
        search_query: '', // IMPORTANT: Explicitly set search_query to empty string, not null or undefined
        // Note: No user_id for temporary blueprints if not authenticated
        ...(user ? { user_id: user.id } : {})
      };

      console.log('Creating new temporary blueprint:', {
        ...blueprintData,
        user_id: user ? 'REDACTED' : 'NONE (anonymous)' 
      });
      
      // Use service client for temporary blueprints to bypass auth requirements
      const { data: blueprint, error } = await serviceClient
        .from('blueprints')
        .insert(blueprintData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating temporary blueprint:', error);
        return NextResponse.json(
          { error: 'Failed to create temporary blueprint', details: error.message },
          { status: 500 }
        );
      }

      console.log('Temporary blueprint created successfully:', blueprint.id);
      
      // Ensure the blueprint is committed - try to fetch it to confirm
      let verificationAttempts = 0;
      const maxAttempts = 3;
      let verifiedBlueprint = null;

      while (verificationAttempts < maxAttempts && !verifiedBlueprint) {
        verificationAttempts++;
        console.log(`Temporary blueprint verification attempt ${verificationAttempts} for ID: ${blueprint.id}`);
        
        // Add a delay before verification to allow database propagation
        await new Promise(resolve => setTimeout(resolve, 300 * verificationAttempts));
        
        const { data: verifyData, error: verifyError } = await serviceClient
          .from('blueprints')
          .select('id, title, is_temporary')
          .eq('id', blueprint.id)
          .single();

        if (!verifyError && verifyData) {
          console.log(`Temporary blueprint ${blueprint.id} verified on attempt ${verificationAttempts}`);
          verifiedBlueprint = verifyData;
          break;
        }
        
        console.warn(`Temporary blueprint verification attempt ${verificationAttempts} failed:`, verifyError);
      }
      
      if (!verifiedBlueprint) {
        console.warn(`Could not verify temporary blueprint ${blueprint.id}, but continuing as it may be a replication delay`);
      }
      
      // Return the created blueprint regardless of verification
      return NextResponse.json(blueprint);
    }
    
    // For non-temporary blueprints, require authentication
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for creating permanent blueprints' },
        { status: 401 }
      );
    }

    // Create the permanent blueprint
    const blueprintData = {
      title,
      prompt,
      is_verified: false,
      visibility: visibility || 'private',
      user_id: user.id,
      content: [], // Empty array for content
      is_temporary: false,
      search_query: '' // IMPORTANT: Explicitly set search_query to empty string, not null or undefined
    };

    console.log('Creating new permanent blueprint:', {
      ...blueprintData,
      user_id: 'REDACTED'
    });

    // Insert the blueprint
    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .insert(blueprintData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating blueprint:', error);
      return NextResponse.json(
        { error: 'Failed to create blueprint', details: error.message },
        { status: 500 }
      );
    }

    // Ensure the blueprint is committed to the database by verifying it exists
    // This prevents race conditions where the blueprint is created but not yet visible
    let verificationAttempts = 0;
    const maxAttempts = 3;
    let verifiedBlueprint = null;

    while (verificationAttempts < maxAttempts) {
      verificationAttempts++;
      console.log(`Verification attempt ${verificationAttempts} for blueprint ${blueprint.id}`);
      
      // Add a delay before verification
      await new Promise(resolve => setTimeout(resolve, 500 * verificationAttempts));
      
      const { data: verifyData, error: verifyError } = await supabase
        .from('blueprints')
        .select('*')
        .eq('id', blueprint.id)
        .single();

      if (!verifyError && verifyData) {
        console.log(`Blueprint ${blueprint.id} verified successfully on attempt ${verificationAttempts}`);
        verifiedBlueprint = verifyData;
        break;
      }
      
      console.warn(`Verification attempt ${verificationAttempts} failed:`, verifyError);
    }

    if (!verifiedBlueprint) {
      console.error(`Failed to verify blueprint ${blueprint.id} after ${maxAttempts} attempts`);
      // Continue anyway and return the original blueprint data
    }

    console.log('Blueprint created successfully:', blueprint.id);

    // Return the created blueprint
    return NextResponse.json(blueprint);
  } catch (error) {
    console.error('Unhandled error in POST /api/blueprints:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 