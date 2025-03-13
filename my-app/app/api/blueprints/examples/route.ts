import { NextResponse } from 'next/server';

/**
 * Example blueprint structure
 */
interface BlueprintExample {
  title: string;
  content: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

// Collection of pre-defined examples organized by difficulty level and theme
const examplesByDifficulty: Record<string, BlueprintExample[]> = {
  Easy: [
    {
      title: "Email Categorization Assistant",
      content: "I want an AI that can automatically sort my incoming emails into predefined categories like 'Important', 'Work', 'Personal', and 'Newsletters' based on their content and sender information.",
      difficulty: "Easy"
    },
    {
      title: "Social Media Scheduler",
      content: "I need an AI tool that can help me schedule and post content across multiple social media platforms. It should suggest optimal posting times based on audience engagement patterns.",
      difficulty: "Easy"
    },
    {
      title: "Meeting Notes Summarizer",
      content: "I want an AI that can transcribe my team meetings and generate concise summaries highlighting key discussion points, decisions made, and action items assigned to team members.",
      difficulty: "Easy"
    },
    {
      title: "Daily News Digest",
      content: "I need an AI that compiles news articles on topics I'm interested in and creates a personalized daily digest with summaries of the most relevant stories in my industry.",
      difficulty: "Easy"
    },
    {
      title: "Product Review Analyzer",
      content: "I want an AI that can scrape product reviews from e-commerce websites, analyze sentiment, and provide insights about what customers like and dislike about similar products.",
      difficulty: "Easy"
    }
  ],
  
  Medium: [
    {
      title: "Customer Support Chatbot",
      content: "I need an AI-powered chatbot that can handle common customer support inquiries, provide product information, and escalate complex issues to human agents when necessary.",
      difficulty: "Medium"
    },
    {
      title: "Content Research Assistant",
      content: "I need an AI that can research specific topics across multiple sources, extract key insights, identify conflicting information, and summarize findings with proper citations for my blog articles.",
      difficulty: "Medium"
    },
    {
      title: "Sales Call Analyzer",
      content: "I want an AI system that can analyze recorded sales calls, identify successful techniques, highlight missed opportunities, and provide actionable feedback to improve our sales team's performance.",
      difficulty: "Medium"
    },
    {
      title: "Financial Document Processor",
      content: "I need an AI that can extract relevant financial data from invoices, receipts, and statements, categorize expenses, and prepare reports for accounting purposes.",
      difficulty: "Medium"
    },
    {
      title: "Personalized Learning Path",
      content: "I want an AI that creates customized learning paths for students based on their skill level, learning style, and goals, adapting content recommendations as they progress through the material.",
      difficulty: "Medium"
    }
  ],
  
  Hard: [
    {
      title: "Market Trend Predictor",
      content: "I'm looking for an AI system that can analyze financial news, social media sentiment, and market data to predict potential stock market trends and provide investment recommendations.",
      difficulty: "Hard"
    },
    {
      title: "Multilingual Content Translator",
      content: "I need an AI that not only translates my marketing content into multiple languages but also adapts the messaging to be culturally appropriate for each target market.",
      difficulty: "Hard"
    },
    {
      title: "Medical Diagnosis Assistant",
      content: "I want an AI system that can analyze patient symptoms, medical history, and test results to suggest possible diagnoses and treatment options for healthcare professionals to consider.",
      difficulty: "Hard"
    },
    {
      title: "Supply Chain Optimizer",
      content: "I need an AI that monitors our global supply chain, predicts potential disruptions, simulates alternative scenarios, and recommends optimal inventory levels and shipping routes.",
      difficulty: "Hard"
    },
    {
      title: "Personalized Video Generator",
      content: "I'm looking for an AI system that can create customized video content for different audience segments, incorporating relevant data, personalized messaging, and appropriate visual elements.",
      difficulty: "Hard"
    }
  ]
};

/**
 * GET /api/blueprints/examples
 * Returns a set of diverse blueprint examples with varying complexity
 */
export async function GET() {
  console.log('Generating blueprint examples from predefined collection...');
  
  try {
    // Select random examples from each difficulty level
    const easyIndex = Math.floor(Math.random() * examplesByDifficulty.Easy.length);
    const mediumIndex = Math.floor(Math.random() * examplesByDifficulty.Medium.length);
    const hardIndex = Math.floor(Math.random() * examplesByDifficulty.Hard.length);
    
    const examples = [
      examplesByDifficulty.Easy[easyIndex],
      examplesByDifficulty.Medium[mediumIndex],
      examplesByDifficulty.Hard[hardIndex]
    ];
    
    console.log('Selected examples:', examples.map(ex => ex.title));
    
    return NextResponse.json({
      examples: examples,
      source: 'curated'  // Indicate these are from our curated collection
    });
    
  } catch (error) {
    console.error('Error generating examples:', error);
    
    // Return fallback examples on error
    console.log('Returning fallback examples due to error');
    return NextResponse.json({
      examples: [
        {
          title: "LinkedIn Content Analyzer",
          content: "I want an AI that monitors LinkedIn for posts about artificial intelligence, machine learning, and venture capital funding. It should collect posts from the last 24 hours, analyze key themes, extract metrics (like engagement rates), and generate a daily summary report highlighting emerging trends and noteworthy discussions.",
          difficulty: "Easy"
        },
        {
          title: "Content Research Assistant",
          content: "I need an AI that can research a specific topic across multiple sources (web articles, academic papers, and social posts), extract key insights, identify conflicting information, and summarize findings with proper citations. The tool should handle complex topics and organize information logically.",
          difficulty: "Medium"
        },
        {
          title: "Weekly Market Trend Analyzer",
          content: "Create an AI that collects financial news from major publications, tracks stock performance for a specific industry segment, identifies correlations between news events and market movements, and produces comprehensive weekly reports with visualizations of key trends and actionable insights.",
          difficulty: "Hard"
        }
      ],
      source: 'fallback'
    });
  }
} 