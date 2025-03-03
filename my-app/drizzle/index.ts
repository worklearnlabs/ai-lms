import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// For environment variables
const connectionString = process.env.DATABASE_URL;

// Client for migrations and queries
export const migrationClient = postgres(connectionString!, { max: 1 });

// Client for query purposes
const queryClient = postgres(connectionString!);
export const db = drizzle(queryClient, { schema }); 