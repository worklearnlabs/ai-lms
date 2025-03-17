import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const blueprintId = params.id;
    
    if (!blueprintId) {
      return NextResponse.json({ error: "No blueprint ID provided" }, { status: 400 });
    }
    
    // Fetch the blueprint data directly from our API endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/api/blueprints/${blueprintId}`, {
      method: 'GET',
      headers: {
        'X-Debug-Client': 'finalized-endpoint',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Blueprint not found", status: response.status },
        { status: response.status }
      );
    }
    
    const blueprint = await response.json();
    
    // Analyze the search query
    const searchQueryAnalysis = analyzeSearchQuery(blueprint.search_query);
    
    // Create a formatted response with the reasoning agent data flow information
    const finalizedData = {
      blueprint_id: blueprint.id,
      title: blueprint.title,
      prompt: blueprint.prompt,
      search_query: blueprint.search_query,
      description: blueprint.details || blueprint.description,
      complexity: blueprint.complexity || blueprint.skill_level,
      reasoning_process: {
        input: {
          prompt: blueprint.prompt,
          questions: blueprint.content?.questions || [],
          responses: blueprint.content?.responses || {},
          user_profile: {
            skill_level: blueprint.user_skill_level || blueprint.complexity || blueprint.skill_level,
            learning_objective: blueprint.blueprint_learning_focus || blueprint.learning_objective
          }
        },
        output: {
          search_query: blueprint.search_query,
          search_query_analysis: searchQueryAnalysis
        }
      },
      research_agent: {
        expected_input: {
          search_query: blueprint.search_query,
        },
        expected_output_format: {
          structure: "JSON with steps, sources, complexity",
          example: `{
  "complexity": "low|medium|high",
  "steps": [
    {
      "number": 1,
      "title": "Step Title",
      "estimated_time": 30,
      "instructions": ["Instruction 1", "Instruction 2"],
      "tools": ["Tool1", "Tool2"]
    }
  ],
  "sources": [
    {
      "title": "Source Title",
      "url": "https://example.com/source"
    }
  ]
}`
        }
      }
    };
    
    return NextResponse.json(finalizedData);
  } catch (error) {
    console.error("Error in finalized blueprint endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Helper function to analyze the search query structure
function analyzeSearchQuery(searchQuery: string | null | undefined) {
  if (!searchQuery) {
    return {
      is_generated: false,
      length: 0,
      has_output_instructions: false,
      has_search_instructions: false
    };
  }
  
  // Simple analysis to check if the search query contains key elements
  return {
    is_generated: true,
    length: searchQuery.length,
    has_output_instructions: searchQuery.toLowerCase().includes("json") || 
                            searchQuery.toLowerCase().includes("format") ||
                            searchQuery.toLowerCase().includes("output") ||
                            searchQuery.toLowerCase().includes("return"),
    has_search_instructions: searchQuery.toLowerCase().includes("search") ||
                            searchQuery.toLowerCase().includes("find") ||
                            searchQuery.toLowerCase().includes("develop") ||
                            searchQuery.toLowerCase().includes("build") ||
                            searchQuery.toLowerCase().includes("create"),
    contains_json_example: searchQuery.toLowerCase().includes("{") && 
                           searchQuery.toLowerCase().includes("}"),
    likely_contains_research_instructions: 
      searchQuery.toLowerCase().includes("research") ||
      searchQuery.toLowerCase().includes("analyze") ||
      searchQuery.toLowerCase().includes("investigate") ||
      searchQuery.toLowerCase().includes("collect")
  };
} 