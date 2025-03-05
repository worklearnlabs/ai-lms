import { NextResponse } from "next/server";
import { createBlueprint, getBlueprints } from "@/lib/models/blueprint";

// Handler for GET /api/blueprints
export async function GET() {
  try {
    // In a real application, we would get the user ID from the session
    const userId = "user-1";
    const blueprints = await getBlueprints(userId);
    
    return NextResponse.json({ blueprints });
  } catch (error) {
    console.error("Error fetching blueprints:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprints" },
      { status: 500 }
    );
  }
}

// Handler for POST /api/blueprints
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Basic validation
    if (!data.title || !data.prompt) {
      return NextResponse.json(
        { error: "Title and prompt are required" },
        { status: 400 }
      );
    }
    
    // In a real application, we would get the user ID from the session
    const userId = "user-1";
    
    // Create the blueprint
    const blueprint = await createBlueprint({
      title: data.title,
      prompt: data.prompt,
      userId,
    });
    
    return NextResponse.json({ blueprint }, { status: 201 });
  } catch (error) {
    console.error("Error creating blueprint:", error);
    return NextResponse.json(
      { error: "Failed to create blueprint" },
      { status: 500 }
    );
  }
} 