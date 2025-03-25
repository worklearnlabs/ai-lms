import { NextResponse } from 'next/server';
import { getAllUsers, createUser } from '@/lib/db';

// GET /api/users - Get all users
export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.fullName || !body.email) {
      return NextResponse.json(
        { error: 'Full name and email are required' },
        { status: 400 }
      );
    }
    
    const newUser = await createUser({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      role: body.role,
      skillLevel: body.skillLevel,
      experience: body.experience,
      learningObjectives: body.learningObjectives,
      preferredLearningStyle: body.preferredLearningStyle,
    });
    
    return NextResponse.json({ user: newUser[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
} 