import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blueprints } from "@/drizzle/schema";
import { generateAIBlueprint } from "@/lib/ai/blueprint-generator";
import { auth } from "@/lib/auth/auth-utils";

export async function GET(request: Request) {
  try {
    // Get the current user
    const user = await auth();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get user's blueprints from the database
    const userBlueprints = await db.query.blueprints.findMany({
      where: (blueprints, { eq }) => eq(blueprints.userId, user.id)
    });
    
    return NextResponse.json({ blueprints: userBlueprints });
  } catch (error) {
    console.error("Error fetching blueprints:", error);
    return NextResponse.json(
      { error: "Failed to fetch blueprints" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await auth();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { title, description, objectives } = await request.json();
    
    // Generate AI blueprint using the integrated AI services
    const generatedBlueprint = await generateAIBlueprint({
      title,
      description,
      objectives,
      userSkillLevel: user.skillLevel,
      userExperience: user.experience
    });
    
    // Save the blueprint to the database
    const newBlueprint = await db.insert(blueprints).values({
      userId: user.id,
      title,
      description,
      content: generatedBlueprint,
      createdAt: new Date()
    }).returning();
    
    return NextResponse.json({ blueprint: newBlueprint[0] });
  } catch (error) {
    console.error("Error creating blueprint:", error);
    return NextResponse.json(
      { error: "Failed to create blueprint" },
      { status: 500 }
    );
  }
} 