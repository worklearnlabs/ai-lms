// This file is for testing the seed endpoint
// You can run it with: 
// npx ts-node app/api/blueprints/seed/test-client.ts

async function seedBlueprints() {
  try {
    // Replace with your actual API URL when testing
    const response = await fetch('http://localhost:3000/api/blueprints/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optionally provide a user ID 
        // 'x-user-id': 'your-user-id-here'
      }
    });

    const data = await response.json();
    console.log('Seed operation results:', data);
    
    if (data.success) {
      console.log('✅ Blueprints seeded successfully!');
      console.log('Results:', data.results);
    } else {
      console.error('❌ Failed to seed blueprints:', data.error);
    }
  } catch (error) {
    console.error('Error executing seed request:', error);
  }
}

// Automatically run when executed directly
if (require.main === module) {
  seedBlueprints().catch(console.error);
}

export { seedBlueprints }; 