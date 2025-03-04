import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filePath: string) {
  console.log(`Running migration: ${filePath}`);
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`SQL content length: ${sql.length} characters`);
    
    // Execute the SQL using Supabase client
    const { data, error } = await supabase.rpc('pgmigrate', { query: sql });
    
    if (error) {
      console.error(`Migration failed: ${filePath}`, error);
      
      // Try alternative approach with REST API
      console.log('Trying alternative approach with REST API...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        },
        body: JSON.stringify({ query: sql })
      });
      
      console.log(`Response status: ${response.status}`);
      const responseText = await response.text();
      console.log(`Raw response: ${responseText}`);
      
      try {
        const result = JSON.parse(responseText);
        if (result.error) {
          console.error('Alternative approach also failed:', result.error);
          return false;
        }
        console.log('Alternative approach succeeded');
        return true;
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        return false;
      }
    }
    
    console.log(`Migration completed successfully: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Unexpected error in migration: ${filePath}`, error);
    return false;
  }
}

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

async function checkSchema() {
  console.log('Checking database schema...');
  
  try {
    // Query to get table columns
    const { data: columns, error: columnsError } = await supabase.rpc('pgmigrate', { 
      query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;" 
    });
    
    if (columnsError) {
      console.error('Error checking schema:', columnsError);
      
      // Try alternative approach
      console.log('Trying alternative approach for schema check...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        },
        body: JSON.stringify({ 
          query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;" 
        })
      });
      
      const responseText = await response.text();
      console.log(`Schema check raw response: ${responseText}`);
    } else {
      console.log('Users table schema:', columns);
    }
    
    // Check businesses table
    const { data: businessesData, error: businessesError } = await supabase.rpc('pgmigrate', { 
      query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses');" 
    });
    
    if (businessesError) {
      console.error('Error checking businesses table:', businessesError);
      
      // Try alternative approach
      console.log('Trying alternative approach for businesses check...');
      const businessesResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
        },
        body: JSON.stringify({ 
          query: "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses');" 
        })
      });
      
      const businessesResponseText = await businessesResponse.text();
      console.log(`Businesses table check raw response: ${businessesResponseText}`);
    } else {
      console.log('Businesses table exists:', businessesData);
    }
  } catch (error) {
    console.error('Unexpected error checking schema:', error);
  }
}

// Run the migrations
runAllMigrations(); 