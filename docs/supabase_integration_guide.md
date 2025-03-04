# Supabase Integration Guide

This document provides guidelines and best practices for using Supabase in the Adaptive Learning System project.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Database Operations](#database-operations)
4. [Common Issues and Solutions](#common-issues-and-solutions)
5. [Best Practices](#best-practices)

## Overview

Our application uses Supabase for:

- Authentication and user management
- Database storage (PostgreSQL)
- Real-time data synchronization

## Authentication

### Client Initialization

We use a singleton pattern to initialize the Supabase client to prevent multiple instances:

```typescript
// src/lib/supabase/client.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Create a singleton Supabase client
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// For backward compatibility
export const supabase = createClient();
```

**Important**: Always use the `createClient()` function to get the Supabase client instance. Do not create new instances directly with `createSupabaseClient()`.

### Authentication Flow

Our authentication is managed through the `AuthProvider` component:

1. **Sign In**:

   ```typescript
   const { signIn } = useAuth();
   await signIn(email, password);
   ```

2. **Sign Up**:

   ```typescript
   const { signUp } = useAuth();
   await signUp(email, password, firstName, lastName);
   ```

3. **Sign Out**:

   ```typescript
   const { signOut } = useAuth();
   await signOut();
   ```

4. **Access User Data**:
   ```typescript
   const { user } = useAuth();
   if (user) {
     // User is authenticated
     console.log(user.firstName);
   }
   ```

### Authentication Middleware

We use Next.js middleware to protect routes:

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // ...authentication logic...

  // Check for session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ...
}
```

## Database Operations

### User Data Structure

Our database uses snake_case for column names, while our application uses camelCase. The mapping is handled in the `fetchUserData` and `updateUserProfile` functions:

| Database Field (snake_case) | Application Field (camelCase) |
| --------------------------- | ----------------------------- |
| id                          | id                            |
| email                       | email                         |
| first_name                  | firstName                     |
| last_name                   | lastName                      |
| role                        | role                          |
| skill_level                 | skillLevel                    |
| learning_objectives         | learningObjectives            |
| preferred_learning_style    | preferredLearningStyle        |

### Fetching User Data

```typescript
// Example of fetching user data
const { data: userData, error: userError } = await supabase
  .from("users")
  .select("*")
  .eq("email", userEmail)
  .single();
```

### Updating User Data

When updating user data, always use the user's ID as the identifier:

```typescript
const { error } = await supabase
  .from("users")
  .update({
    first_name: firstName,
    last_name: lastName,
    skill_level: skillLevel,
    // other fields...
  })
  .eq("id", userId);
```

## Common Issues and Solutions

### Multiple Client Instances

**Issue**: The error "Multiple GoTrueClient instances detected in the same browser context" appears in the console.

**Solution**: Always use the singleton pattern from `createClient()` function instead of creating new instances.

### User Data Not Found

**Issue**: User exists in Supabase Auth but not in the database.

**Solution**: Our `fetchUserData` function now automatically creates a user profile if one doesn't exist:

```typescript
if (userError.code === "PGRST116") {
  // User exists in Auth but not in database yet, creating user profile
  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert([
      {
        id: userId,
        email: authData.user.email,
        first_name: firstName,
        last_name: lastName,
        role: "user",
      },
    ])
    .select()
    .single();
}
```

### Field Mapping Issues

**Issue**: Data from the database doesn't map correctly to the application's User interface.

**Solution**: Use explicit mapping between database fields and application fields:

```typescript
const mappedUser = {
  id: userId,
  email: userData.email,
  firstName: userData.first_name || "",
  lastName: userData.last_name || "",
  role: userData.role || "user",
  skillLevel: userData.skill_level || "",
  // other fields...
} as User;
```

## Best Practices

1. **Singleton Pattern**: Always use the singleton pattern for Supabase client initialization.

2. **Error Handling**: Always handle errors from Supabase operations:

   ```typescript
   const { data, error } = await supabase.from("users").select("*");
   if (error) {
     console.error("Error fetching users:", error);
     // Handle error appropriately
   }
   ```

3. **Field Mapping**: Be explicit about mapping between database fields (snake_case) and application fields (camelCase).

4. **Conditional Updates**: When updating user data, use `!== undefined` checks to allow setting empty values:

   ```typescript
   if (userData.firstName !== undefined)
     updateData.first_name = userData.firstName;
   ```

5. **Session Management**: Always check for an active session before performing authenticated operations.

6. **Logging**: Use detailed logging for debugging authentication and database issues.

7. **Environment Variables**: Ensure all Supabase environment variables are properly set in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
