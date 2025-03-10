export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ReasoningResponse {
  sessionId: string;
  message: string;
  isComplete: boolean;
  data: {
    title: string;
    searchQuery: string;
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
    prerequisites?: string[];
  } | null;
  messages: Message[];
  blueprint_id?: string;
}

/**
 * Start or continue a reasoning session
 * @param prompt The prompt to send to the reasoning agent
 * @param sessionId Optional session ID for continuing a conversation
 * @param messages Optional array of previous messages
 * @param options Optional learning objective and skill level
 */
export async function callReasoningApi(
  prompt: string,
  sessionId?: string,
  messages?: Message[],
  options?: {
    blueprint_id?: string;
    skill_level?: 'beginner' | 'intermediate' | 'advanced';
    learning_objective?: string;
    bypass_db?: boolean;
  }
): Promise<ReasoningResponse> {
  try {
    console.log('Calling reasoning API with:', { prompt, sessionId, messagesCount: messages?.length });
    
    if (process.env.NODE_ENV === 'development' && options?.bypass_db) {
      console.log('DEVELOPMENT MODE: Using bypass_db option to skip database operations');
    }
    
    const response = await fetch('/api/blueprints/reason', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        sessionId,
        messages,
        blueprint_id: options?.blueprint_id,
        skill_level: options?.skill_level,
        learning_objective: options?.learning_objective,
        bypass_db: options?.bypass_db,
      }),
    });

    const responseText = await response.text();
    console.log('Reasoning API raw response:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { rawResponse: responseText };
      }
      
      console.error('Reasoning API error:', errorData);
      throw new Error(errorData.error || `HTTP error ${response.status}: ${responseText.substring(0, 200)}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Error calling reasoning API:', error);
    throw error instanceof Error ? error : new Error('Failed to call reasoning API');
  }
}

/**
 * Create a new blueprint from the reasoning session output
 * @param title The blueprint title
 * @param searchQuery The refined search query for research
 * @param sessionId The reasoning session ID
 * @param options Additional options for the blueprint
 */
export async function createBlueprintFromReasoning(
  title: string,
  searchQuery: string,
  sessionId: string,
  options?: {
    prompt?: string;
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
    skill_level?: 'beginner' | 'intermediate' | 'advanced';
    learning_objective?: string;
  }
): Promise<{ id: string }> {
  try {
    const response = await fetch('/api/blueprints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        search_query: searchQuery,
        reasoning_session_id: sessionId,
        prompt: options?.prompt,
        complexity: options?.complexity,
        estimated_time: options?.estimatedTime,
        skill_level: options?.skill_level,
        learning_objective: options?.learning_objective,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Authentication required. You must be logged in to create a blueprint.');
        throw new Error('Authentication required');
      }
      
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `HTTP error ${response.status}`;
      console.error('API error:', errorData);
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating blueprint from reasoning:', error);
    throw error instanceof Error ? error : new Error('Failed to create blueprint');
  }
} 