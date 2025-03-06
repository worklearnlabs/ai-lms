// Run SQL migrations using the Supabase REST API
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables');
  process.exit(1);
}

// Function to run a SQL file
async function runMigration(filePath) {
  console.log(`Running migration: ${filePath}...`);
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL using fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response: ${responseText}`);
    
    if (!response.ok) {
      console.error(`Migration failed: ${filePath}`);
      return false;
    }
    
    console.log(`Migration completed successfully: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Unexpected error in migration: ${filePath}`, error);
    return false;
  }
}

// Function to check schema
async function checkSchema() {
  console.log('Checking users table schema...');
  
  try {
    // Get users table sample
    const response = await fetch(`${supabaseUrl}/rest/v1/users?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    
    const users = await response.json();
    console.log('Users table sample:', users);
    
    if (users && users.length > 0) {
      console.log('Users table columns:', Object.keys(users[0]));
    }
    
    // Check businesses table
    try {
      const businessesResponse = await fetch(`${supabaseUrl}/rest/v1/businesses?limit=1`, {
        method: 'GET',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      });
      
      if (businessesResponse.ok) {
        console.log('✅ Businesses table exists');
      } else {
        const errorText = await businessesResponse.text();
        if (errorText.includes('does not exist')) {
          console.log('❌ Businesses table does not exist');
        } else {
          console.log('Error checking businesses table:', errorText);
        }
      }
    } catch (error) {
      console.error('Error checking businesses table:', error);
    }
  } catch (error) {
    console.error('Unexpected error checking schema:', error);
  }
}

// Main function
async function runAllMigrations() {
  // List of migration files to run in order
  const migrations = [
    'src/lib/migrations/add-profile-fields.sql',
    'src/lib/migrations/create-business-table.sql',
    'src/lib/migrations/update-users-table.sql'
  ];
  
  // Run each migration
  for (const migration of migrations) {
    if (fs.existsSync(migration)) {
      const success = await runMigration(migration);
      if (!success) {
        console.error(`Migration chain stopped at ${migration}`);
        process.exit(1);
      }
    } else {
      console.log(`Migration file not found: ${migration}, skipping...`);
    }
  }
  
  console.log('All migrations completed successfully!');
  
  // Check schema after migrations
  await checkSchema();
}

// Run migrations
runAllMigrations(); 