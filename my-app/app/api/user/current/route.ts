import { NextResponse } from 'next/server';
import { createServiceRoleClient } from "@/utils/supabase-admin";
import { ensureUserInDatabase } from '@/utils/user-sync';

export async function GET() {
  try {
    const serviceClient = createServiceRoleClient();
    
    // Get auth session to check if user is authenticated
    const authResponse = await serviceClient.auth.getSession();
    
    // Check if we have an authenticated user
    if (!authResponse.data.session || !authResponse.data.session.user) {
      console.log("No authenticated user");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    // Get auth user ID and ensure user exists in database
    const authUserId = authResponse.data.session.user.id;
    console.log("Authenticated user ID from session:", authUserId);
    
    // Use our utility to ensure user exists and get the correct user ID
    const { success, userId, error } = await ensureUserInDatabase(authUserId);
    
    if (!success || !userId) {
      console.error("Failed to ensure user exists:", error);
      return NextResponse.json(
        { error: "Could not sync user account: " + (error || "Unknown error") },
        { status: 500 }
      );
    }
    
    console.log("Mapped auth user ID to application user ID:", userId);
    
    return NextResponse.json({ userId });
  } catch (error) {
    console.error("Error in current user API:", error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 }
    );
  }
} 