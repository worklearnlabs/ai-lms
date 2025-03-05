import { createClientSupabase } from "@/src/lib/supabase/client";
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClientSupabase();
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      authenticated: !!data.session,
      session: data.session ? {
        userId: data.session.user.id,
        userEmail: data.session.user.email,
        expires: data.session.expires_at
      } : null
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ error: 'Failed to check authentication' }, { status: 500 });
  }
} 