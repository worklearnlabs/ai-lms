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
      title: "Voice Notes Transcriber",
      content: "I want an AI that automatically transcribes my voice notes and organizes them into searchable text documents with tags based on content topics and mentioned dates or people.",
      difficulty: "Easy"
    },
    {
      title: "Recipe Recommender",
      content: "I need an AI tool that suggests recipes based on ingredients I already have in my kitchen, dietary preferences, and time constraints, with options to filter by cuisine type.",
      difficulty: "Easy"
    },
    {
      title: "Workout Plan Creator",
      content: "I want an AI that generates personalized weekly workout routines based on my fitness goals, available equipment, and time constraints, with progress tracking and adaptive difficulty.",
      difficulty: "Easy"
    },
    {
      title: "Book Recommendation Engine",
      content: "I need an AI that analyzes my reading history and preferences to recommend new books I might enjoy, providing summaries and showing why each recommendation matches my taste.",
      difficulty: "Easy"
    },
    {
      title: "Travel Itinerary Builder",
      content: "I want an AI that creates detailed travel itineraries based on destination, trip duration, budget, and interests, suggesting attractions, restaurants, and activities with optimal routes.",
      difficulty: "Easy"
    }
  ],
  
  Medium: [
    {
      title: "Language Learning Assistant",
      content: "I need an AI that creates customized language learning exercises based on my proficiency level, learns from my common mistakes, and generates contextual practice scenarios for conversation skills.",
      difficulty: "Medium"
    },
    {
      title: "Document Compliance Checker",
      content: "I need an AI that reviews legal contracts and documents to identify compliance issues with specific regulations, highlighting potential risks and suggesting corrective language.",
      difficulty: "Medium"
    },
    {
      title: "Marketing Copy Generator",
      content: "I want an AI system that analyzes competitor marketing materials, identifies effective messaging patterns, and generates original copy for different platforms while maintaining brand voice.",
      difficulty: "Medium"
    },
    {
      title: "Podcast Content Summarizer",
      content: "I need an AI that transcribes podcast episodes, extracts key insights and quotes, identifies main topics and themes, and generates comprehensive summaries with timestamp references.",
      difficulty: "Medium"
    },
    {
      title: "Customer Feedback Analyzer",
      content: "I want an AI that aggregates customer feedback from multiple channels, categorizes issues, identifies sentiment trends over time, and generates actionable insights for product improvements.",
      difficulty: "Medium"
    }
  ],
  
  Hard: [
    {
      title: "Scientific Research Assistant",
      content: "I'm looking for an AI system that can analyze scientific papers in a specific field, identify research gaps, suggest potential experiment designs, and evaluate the statistical validity of published findings.",
      difficulty: "Hard"
    },
    {
      title: "Adaptive Educational Content Creator",
      content: "I need an AI that generates personalized educational content that adapts in real-time based on learner performance, adjusts difficulty progressively, and creates tailored assessments to reinforce concepts.",
      difficulty: "Hard"
    },
    {
      title: "Predictive Maintenance System",
      content: "I want an AI system that analyzes IoT sensor data from industrial equipment, predicts potential failures before they occur, recommends maintenance schedules, and optimizes part replacement timing.",
      difficulty: "Hard"
    },
    {
      title: "Fraud Detection Analyzer",
      content: "I need an AI that monitors financial transactions in real-time, identifies suspicious patterns using historical data, adapts to new fraud techniques, and minimizes false positives.",
      difficulty: "Hard"
    },
    {
      title: "Autonomous Project Manager",
      content: "I'm looking for an AI system that can manage software development projects, assign tasks based on team members' skills and availability, predict bottlenecks, and suggest resource reallocations.",
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
          title: "Website Analytics Summarizer",
          content: "I want an AI that processes my website analytics data daily, identifies traffic patterns, highlights conversion changes, and sends an executive summary with visualizations and recommendations for improving user engagement.",
          difficulty: "Easy"
        },
        {
          title: "Interview Preparation Coach",
          content: "I need an AI that helps prepare for job interviews by analyzing the job description, generating industry-specific questions, providing feedback on practice answers, and suggesting areas for improvement.",
          difficulty: "Medium"
        },
        {
          title: "Algorithmic Trading Strategy Analyzer",
          content: "Create an AI that evaluates trading strategies by backtesting against historical market data, running Monte Carlo simulations to project outcomes, and suggesting optimizations while highlighting potential risks.",
          difficulty: "Hard"
        }
      ],
      source: 'fallback'
    });
  }
} 