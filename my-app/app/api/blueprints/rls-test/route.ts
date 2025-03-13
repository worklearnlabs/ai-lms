import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRouteAuth } from "@/utils/route-handlers";

/**
 * GET /api/blueprints/rls-test
 * Tests blueprint access with different RLS policies in mind
 */
export async function GET(req: NextRequest) {
  try {
    // Get blueprint_id from query params if provided
    const { searchParams } = new URL(req.url);
    const blueprintId = searchParams.get("id");
    
    // Get authenticated client
    const auth = await withRouteAuth(req);
    
    if (!auth.isAuthenticated || !auth.user || !auth.supabase) {
      return NextResponse.json({
        authenticated: false,
        message: "You must be authenticated to test RLS policies",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    const userId = auth.user.id;
    const supabase = auth.supabase;
    
    // Create service role client to bypass RLS
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    // Test cases to run
    interface TestResult {
      count?: number | null;
      data?: unknown;
      error?: unknown;
      found?: boolean;
      id?: string;
      analysis?: Record<string, unknown>;
      serviceRoleAccess?: Record<string, unknown>;
      authenticatedAccess?: Record<string, unknown>;
    }
    
    const results: Record<string, TestResult> = {};
    
    // Test 1: Count all blueprints (service role)
    const { count: totalCount, error: countError } = await serviceClient
      .from("blueprints")
      .select("*", { count: "exact", head: true });
    
    results.totalBlueprintsCount = {
      count: totalCount,
      error: countError
    };
    
    // Test 2: Count my blueprints (owned by current user)
    const { count: myBlueprintsCount, error: myCountError } = await serviceClient
      .from("blueprints")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    
    results.myBlueprintsCount = {
      count: myBlueprintsCount,
      error: myCountError
    };
    
    // Test 3: Count temporary blueprints
    const { count: tempBlueprintsCount, error: tempCountError } = await serviceClient
      .from("blueprints")
      .select("*", { count: "exact", head: true })
      .eq("is_temporary", true);
    
    results.temporaryBlueprintsCount = {
      count: tempBlueprintsCount,
      error: tempCountError
    };
    
    // Test 4: Count public blueprints
    const { count: publicBlueprintsCount, error: publicCountError } = await serviceClient
      .from("blueprints")
      .select("*", { count: "exact", head: true })
      .eq("visibility", "public");
    
    results.publicBlueprintsCount = {
      count: publicBlueprintsCount,
      error: publicCountError
    };
    
    // Test 5: What RLS policies allow me to see
    const { data: visibleBlueprints, error: visibleError } = await supabase
      .from("blueprints")
      .select("id, title, is_temporary, user_id, visibility")
      .limit(10);
    
    results.visibleBlueprints = {
      count: visibleBlueprints?.length || 0,
      data: visibleBlueprints,
      error: visibleError
    };
    
    // Test 6: Specific blueprint test if ID was provided
    if (blueprintId) {
      // Check with service role (no RLS)
      const { data: bpServiceData, error: bpServiceError } = await serviceClient
        .from("blueprints")
        .select("id, title, details, is_temporary, user_id, visibility")
        .eq("id", blueprintId)
        .maybeSingle();
      
      // Check with authenticated client (with RLS)
      const { data: bpAuthData, error: bpAuthError } = await supabase
        .from("blueprints")
        .select("id, title, details, is_temporary, user_id, visibility")
        .eq("id", blueprintId)
        .maybeSingle();
      
      results.specificBlueprint = {
        id: blueprintId,
        serviceRoleAccess: {
          found: !!bpServiceData,
          data: bpServiceData,
          error: bpServiceError
        },
        authenticatedAccess: {
          found: !!bpAuthData,
          data: bpAuthData,
          error: bpAuthError
        },
        analysis: bpServiceData 
          ? {
              exists: true,
              isOwned: bpServiceData.user_id === userId,
              isTemporary: bpServiceData.is_temporary,
              visibility: bpServiceData.visibility,
              shouldBeAccessible: 
                bpServiceData.user_id === userId ||
                bpServiceData.is_temporary === true ||
                bpServiceData.visibility === "public"
            }
          : { exists: false }
      };
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userId,
      userEmail: auth.user.email,
      tests: results
    });
  } catch (error) {
    console.error("Error in RLS test:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 