import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRouteAuth } from "@/utils/route-handlers";

// Debug endpoint to check blueprint existence with detailed diagnostics
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
    
    console.log(`[DEBUG] Checking blueprint existence for ID: ${id}`);

    // Get authenticated Supabase client
    const authResult = await withRouteAuth(req);
    
    // If not authenticated, return unauthorized
    if (!authResult.isAuthenticated || !authResult.supabase) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const { supabase, user } = authResult;
    const userId = user.id;
    
    // Create service role client
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // First check if blueprint exists using authenticated client
    console.log(`[DEBUG] Checking with authenticated client for user: ${userId}`);
    const authCheckResponse = await supabase
      .from("blueprints")
      .select("id, is_temporary, user_id")
      .eq("id", id)
      .maybeSingle();
    
    // Check with service role client (bypass RLS)
    console.log("[DEBUG] Checking with service role client");
    const serviceRoleCheckResponse = await serviceRoleClient
      .from("blueprints")
      .select("id, is_temporary, user_id")
      .eq("id", id)
      .maybeSingle();
    
    // Check access to blueprint steps
    let stepsCheckAuth = null;
    let stepsCheckService = null;
    
    if (serviceRoleCheckResponse.data) {
      // Check steps with authenticated client
      const stepsAuthResponse = await supabase
        .from("blueprint_steps")
        .select("id, blueprint_id")
        .eq("blueprint_id", id)
        .limit(1);
      
      stepsCheckAuth = {
        success: !stepsAuthResponse.error,
        count: stepsAuthResponse.data?.length || 0,
        error: stepsAuthResponse.error
      };
      
      // Check steps with service role client
      const stepsServiceResponse = await serviceRoleClient
        .from("blueprint_steps")
        .select("id, blueprint_id")
        .eq("blueprint_id", id)
        .limit(1);
      
      stepsCheckService = {
        success: !stepsServiceResponse.error,
        count: stepsServiceResponse.data?.length || 0,
        error: stepsServiceResponse.error
      };
    }

    // Check RLS permissions
    let hasPermission = false;
    let permissionReason = "Unknown";
    
    if (serviceRoleCheckResponse.data) {
      if (serviceRoleCheckResponse.data.is_temporary) {
        hasPermission = true;
        permissionReason = "Blueprint is temporary and should be accessible to all";
      } else if (serviceRoleCheckResponse.data.user_id === userId) {
        hasPermission = true;
        permissionReason = "User is the owner of the blueprint";
      } else {
        hasPermission = false;
        permissionReason = "User is not the owner of a non-temporary blueprint";
      }
    } else {
      permissionReason = "Blueprint does not exist";
    }

    // Get recent blueprints for this user
    const recentBlueprintsResponse = await supabase
      .from("blueprints")
      .select("id, title, created_at, is_temporary")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      blueprintId: id,
      userId,
      existsInDatabase: serviceRoleCheckResponse.data !== null,
      accessibleToUser: authCheckResponse.data !== null,
      authClientCheck: {
        success: !authCheckResponse.error,
        data: authCheckResponse.data,
        error: authCheckResponse.error
      },
      serviceRoleCheck: {
        success: !serviceRoleCheckResponse.error,
        data: serviceRoleCheckResponse.data,
        error: serviceRoleCheckResponse.error
      },
      stepsAccess: {
        auth: stepsCheckAuth,
        serviceRole: stepsCheckService
      },
      permissionAnalysis: {
        hasPermission,
        reason: permissionReason
      },
      recentBlueprints: recentBlueprintsResponse.data || [],
      diagnostics: {
        requestUrl: req.url,
        method: req.method,
        headers: Object.fromEntries([...req.headers.entries()])
      }
    });
  } catch (error) {
    console.error("Error in debug blueprint check:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 