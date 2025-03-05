import { ContentItem } from "@/app/blueprints/[id]/types";

export interface Blueprint {
  id: string;
  title: string;
  status: 'draft' | 'in_progress' | 'completed' | 'failed';
  prompt: string;
  content: ContentItem[];
  isVerified: boolean;
  stepsCount: number;
  details: string;
  cloneCount?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlueprintCreateInput {
  title: string;
  prompt: string;
  userId: string;
}

export interface BlueprintUpdateInput {
  title?: string;
  status?: 'draft' | 'in_progress' | 'completed' | 'failed';
  prompt?: string;
  content?: ContentItem[];
  isVerified?: boolean;
}

// Mock function - replace with actual database calls later
export async function getBlueprints(userId: string): Promise<Blueprint[]> {
  // This would be replaced with actual database calls
  console.log(`Fetching blueprints for user: ${userId}`); // Using userId to prevent linter warning
  
  return [
    {
      id: "1",
      title: "LinkedIn Data Scraper",
      status: "completed",
      prompt: "Run a daily search of LinkedIn posts for any post that has the keywords \"venture studio\" or \"venture studios\". I only want posts from the last 24 hours. I want the name of the poster, post content, # of comments, timestamp, date stamp and post URL. Once I have that information I want an agent to summarize each post and put it all in a Google Doc.",
      content: getMockLinkedInScraperContent(),
      isVerified: true,
      stepsCount: 5,
      details: "Automated daily search of LinkedIn posts containing specific keywords, followed by extraction and summarization.",
      cloneCount: 23,
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Customer Support Chatbot",
      status: "draft",
      prompt: "Create a customer support chatbot that can handle basic questions about our products, process returns, and escalate to human agents when needed.",
      content: [],
      isVerified: false,
      stepsCount: 7,
      details: "AI-powered chatbot that handles customer inquiries, processes basic requests, and escalates complex issues.",
      cloneCount: 5,
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Content Recommendation Engine",
      status: "in_progress",
      prompt: "Build a recommendation engine that analyzes user behavior to suggest personalized content and products.",
      content: [],
      isVerified: true,
      stepsCount: 6,
      details: "Engine that analyzes user behavior and preferences to suggest personalized content and products.",
      cloneCount: 18,
      userId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
}

export async function getBlueprintById(id: string): Promise<Blueprint | null> {
  const mockBlueprints = await getBlueprints("any-user");
  return mockBlueprints.find(blueprint => blueprint.id === id) || null;
}

export async function createBlueprint(input: BlueprintCreateInput): Promise<Blueprint> {
  // This would create a new blueprint in the database
  return {
    id: Math.random().toString(36).substring(2, 9),
    title: input.title,
    status: "draft",
    prompt: input.prompt,
    content: [],
    isVerified: false,
    stepsCount: 0,
    details: "New blueprint created",
    userId: input.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateBlueprint(id: string, input: BlueprintUpdateInput): Promise<Blueprint | null> {
  // This would update an existing blueprint in the database
  const blueprint = await getBlueprintById(id);
  if (!blueprint) return null;
  
  return {
    ...blueprint,
    ...input,
    updatedAt: new Date().toISOString(),
  };
}

export async function regenerateBlueprint(id: string, prompt: string): Promise<Blueprint | null> {
  // Get the existing blueprint first
  const blueprint = await getBlueprintById(id);
  if (!blueprint) return null;
  
  try {
    // In a server component (Next.js route handler), we need a full URL
    // Get the base URL from environment variables, falling back to localhost for development
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    
    const apiUrl = new URL('/api/research', baseUrl).toString();
    
    console.log("Calling research API at:", apiUrl);
    
    // Call the research API to generate content based on the prompt
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Create a detailed step-by-step implementation plan for the following AI workflow: ${prompt}. Include a brief summary, system architecture overview, required tools, and implementation steps.`,
        detailed: true,
      }),
    });

    if (!response.ok) {
      // For non-OK responses, we need to check the response type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error("Research API error:", errorData);
        throw new Error(errorData.error || `API returned ${response.status}: ${response.statusText}`);
      } else {
        // Handle HTML or other non-JSON responses
        const text = await response.text();
        console.error(`API returned ${response.status} with non-JSON response:`, text.substring(0, 200) + '...');
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
    }

    const data = await response.json();
    console.log("Research API response:", data);

    // Parse the content from the research result
    // This is a simple markdown to ContentItem[] parser
    const content = parseMarkdownToContentItems(data.content);

    // Update the blueprint with the new content
    return {
      ...blueprint,
      prompt,
      content,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error regenerating blueprint:", error);
    // If the API call fails, return the existing blueprint with a status update
    return {
      ...blueprint,
      status: 'failed',
      updatedAt: new Date().toISOString(),
    };
  }
}

// Simple markdown parser that converts markdown text to ContentItem[]
function parseMarkdownToContentItems(markdown: string): ContentItem[] {
  const lines = markdown.split('\n');
  const contentItems: ContentItem[] = [];
  let currentList: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check for headings
    if (line.startsWith('# ')) {
      if (currentList.length > 0) {
        contentItems.push({ type: 'list', items: [...currentList] });
        currentList = [];
      }
      contentItems.push({ type: 'heading', content: line.substring(2) });
    } 
    // Check for h2 headings
    else if (line.startsWith('## ')) {
      if (currentList.length > 0) {
        contentItems.push({ type: 'list', items: [...currentList] });
        currentList = [];
      }
      contentItems.push({ type: 'heading', content: line.substring(3) });
    } 
    // Check for list items
    else if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      const itemContent = line.replace(/^-\s|\*\s|\d+\.\s/, '');
      currentList.push(itemContent);
    } 
    // Everything else is a paragraph
    else {
      if (currentList.length > 0) {
        contentItems.push({ type: 'list', items: [...currentList] });
        currentList = [];
      }
      contentItems.push({ type: 'paragraph', content: line });
    }
  }
  
  // Don't forget to add the last list if it exists
  if (currentList.length > 0) {
    contentItems.push({ type: 'list', items: [...currentList] });
  }
  
  return contentItems;
}

function getMockLinkedInScraperContent(): ContentItem[] {
  return [
    {
      type: "heading",
      content: "Daily LinkedIn Posts Summarizer"
    },
    {
      type: "paragraph",
      content: "This guide outlines a no-code approach to automatically search LinkedIn daily for posts containing the keywords \"venture studio\" or \"venture studios\", extract key information, summarize each post using an AI agent, and compile everything into a daily Google Doc."
    },
    {
      type: "heading",
      content: "System Architecture Overview"
    },
    {
      type: "list",
      items: [
        "No-Code Scraping Tool: PhantomBuster or Apify runs a scheduled LinkedIn search for the specified keywords, collects posts from the past 24 hours, and extracts the desired data fields.",
        "Data Storage: Google Sheets serves as the repository for the scraped information, providing columns for poster name, post content, comment count, timestamp, date stamp, and post URL.",
        "AI Integration: A workflow tool like Zapier triggers an LLM-based summarization step, automatically generating concise descriptions of each post.",
        "Output & Reporting: A daily Google Doc compiles the post summaries along with original details, creating a centralized report for review."
      ]
    },
    {
      type: "heading",
      content: "Tools"
    },
    {
      type: "list",
      items: [
        "PhantomBuster or Apify: Used to search and scrape LinkedIn data without coding.",
        "Google Sheets: Stores the extracted post data.",
        "Zapier: Connects the data pipeline and triggers the AI summarization.",
        "LLM API: Generates concise summaries for each post.",
        "Google Docs: Receives and displays the final daily report."
      ]
    },
    {
      type: "heading",
      content: "Implementation Steps"
    },
    {
      type: "paragraph",
      content: "Follow these steps to set up your LinkedIn data scraper and summarization system:"
    },
    {
      type: "list",
      items: [
        "Step 1: Sign up for PhantomBuster or Apify and locate their LinkedIn Post Scraper.",
        "Step 2: Configure the scraper to search for \"venture studio\" OR \"venture studios\" keywords.",
        "Step 3: Set up a Google Sheet with columns for all the required data fields.",
        "Step 4: Create a Zapier workflow to trigger daily and send data to your LLM.",
        "Step 5: Configure the LLM to generate summaries based on the content.",
        "Step 6: Set up the final step to compile everything into a Google Doc."
      ]
    }
  ];
} 