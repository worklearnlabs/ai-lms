import { NextResponse } from "next/server";
import { createBlueprint, getBlueprints } from "@/utils/models";
import { generateWithFallback } from "@/utils/ai-orchestrator";

// Handler for GET /api/blueprints
export async function GET() {
  try {
    // Use mock user ID for now
    const userId = "user-1";
    
    // Get blueprints using the utility function
    const userBlueprints = await getBlueprints(userId);
    
    return NextResponse.json({ blueprints: userBlueprints });
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
    // Get request data
    const data = await request.json();
    
    // Basic validation
    if (!data.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    
    // Use mock user ID for now
    const userId = "user-1";
    
    // Generate AI blueprint if objectives are provided
    let generatedContent = null;
    
    if (data.objectives && Array.isArray(data.objectives)) {
      try {
        // Use AI to generate blueprint content
        const aiPrompt = `Generate a detailed learning blueprint for: ${data.title}. 
         Description: ${data.description || ""}
         Objectives: ${data.objectives.join(", ")}
         User skill level: beginner`;
        
        const aiResponse = await generateWithFallback(aiPrompt, { detailed: true });
        
        if (aiResponse && aiResponse.content) {
          generatedContent = aiResponse.content;
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
        // Continue without AI generation
      }
    }
    
    // Create the blueprint using the utility function
    const blueprint = await createBlueprint({
      title: data.title,
      prompt: data.prompt || (generatedContent ? generatedContent : ""),
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