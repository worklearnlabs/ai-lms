import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get database connection string from environment variables
const getConnectionString = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  return connectionString;
};

// Create a database client for queries
export const createDbClient = () => {
  const connectionString = getConnectionString();
  const client = postgres(connectionString);
  return drizzle(client);
};

// Run migrations programmatically
export const runMigrations = async () => {
  console.log('Running migrations...');
  
  const connectionString = getConnectionString();
  
  // For migrations, we need a different client configuration
  const migrationClient = postgres(connectionString, { max: 1 });
  
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: './drizzle/migrations',
    });
    
    console.log('Migrations completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  } finally {
    // Close the connection
    await migrationClient.end();
  }
};

// Migration script entry point
export const runMigrationsScript = async () => {
  try {
    const success = await runMigrations();
    if (!success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}; 