import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define sample blueprint data
const blueprints = [
  {
    title: 'LinkedIn Data Scraper',
    details: 'A tool to extract professional data from LinkedIn profiles for lead generation and market research.',
    content: [
      { type: 'heading', content: 'LinkedIn Data Scraping Guide' },
      { type: 'paragraph', content: 'This blueprint will guide you through creating a LinkedIn data scraper using ethical and legal methods.' },
      { type: 'heading', content: 'Prerequisites' },
      { type: 'list', items: ['Node.js installed', 'Basic JavaScript knowledge', 'LinkedIn account', 'Understanding of rate limiting'] },
      { type: 'heading', content: 'Step 1: Setup your project' },
      { type: 'code', language: 'bash', content: 'mkdir linkedin-scraper\ncd linkedin-scraper\nnpm init -y\nnpm install puppeteer axios cheerio' },
      { type: 'paragraph', content: 'These packages will help us navigate and parse LinkedIn pages.' },
      { type: 'heading', content: 'Step 2: Create the scraper script' },
      { type: 'code', language: 'javascript', content: 'const puppeteer = require("puppeteer");\n\nasync function scrapeLinkedIn(profileUrl) {\n  const browser = await puppeteer.launch({headless: false});\n  const page = await browser.newPage();\n  \n  // Login to LinkedIn first\n  await page.goto("https://www.linkedin.com/login");\n  await page.type("#username", "your-email@example.com");\n  await page.type("#password", "your-password");\n  await page.click("button[type=submit]");\n  await page.waitForNavigation();\n  \n  // Navigate to the profile\n  await page.goto(profileUrl);\n  await page.waitForSelector(".pv-top-card");\n  \n  // Extract data\n  const data = await page.evaluate(() => {\n    const name = document.querySelector(".pv-top-card .text-heading-xlarge").innerText;\n    const title = document.querySelector(".pv-top-card .text-body-medium").innerText;\n    const location = document.querySelector(".pv-top-card .text-body-small:last-child").innerText;\n    \n    return { name, title, location };\n  });\n  \n  await browser.close();\n  return data;\n}\n\nmodule.exports = { scrapeLinkedIn };' }
    ],
    is_verified: true,
    prompt: 'Create a blueprint for ethically scraping LinkedIn profile data for lead generation',
    clone_count: 42,
    steps_count: 8
  },
  {
    title: 'AI Content Moderator',
    details: 'An automated system to detect and filter inappropriate content using machine learning.',
    content: [
      { type: 'heading', content: 'Building an AI Content Moderator' },
      { type: 'paragraph', content: 'This blueprint will help you create an AI-powered content moderation system for text, images, and video.' },
      { type: 'heading', content: 'System Architecture' },
      { type: 'paragraph', content: 'The moderation system will use a combination of pre-trained models and custom classifiers to detect inappropriate content.' }
    ],
    is_verified: true,
    prompt: 'Create a blueprint for an AI-powered content moderation system',
    clone_count: 15,
    steps_count: 5
  },
  {
    title: 'Customer Support Chatbot',
    details: 'A conversational AI chatbot that handles customer inquiries and support tickets.',
    content: [
      { type: 'heading', content: 'Building a Customer Support Chatbot' },
      { type: 'paragraph', content: 'This blueprint guides you through creating an intelligent customer support chatbot using modern NLP techniques.' },
      { type: 'heading', content: 'Requirements' },
      { type: 'list', items: ['Node.js environment', 'OpenAI API key', 'Basic understanding of Express.js', 'Web hosting service'] }
    ],
    is_verified: false,
    prompt: 'Design a conversational AI chatbot for customer support',
    clone_count: 7,
    steps_count: 4
  }
];

// POST handler to insert seed data
export async function POST(request: Request) {
  try {
    // Get the current authenticated user, if we need it for user_id
    const { data: auth } = await supabase.auth.getSession();

    // Verify if user is allowed to execute this operation (in a real app)
    // For now, we'll proceed without authentication checking

    const results = [];
    
    // Insert each blueprint
    for (const blueprint of blueprints) {
      // Add user_id from the query param or a default
      const { error } = await supabase
        .from('blueprints')
        .insert({
          ...blueprint,
          // Use authenticated user if available, otherwise use the provided user ID or query param
          user_id: auth.session?.user?.id || request.headers.get('x-user-id') || 'a734ebba-3270-4a33-9078-2c27f61a6811'
        });
      
      if (error) {
        results.push({ title: blueprint.title, success: false, error: error.message });
      } else {
        results.push({ title: blueprint.title, success: true });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Blueprint seed data inserted successfully',
      results 
    });
  } catch (error) {
    console.error('Error seeding blueprints:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed blueprint data', error: (error as Error).message }, 
      { status: 500 }
    );
  }
}

// GET handler to provide instructions on using this endpoint
export async function GET() {
  try {
    // Get the current authenticated user
    const { data: auth } = await supabase.auth.getSession();

    // Check if we have blueprints for this user
    const { data, error } = await supabase
      .from('blueprints')
      .select('*')
      .eq('user_id', auth.session?.user?.id || 'a734ebba-3270-4a33-9078-2c27f61a6811')
      .limit(10);
    
    if (error) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Found ${data.length} blueprints`,
      data 
    });
  } catch (error) {
    console.error('Error fetching blueprints:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blueprint data', error: (error as Error).message }, 
      { status: 500 }
    );
  }
} 