// Simple script to test OpenAI API key
import OpenAI from 'openai';

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

console.log('Testing OpenAI connection...');
console.log('API key status:', apiKey ? 'Provided (non-empty)' : 'Missing or empty');

async function testOpenAI() {
  try {
    // Initialize the client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Try a simple call
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Using a simpler model for the test
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "API key is working correctly!" in a JSON format.' }
      ],
      max_tokens: 50
    });

    // Log the response
    console.log('OpenAI API Response:');
    console.log(JSON.stringify(response.choices[0].message, null, 2));
    console.log('API call successful!');
    return true;
  } catch (error) {
    console.error('OpenAI API Error:');
    console.error(error.message);
    if (error.message.includes('API key')) {
      console.error('This appears to be an API key issue. Check your OPENAI_API_KEY environment variable.');
    }
    return false;
  }
}

// Run the test
testOpenAI().then(success => {
  console.log('Test completed. Result:', success ? 'SUCCESS' : 'FAILED');
  process.exit(success ? 0 : 1);
}); 