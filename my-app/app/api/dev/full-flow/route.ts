// FOR DEVELOPMENT ONLY - NEVER USE IN PRODUCTION
// Complete flow endpoint that handles reasoning session and blueprint creation

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define constants for message types and conversation steps
enum ConversationStep {
  SKILL_LEVEL = 'skill_level',
  LEARNING_OBJECTIVE = 'learning_objective', 
  PROJECT_SCOPE = 'project_scope',
  FINAL_CLARIFICATION = 'final_clarification',
  COMPLETE = 'complete'
}

// Function to extract skill level from the prompt or conversation
function extractSkillLevel(prompt: string, messages: any[] = []): string | null {
  const skillLevelKeywords = {
    beginner: ['beginner', 'new', 'starting', 'novice', 'basic', 'simple', 'easy'],
    intermediate: ['intermediate', 'some experience', 'familiar', 'moderate'],
    advanced: ['advanced', 'expert', 'experienced', 'complex', 'sophisticated']
  };
  
  // Check messages first
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  
  for (const level in skillLevelKeywords) {
    const keywords = skillLevelKeywords[level as keyof typeof skillLevelKeywords];
    
    // Check messages
    for (const message of userMessages) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return level;
      }
    }
    
    // Check prompt
    if (keywords.some(keyword => prompt.toLowerCase().includes(keyword))) {
      return level;
    }
  }
  
  return null;
}

// Function to extract learning objective from the prompt or conversation
function extractLearningObjective(prompt: string, messages: any[] = []): string | null {
  const learningObjectiveKeywords = [
    'learn', 'understand', 'practice', 'improve', 'master', 'study',
    'education', 'teaching', 'academic', 'skill development', 'training'
  ];
  
  // Check for explicit mentions in user messages
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
  
  for (const message of userMessages) {
    const learningMatch = message.match(/learning (?:goal|objective)(?:s)?:?\s*["']?(.*?)["']?(?:$|\.|\?)/i);
    if (learningMatch && learningMatch[1]) {
      return learningMatch[1].trim();
    }
  }
  
  // Check for learning objective in the prompt
  const promptMatch = prompt.match(/learning (?:goal|objective)(?:s)?:?\s*["']?(.*?)["']?(?:$|\.|\?)/i);
  if (promptMatch && promptMatch[1]) {
    return promptMatch[1].trim();
  }
  
  // Default to a generic learning objective if we find learning-related keywords
  for (const keyword of learningObjectiveKeywords) {
    if (prompt.toLowerCase().includes(keyword)) {
      return "Mastering the practical implementation of the described AI system";
    }
  }
  
  return null;
}

// Function to generate a system response based on conversation state
function generateResponse(
  prompt: string, 
  messages: any[] = [],
  step: ConversationStep,
  skillLevel?: string | null,
  learningObjective?: string | null
): { content: string; data?: any; isComplete?: boolean } {
  
  const extractedSkillLevel = skillLevel || extractSkillLevel(prompt, messages) || 'intermediate';
  const extractedLearningObjective = learningObjective || extractLearningObjective(prompt, messages);
  
  // Generate contextually relevant response based on conversation step
  switch (step) {
    case ConversationStep.SKILL_LEVEL:
      return {
        content: `Thanks for your request about "${prompt.substring(0, 50)}...". To tailor this blueprint to your needs, could you tell me about your experience level with these technologies? Are you a beginner, intermediate, or advanced user?`
      };
      
    case ConversationStep.LEARNING_OBJECTIVE:
      return {
        content: `Great, I'll design this for ${extractedSkillLevel} users. What's your primary learning objective or goal with this project? What specific skills or knowledge do you want to gain?`
      };
      
    case ConversationStep.PROJECT_SCOPE:
      return {
        content: `I understand your learning objective is to ${extractedLearningObjective || 'build this system effectively'}. Are there any specific constraints, tools, or technologies you want to include or exclude from this project?`
      };
      
    case ConversationStep.FINAL_CLARIFICATION:
      return {
        content: `Just to confirm, you're looking to ${prompt.substring(0, 100)}... as a ${extractedSkillLevel} user, with the goal of ${extractedLearningObjective || 'implementing the solution effectively'}. Is there anything else you'd like to clarify before I create the final blueprint?`
      };
      
    case ConversationStep.COMPLETE:
      // For the final response, generate a dynamic completion
      const title = generateTitle(prompt, messages);
      const searchQuery = generateSearchQuery(prompt, messages, extractedSkillLevel, extractedLearningObjective);
      
      return {
        content: JSON.stringify({
          title,
          searchQuery,
          complexity: extractedSkillLevel,
          estimatedTime: estimatedTimeByComplexity(extractedSkillLevel),
          prerequisites: generatePrerequisites(prompt, messages, extractedSkillLevel)
        }, null, 2),
        data: {
          title,
          searchQuery,
          complexity: extractedSkillLevel,
          estimatedTime: estimatedTimeByComplexity(extractedSkillLevel),
          prerequisites: generatePrerequisites(prompt, messages, extractedSkillLevel)
        },
        isComplete: true
      };
      
    default:
      return {
        content: `I'll help you create a blueprint for "${prompt.substring(0, 50)}...". Could you tell me more about what you're trying to achieve?`
      };
  }
}

// Helper function to generate a more relevant title
function generateTitle(prompt: string, messages: any[] = []): string {
  // Extract key themes from the prompt
  const aiThemes = [
    { keyword: 'monitor', theme: 'Data Monitoring' },
    { keyword: 'collect', theme: 'Data Collection' },
    { keyword: 'research', theme: 'Research' },
    { keyword: 'analyze', theme: 'Analysis' },
    { keyword: 'summarize', theme: 'Summarization' },
    { keyword: 'financial', theme: 'Financial Analysis' },
    { keyword: 'news', theme: 'News Aggregation' },
    { keyword: 'social', theme: 'Social Media' },
    { keyword: 'ticket', theme: 'Customer Support' },
    { keyword: 'support', theme: 'Support' },
    { keyword: 'image', theme: 'Image Processing' },
    { keyword: 'video', theme: 'Video Processing' },
    { keyword: 'audio', theme: 'Audio Processing' },
    { keyword: 'text', theme: 'Text Processing' },
    { keyword: 'chat', theme: 'Conversational AI' },
    { keyword: 'recommend', theme: 'Recommendation' }
  ];
  
  // Find matching themes
  const matchedThemes = aiThemes.filter(theme => 
    prompt.toLowerCase().includes(theme.keyword.toLowerCase())
  );
  
  // Generate title based on themes
  if (matchedThemes.length > 0) {
    const primaryTheme = matchedThemes[0].theme;
    const secondaryTheme = matchedThemes.length > 1 ? matchedThemes[1].theme : "System";
    let title = `${primaryTheme} ${secondaryTheme} AI`;
    
    // Clean up duplicates in title
    title = title.replace(/AI AI/g, 'AI').replace(/System System/g, 'System');
    
    // Add "System" at the end if not already present
    if (!title.includes('System')) {
      title += ' System';
    }
    
    return title;
  } else {
    // Extract key noun phrases from the prompt
    const keywords = prompt.split(/\s+/).filter(word => 
      word.length > 3 && !['that', 'with', 'from', 'this', 'have', 'will', 'using'].includes(word.toLowerCase())
    ).slice(0, 3);
    
    if (keywords.length > 0) {
      // Capitalize first letter of each word
      const capitalizedKeywords = keywords.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      
      return `${capitalizedKeywords} AI System`;
    }
    
    // Fallback to generic title
    return "Custom AI System";
  }
}

// Helper function to generate search query
function generateSearchQuery(
  prompt: string, 
  messages: any[] = [], 
  skillLevel?: string | null,
  learningObjective?: string | null
): string {
  // Extract the most important parts of the prompt
  const promptWords = prompt.split(/\s+/).filter(word => 
    word.length > 3 && !['that', 'with', 'from', 'this', 'have', 'will', 'for'].includes(word.toLowerCase())
  );
  
  // Build search query
  let searchTerms = promptWords.slice(0, 10).join(' ');
  
  // Add skill level context if available
  if (skillLevel) {
    searchTerms += ` for ${skillLevel} developers`;
  }
  
  // Add learning objective if available
  if (learningObjective) {
    searchTerms += ` focused on ${learningObjective}`;
  }
  
  return searchTerms;
}

// Helper function to generate prerequisites based on prompt
function generatePrerequisites(prompt: string, messages: any[] = [], skillLevel?: string): string[] {
  const prerequisites = ["Node.js"];
  
  if (prompt.toLowerCase().includes("machine learning") || 
      prompt.toLowerCase().includes("ml") ||
      skillLevel === "advanced") {
    prerequisites.push("Machine Learning knowledge");
  }
  
  if (prompt.toLowerCase().includes("natural language") || 
      prompt.toLowerCase().includes("nlp") ||
      prompt.toLowerCase().includes("text") ||
      prompt.toLowerCase().includes("language")) {
    prerequisites.push("Experience with NLP");
  }
  
  if (prompt.toLowerCase().includes("image") || 
      prompt.toLowerCase().includes("video") ||
      prompt.toLowerCase().includes("computer vision")) {
    prerequisites.push("Computer Vision basics");
  }
  
  if (prompt.toLowerCase().includes("financial") || 
      prompt.toLowerCase().includes("finance") ||
      prompt.toLowerCase().includes("stock")) {
    prerequisites.push("Financial domain knowledge");
  }
  
  return prerequisites;
}

// Helper function to generate estimated time based on complexity
function estimatedTimeByComplexity(complexity?: string): string {
  switch(complexity) {
    case 'beginner':
      return '1-2 weeks';
    case 'intermediate':
      return '2-3 weeks';
    case 'advanced':
      return '4-6 weeks';
    default:
      return '2-3 weeks';
  }
}

// Function to determine the next conversation step
function getNextConversationStep(messages: any[]): ConversationStep {
  // Count the number of assistant-user exchanges
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  if (assistantMessages.length === 0) {
    return ConversationStep.SKILL_LEVEL;
  } else if (assistantMessages.length === 1) {
    return ConversationStep.LEARNING_OBJECTIVE;
  } else if (assistantMessages.length === 2) {
    return ConversationStep.PROJECT_SCOPE;
  } else if (assistantMessages.length === 3) {
    return ConversationStep.FINAL_CLARIFICATION;
  } else {
    return ConversationStep.COMPLETE;
  }
}

export async function POST(req: Request) {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Development only endpoint' }, { status: 403 });
  }
  
  try {
    // Parse request body
    const body = await req.text();
    console.log('Full flow request:', body);
    
    let json;
    try {
      json = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request' }, { status: 400 });
    }
    
    const { 
      prompt, 
      sessionId: existingSessionId, 
      messages: existingMessages = [],
      createBlueprint = false,
      skill_level,
      learning_objective
    } = json;
    
    if (!prompt && existingMessages.length === 0) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }
    
    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    // STEP 1: Get a valid user ID from an existing blueprint
    const { data: blueprints, error: blueprintError } = await supabase
      .from('blueprints')
      .select('user_id')
      .limit(1);
      
    if (blueprintError || !blueprints || blueprints.length === 0) {
      console.error('Error fetching user ID:', blueprintError);
      return NextResponse.json({ error: 'Failed to get valid user ID' }, { status: 500 });
    }
    
    const userId = blueprints[0].user_id;
    console.log('Using user_id:', userId);
    
    // If we have an existing session ID, retrieve it
    let sessionId = existingSessionId;
    let blueprintId;
    let messages = [...existingMessages];
    
    // If no session exists, create a new session and temporary blueprint
    if (!sessionId) {
      // Create temporary blueprint for tracking
      const { data: tempBlueprint, error: tempBlueprintError } = await supabase
        .from('blueprints')
        .insert({
          title: 'Temp Blueprint: ' + prompt.substring(0, 30),
          is_verified: false,
          visibility: 'private',
          user_id: userId,
          content: [],
          prompt: prompt
        })
        .select()
        .single();
        
      if (tempBlueprintError) {
        console.error('Error creating temp blueprint:', tempBlueprintError);
        return NextResponse.json({ error: 'Failed to create temp blueprint' }, { status: 500 });
      }
      
      blueprintId = tempBlueprint.id;
      console.log('Created temp blueprint:', blueprintId);
      
      // Create reasoning session
      const { data: session, error: sessionError } = await supabase
        .from('reasoning_sessions')
        .insert({
          blueprint_id: blueprintId,
          status: 'active',
          context: { 
            original_prompt: prompt,
            skill_level,
            learning_objective
          }
        })
        .select()
        .single();
        
      if (sessionError) {
        console.error('Error creating session:', sessionError);
        
        // Clean up blueprint
        await supabase
          .from('blueprints')
          .delete()
          .eq('id', blueprintId);
          
        return NextResponse.json({ error: 'Failed to create reasoning session' }, { status: 500 });
      }
      
      sessionId = session.id;
      console.log('Created session:', sessionId);
      
      // Add initial system message
      messages = [
        {
          session_id: sessionId,
          role: 'system',
          content: 'You are an AI assistant helping create blueprint specifications.'
        },
        {
          session_id: sessionId,
          role: 'user',
          content: prompt
        }
      ];
      
      // Insert initial messages
      const { error: messagesError } = await supabase
        .from('reasoning_messages')
        .insert(messages);
        
      if (messagesError) {
        console.error('Error inserting initial messages:', messagesError);
      }
    } else {
      // Find existing blueprint ID from session
      const { data: session, error: sessionError } = await supabase
        .from('reasoning_sessions')
        .select('blueprint_id')
        .eq('id', sessionId)
        .single();
        
      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return NextResponse.json({ error: 'Failed to fetch reasoning session' }, { status: 500 });
      }
      
      blueprintId = session.blueprint_id;
      
      // If we have a message from the user, store it
      if (prompt && !existingMessages.some(m => m.role === 'user' && m.content === prompt)) {
        const newUserMessage = {
          session_id: sessionId,
          role: 'user',
          content: prompt
        };
        
        messages.push(newUserMessage);
        
        // Insert new user message
        const { error: messageError } = await supabase
          .from('reasoning_messages')
          .insert(newUserMessage);
          
        if (messageError) {
          console.error('Error inserting user message:', messageError);
        }
      }
    }
    
    // Determine the next step in the conversation
    const nextStep = getNextConversationStep(messages);
    console.log('Next conversation step:', nextStep);
    
    // Generate a response based on the current state
    const response = generateResponse(
      prompt, 
      messages, 
      nextStep,
      skill_level,
      learning_objective
    );
    
    // Add assistant response to messages
    const assistantMessage = {
      session_id: sessionId,
      role: 'assistant',
      content: response.content
    };
    
    messages.push(assistantMessage);
    
    // Insert assistant message
    const { error: assistantMessageError } = await supabase
      .from('reasoning_messages')
      .insert(assistantMessage);
      
    if (assistantMessageError) {
      console.error('Error inserting assistant message:', assistantMessageError);
    }
    
    // If the response is complete and we're instructed to create a blueprint, do so
    let finalBlueprint = null;
    if (response.isComplete && createBlueprint && response.data) {
      try {
        const parsedData = response.data;
        
        // Map complexity value to database format
        const complexityMapping: Record<string, string> = {
          'beginner': 'low',
          'intermediate': 'medium',
          'advanced': 'high'
        };
        
        const { data: newBlueprint, error: createError } = await supabase
          .from('blueprints')
          .insert({
            title: parsedData.title,
            search_query: parsedData.searchQuery,
            is_verified: false,
            visibility: 'private',
            user_id: userId,
            content: [],
            prompt: prompt,
            skill_level: skill_level,
            learning_objective: learning_objective,
            complexity: complexityMapping[parsedData.complexity] || null,
            estimated_time: parsedData.estimatedTime || null
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating final blueprint:', createError);
        } else {
          finalBlueprint = newBlueprint;
          
          // Update the session to link to the final blueprint
          await supabase
            .from('reasoning_sessions')
            .update({ blueprint_id: newBlueprint.id })
            .eq('id', sessionId);
            
          // We don't delete the temp blueprint as it's useful for debugging and records
        }
      } catch (createBlueprintError) {
        console.error('Error in blueprint creation:', createBlueprintError);
      }
    }
    
    return NextResponse.json({
      sessionId,
      blueprintId: finalBlueprint?.id || blueprintId,
      message: response.content,
      isComplete: response.isComplete || false,
      data: response.data || null,
      blueprint: finalBlueprint,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      success: true
    });
    
  } catch (error) {
    console.error('Unexpected error in full-flow endpoint:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 