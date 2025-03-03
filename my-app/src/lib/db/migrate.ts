import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// This script runs migrations programmatically
async function main() {
  console.log('Running migrations...');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // For migrations, we need a different client configuration
  const migrationClient = postgres(connectionString, { max: 1 });
  
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: './drizzle/migrations',
    });
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await migrationClient.end();
  }
}

// Run the migration script
main(); 