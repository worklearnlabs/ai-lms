import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../../../drizzle/schema';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the database connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// For server-side usage only - don't expose this client in the browser
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

// Helper function to get all users
export async function getAllUsers() {
  return await db.select().from(schema.users);
}

// Helper function to get a user by ID
export async function getUserById(id: number) {
  return await db.select().from(schema.users).where(eq(schema.users.id, id));
}

// Helper function to get a user by email
export async function getUserByEmail(email: string) {
  return await db.select().from(schema.users).where(eq(schema.users.email, email));
}

// Helper function to create a new user
export async function createUser(user: {
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  skillLevel?: string;
  experience?: string;
  learningObjectives?: string;
  preferredLearningStyle?: string;
}) {
  return await db.insert(schema.users).values(user).returning();
}

// Helper function to update a user
export async function updateUser(
  id: number,
  user: Partial<{
    fullName: string;
    email: string;
    phone: string;
    role: string;
    skillLevel: string;
    experience: string;
    learningObjectives: string;
    preferredLearningStyle: string;
  }>
) {
  return await db.update(schema.users).set(user).where(eq(schema.users.id, id)).returning();
}

// Helper function to delete a user
export async function deleteUser(id: number) {
  return await db.delete(schema.users).where(eq(schema.users.id, id)).returning();
} 