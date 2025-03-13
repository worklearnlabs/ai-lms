import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { withRouteAuth } from "@/utils/route-handlers";

/**
 * GET /api/debug/db-access
 * Tests database access with different clients to diagnose issues
 */
export async function GET(req: NextRequest) {
  try {
    console.log("[DEBUG] Testing database access");
    
    // Create service role client with admin access
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    // Create standard client without auth
    const standardClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );
    
    // Get authenticated client if available
    const authResult = await withRouteAuth(req);
    const isAuthenticated = authResult.isAuthenticated && !!authResult.supabase;
    
    // Test database connection with service role client
    let dbVersion: string | null = null;
    let dbError: unknown = null;
    
    try {
      const { data, error } = await serviceRoleClient.rpc('get_db_version');
      if (error) throw error;
      dbVersion = data;
    } catch (error) {
      console.error("[DEBUG] Error getting DB version:", error);
      dbError = error instanceof Error ? error.message : String(error);
    }
    
    // Test tables access with different clients
    const tableAccessResults: Record<string, Record<string, TableAccessResult>> = {};
    
    // Tables to test
    const tables = ["blueprints", "blueprint_steps", "blueprint_questions", "users"];
    
    for (const table of tables) {
      tableAccessResults[table] = {
        serviceRole: await testTableAccess(serviceRoleClient, table),
        standard: await testTableAccess(standardClient, table)
      };
      
      if (isAuthenticated && authResult.supabase) {
        tableAccessResults[table].authenticated = await testTableAccess(authResult.supabase, table);
      }
    }
    
    // If authenticated, get user info
    let userInfo = null;
    let userBlueprintCount = 0;
    
    if (isAuthenticated && authResult.user) {
      userInfo = {
        id: authResult.user.id,
        email: authResult.user.email,
        role: authResult.user.app_metadata?.role || "user"
      };
      
      // Get count of blueprints for this user
      const { count, error } = await serviceRoleClient
        .from("blueprints")
        .select("id", { count: "exact" })
        .eq("user_id", authResult.user.id);
        
      if (!error && count !== null) {
        userBlueprintCount = count;
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      dbConnection: {
        url: maskConnectionString(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
        version: dbVersion,
        error: dbError
      },
      authStatus: {
        isAuthenticated,
        userInfo,
        userBlueprintCount
      },
      tableAccess: tableAccessResults,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
  } catch (error) {
    console.error("Error in debug DB access:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Define the result type for table access tests
interface TableAccessResult {
  success: boolean;
  count?: number;
  error: { message: string; code?: string } | string | null;
  hasData?: boolean;
}

// Helper function to test table access
async function testTableAccess(client: SupabaseClient, table: string): Promise<TableAccessResult> {
  try {
    const { data, error, count } = await client
      .from(table)
      .select("*", { count: "exact" })
      .limit(1);
    
    return {
      success: !error,
      count: count || 0,
      error: error ? { message: error.message, code: error.code } : null,
      hasData: !!data && data.length > 0
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper function to mask sensitive parts of connection string
function maskConnectionString(url: string): string {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    // Return partial string if URL parsing fails
    return url.split("://")[0] + "://[masked]";
  }
} 