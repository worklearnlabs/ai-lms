import { NextRequest, NextResponse } from "next/server";
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
    if (!authResult.isAuthenticated || !authResult.supabase || !authResult.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const { supabase, user } = authResult;
    const userId = user.id;
    
    // Use the debug_blueprint RPC function that bypasses RLS
    console.log("[DEBUG] Using RPC function for blueprint check");
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'debug_blueprint',
      {
        p_blueprint_id: id,
        p_user_id: userId
      }
    );
    
    if (rpcError) {
      console.error("[DEBUG] RPC function error:", rpcError);
      return NextResponse.json(
        { 
          error: "Error checking blueprint with RPC",
          details: rpcError.message,
          code: rpcError.code
        },
        { status: 500 }
      );
    }
    
    if (!rpcResult?.success) {
      console.log("[DEBUG] Blueprint not found or not accessible via RPC");
      return NextResponse.json(
        {
          exists: false,
          message: rpcResult?.error || "Blueprint not found or not accessible",
          status: rpcResult?.status || 404
        },
        { status: 200 } // Return 200 for the API but include status in payload
      );
    }
    
    // RPC function succeeded, return the data
    console.log("[DEBUG] RPC function successful, blueprint exists");
    return NextResponse.json({
      exists: true,
      rpc_check: "success",
      data: rpcResult.data,
      userId: userId
    });
    
  } catch (error) {
    console.error("[DEBUG] Unexpected error in blueprint check:", error);
    return NextResponse.json(
      { 
        error: "Server error checking blueprint", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 