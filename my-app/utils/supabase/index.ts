/**
 * Supabase Authentication Utilities
 * 
 * This file exports all the authentication-related utilities in a clean API.
 * Use these functions for consistent authentication across the application.
 */

// Client-side utilities
export { createBrowserSupabaseClient, supabaseClient } from './client';

// Server-side utilities
export { createServerSupabaseClient } from './server';

// Middleware utilities
export { updateSession } from './middleware'; 