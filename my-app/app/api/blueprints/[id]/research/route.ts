import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase-admin";
import { generateResearch, PerplexityResearchResponse } from "@/utils/perplexity-api";
import { createRouteHandler } from "@/utils/route-handlers";
import { Database, Json } from "@/types/supabase-schema";

// Define response types for route handlers
type ErrorResponse = { error: string };
type SuccessResponse = { 
  success: boolean; 
  research_id: string; 
  data: PerplexityResearchResponse;
};
type ResearchResponse = Database["public"]["Tables"]["blueprint_research"]["Row"];

// Type-safe handler for POST requests
export const POST = createRouteHandler<ErrorResponse | SuccessResponse>(
  ["POST"],
  async (req: NextRequest, { params }) => {
    try {
      const { id } = params as { id: string };

      // Parse request body for options (optional)
      const { complexity = "medium", maxSteps = 10 } = (await req.json()) as {
        complexity?: "low" | "medium" | "high";
        maxSteps?: number;
      };

      // Get the blueprint data
      const supabase = createServiceRoleClient();
      const { data: blueprint, error } = await supabase
        .from("blueprints")
        .select("title, prompt, details, search_query")
        .eq("id", id)
        .single();

      if (error || !blueprint) {
        return NextResponse.json(
          { error: "Blueprint not found" },
          { status: 404 }
        );
      }

      // Generate research query from search_query or blueprint content
      const query =
        blueprint.search_query ||
        `Research about: ${blueprint.title}. ${blueprint.details || ""}`;

      // Configure options
      const options = {
        max_steps: maxSteps,
        complexity,
        depth: "detailed" as const,
      };

      // Call Perplexity API
      const researchData = await generateResearch({
        query,
        context: blueprint.prompt || "",
        options,
      });

      // Extract sources and usage metrics to store separately
      const { sources, usage_metrics, ...stepData } = researchData;

      try {
        // Create research entry data with proper JSON conversion
        const researchEntry: Database["public"]["Tables"]["blueprint_research"]["Insert"] = {
          blueprint_id: id,
          search_query: query,
          // Convert objects to JSON safely
          research_data: JSON.parse(JSON.stringify(stepData)) as Json,
          sources: JSON.parse(JSON.stringify(sources)) as Json,
          usage_metrics: JSON.parse(JSON.stringify(usage_metrics)) as Json,
          updated_at: new Date().toISOString(),
          status: "complete",
        };

        // Store research data
        const { data: research, error: insertError } = await supabase
          .from("blueprint_research")
          .upsert(researchEntry)
          .select()
          .single();

        if (insertError) {
          console.error("Database insert error:", insertError);
          return NextResponse.json(
            { error: "Failed to save research data" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          research_id: research.id,
          data: researchData,
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        return NextResponse.json(
          { error: "Database error while storing research" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error generating research:", error);
      return NextResponse.json(
        { error: "Failed to generate research" },
        { status: 500 }
      );
    }
  }
);

// Type-safe handler for GET requests
export const GET = createRouteHandler<ErrorResponse | ResearchResponse>(
  ["GET"],
  async (req: NextRequest, { params }) => {
    try {
      const { id } = params as { id: string };

      try {
        const supabase = createServiceRoleClient();
        const { data, error } = await supabase
          .from("blueprint_research")
          .select("*")
          .eq("blueprint_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            return NextResponse.json(
              { error: "Research not found" },
              { status: 404 }
            );
          }

          return NextResponse.json(
            { error: "Failed to fetch research" },
            { status: 500 }
          );
        }

        return NextResponse.json(data);
      } catch (dbError) {
        console.error("Database error:", dbError);
        return NextResponse.json(
          { error: "Database error while fetching research" },
          { status: 500 }
        );
      }
    } catch (apiError) {
      console.error("API error:", apiError);
      return NextResponse.json(
        { error: "Failed to fetch research data" },
        { status: 500 }
      );
    }
  }
); 