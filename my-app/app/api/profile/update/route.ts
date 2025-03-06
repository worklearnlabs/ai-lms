import { createClientSupabase } from "@/utils/supabase";
import { NextResponse } from 'next/server';

// Define user profile database fields
interface UserDbFields {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  skill_level: string;
  learning_objectives: string;
  updated_at: string;
}

export async function PUT(request: Request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const supabase = createClientSupabase();
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError || 'No user found');
      return NextResponse.json(
        { error: 'Authentication failed. Please log in again.' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    const userId = user.id;
    const userEmail = user.email || '';
    
    // Update fields to save
    const updateFields = {
      first_name: data.firstName,
      last_name: data.lastName,
      skill_level: data.skillLevel,
      learning_objectives: data.learningObjectives,
      updated_at: new Date().toISOString()
    };
    
    console.log('Updating profile with data:', {
      ...updateFields,
      id: userId,
      email: userEmail
    });
    
    // Check if user exists by email first (most reliable way)
    const { data: existingUserByEmail, error: emailCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();
      
    if (emailCheckError && emailCheckError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking user by email:', emailCheckError);
      return NextResponse.json(
        { error: emailCheckError.message },
        { status: 500 }
      );
    }
    
    if (existingUserByEmail) {
      // User exists with this email, update by that record's ID
      console.log('Found existing user by email, updating:', existingUserByEmail.id);
      const { error: updateError } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', existingUserByEmail.id);
      
      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // User doesn't exist at all, create new
      console.log('No existing user found, creating new record');
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: userEmail,
          ...updateFields
        }]);
      
      if (insertError) {
        console.error('Error inserting user:', insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ 
      success: true,
      userId,
      email: userEmail,
      fields: Object.keys(updateFields)
    });
  } catch (error) {
    console.error('Unexpected error during profile update:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 