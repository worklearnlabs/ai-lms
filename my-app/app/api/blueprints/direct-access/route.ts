import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/blueprints/direct-access?id={id}
 * Direct access endpoint that uses service role to bypass auth issues
 * This is only for emergency fallback when normal endpoints fail
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Missing blueprint ID" },
        { status: 400 }
      );
    }
    
    console.log(`[DEBUG] Attempting direct access for blueprint ID: ${id}`);

    // Create a service role client with admin privileges
    // This bypasses RLS policies
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Create a normal client for comparison
    const normalClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get auth info if available (without requiring authentication)
    let userInfo = null;
    const sessionResponse = await normalClient.auth.getSession();
    if (sessionResponse.data.session) {
      userInfo = {
        user_id: sessionResponse.data.session.user.id,
        email: sessionResponse.data.session.user.email,
      };
    }
    
    // First check if the blueprint exists at all 
    // using service role client (bypasses RLS)
    const serviceRoleResponse = await serviceRoleClient
      .from("blueprints")
      .select("id, title, details, is_temporary, created_at, user_id, updated_at")
      .eq("id", id)
      .maybeSingle();

    // Check status with normal client
    const normalClientResponse = await normalClient
      .from("blueprints")
      .select("id, title, details, is_temporary, user_id")
      .eq("id", id)
      .maybeSingle();

    // Get blueprint steps with service role client
    let blueprintSteps = null;
    if (serviceRoleResponse.data) {
      const stepsResponse = await serviceRoleClient
        .from("blueprint_steps")
        .select("*")
        .eq("blueprint_id", id)
        .order("order", { ascending: true });
      
      blueprintSteps = stepsResponse.data;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      requestId: id,
      userInfo,
      authStatus: sessionResponse.data.session ? "authenticated" : "unauthenticated",
      blueprintExists: serviceRoleResponse.data !== null,
      serviceRoleAccess: {
        data: serviceRoleResponse.data,
        error: serviceRoleResponse.error,
      },
      normalClientAccess: {
        data: normalClientResponse.data,
        error: normalClientResponse.error,
      },
      steps: blueprintSteps,
      message: serviceRoleResponse.data 
        ? "Blueprint found with service role access" 
        : "Blueprint not found even with service role access",
    });
  } catch (error) {
    console.error("Error in direct blueprint access:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 