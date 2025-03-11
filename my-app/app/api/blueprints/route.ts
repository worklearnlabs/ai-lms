import { NextResponse } from 'next/server';
import { createServiceRoleClient } from "@/utils/supabase-admin";
import { ensureUserInDatabase } from '@/utils/user-sync';

// Handler for GET /api/blueprints
export async function GET() {
  // Get all blueprints that the user has access to
  try {
    const serviceClient = createServiceRoleClient();
    
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
export async function POST(request: Request) {
  console.log("=== Creating Blueprint ===");
  
  try {
    const jsonData = await request.json();
    console.log("Request data received:", JSON.stringify(jsonData));
    
    // Extract blueprint data from the request
    const title = jsonData.title || 'Untitled Blueprint';
    const search_query = jsonData.search_query || jsonData.searchQuery;
    const is_temporary = jsonData.is_temporary || false;
    const content = jsonData.content || {};
    
    console.log("Extracted from request:");
    console.log("- title:", title);
    console.log("- search_query:", search_query);
    console.log("- is_temporary:", is_temporary);
    
    // Create service client
    const serviceClient = createServiceRoleClient();
    
    // Get auth session 
    const authResponse = await serviceClient.auth.getSession();
    
    // Check if we have a session with a user
    if (!authResponse.data.session || !authResponse.data.session.user) {
      // For temporary blueprints, we can create without a user
      if (is_temporary) {
        console.log("Creating temporary blueprint without user association");
        
        // Ensure we store the original prompt in the prompt field
        // Use search_query as prompt if available, otherwise use title
        const blueprintPrompt = search_query || title;
        
        console.log("Creating temporary blueprint with:");
        console.log("- title:", title);
        console.log("- search_query:", search_query);
        console.log("- prompt (original query):", blueprintPrompt);
        
        const result = await serviceClient
          .from('blueprints')
          .insert({
            title,
            search_query,
            prompt: blueprintPrompt, // Store the original query/prompt
            is_temporary: true, // Force is_temporary to true
            content
          })
          .select()
          .single();
        
        if (result.error) {
          console.error("Error creating temporary blueprint:", result.error);
          return NextResponse.json({ error: result.error.message }, { status: 500 });
        }
        
        console.log("Temporary blueprint created successfully:", result.data?.id);
        return NextResponse.json(result.data, { status: 201 });
      }
      
      // For non-temporary blueprints, require authentication
      return NextResponse.json(
        { error: "Authentication required for creating blueprints" },
        { status: 401 }
      );
    }
    
    // Get auth user ID and ensure user exists in database
    const authUserId = authResponse.data.session.user.id;
    console.log("Authenticated user ID from session:", authUserId);
    
    // Use our utility to ensure user exists and get the correct user ID
    const { success, userId, error } = await ensureUserInDatabase(authUserId);
    
    if (!success || !userId) {
      console.error("Failed to ensure user exists:", error);
      return NextResponse.json(
        { error: "Could not associate blueprint with user: " + (error || "Unknown error") },
        { status: 500 }
      );
    }
    
    // Create the blueprint with the verified user ID
    console.log("Creating blueprint with user ID:", userId);
    
    // Ensure we store the original prompt in the prompt field
    // Use search_query as prompt if available, otherwise use title
    const blueprintPrompt = search_query || title;
    
    const result = await serviceClient
      .from('blueprints')
      .insert({
        title,
        search_query,
        prompt: blueprintPrompt, // Store the original query/prompt
        is_temporary,
        content,
        user_id: userId
      })
      .select()
      .single();
    
    if (result.error) {
      console.error("Error creating blueprint:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
    
    console.log("Blueprint created successfully:", result.data?.id);
    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("API endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 400 }
    );
  }
} 