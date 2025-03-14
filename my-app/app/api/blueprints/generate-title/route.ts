import { NextResponse } from 'next/server';
import { createRouteHandler } from '@/utils/route-handlers';
import { OpenAI } from 'openai';
import { NextRequest } from 'next/server';

// Define types for our responses
type TitleResponse = { title: string };
type ErrorResponse = { error: string; message?: string; suggestion?: string };
type ApiResponse = TitleResponse | ErrorResponse;

/**
 * POST /api/blueprints/generate-title
 * Generates a title for a blueprint based on the prompt
 */
export const POST = createRouteHandler<ApiResponse>(
  ['POST'],
  async (req: NextRequest, { user }) => {
    try {
      // Parse request body
      const body = await req.json();
      const { prompt } = body;
      
      if (!prompt || typeof prompt !== 'string') {
        return NextResponse.json(
          { error: 'Invalid input. Prompt is required.' },
          { status: 400 }
        );
      }
      
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // Log request for debugging
      console.log('Generating title for prompt:', {
        prompt_preview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        has_user: !!user,
      });
      
      // Generate the title using OpenAI with explicit formatting instructions
      const titlePrompt = `
        Generate a concise, descriptive title (5-8 words) for an AI system that does the following:
        
        ${prompt}
        
        Respond with ONLY the title, without quotes or formatting. The title should be clear, professional, and accurately describe the AI system's purpose.
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful assistant that generates concise, descriptive titles for AI systems."
          },
          { role: "user", content: titlePrompt }
        ],
        temperature: 0.7,
        max_tokens: 50,
      });
      
      // Extract and clean up the title
      let title = response.choices[0]?.message?.content?.trim() || "";
      
      // Remove any quotes or artifacts that might be present
      title = title.replace(/^["']|["']$/g, "");
      
      // Ensure it's not too long
      if (title.length > 100) {
        title = title.substring(0, 97) + "...";
      }
      
      // Log the generated title
      console.log('Generated title:', { title, prompt_length: prompt.length });
      
      // Return the generated title
      return NextResponse.json({ title });
    } catch (error) {
      console.error('Error generating title:', error);
      
      // Determine if it's an OpenAI error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimitError = errorMessage.includes('rate limit') || errorMessage.includes('429');
      
      return NextResponse.json(
        { 
          error: 'Failed to generate title',
          message: errorMessage,
          suggestion: isRateLimitError ? 'OpenAI rate limit reached. Please try again later.' : undefined
        },
        { status: 500 }
      );
    }
  }
); 