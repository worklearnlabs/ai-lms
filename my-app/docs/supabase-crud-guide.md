# Supabase CRUD Operations Guide for Next.js Applications

This guide covers how to perform CRUD (Create, Read, Update, Delete) operations with Supabase in a Next.js application, focusing on best practices and common patterns.

## Table of Contents

1. [Setup and Authentication](#1-setup-and-authentication)
2. [Create Operations](#2-create-operations)
3. [Read Operations](#3-read-operations)
4. [Update Operations](#4-update-operations)
5. [Delete Operations](#5-delete-operations)
6. [Error Handling](#6-error-handling)
7. [Best Practices](#7-best-practices)

## 1. Setup and Authentication

### Client Setup

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Client-side Supabase client
export const createClientSupabase = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Server-side Supabase client
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Authentication in API Routes

```typescript
// Example of token-based authentication in an API route
import { createClientSupabase } from "@/src/lib/supabase/client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Get auth token from header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization token" },
      { status: 401 }
    );
  }

  const token = authHeader.split(" ")[1];
  const supabase = createClientSupabase();

  // Verify the token
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }

  // Continue with authenticated operations...
}
```

## 2. Create Operations

### Inserting a Single Record

```typescript
async function createUser(userData) {
  const supabase = createClientSupabase();

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        id: userData.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) throw error;
  return data;
}
```

### Inserting with Returning Data

```typescript
// Insert and return the created record
const { data, error } = await supabase
  .from("users")
  .insert([userData])
  .select();
```

### Upserting (Insert or Update)

```typescript
// Will insert if no record with matching key exists, otherwise update
const { data, error } = await supabase.from("users").upsert(
  {
    id: userId,
    email: userEmail,
    first_name: firstName,
    updated_at: new Date().toISOString(),
  },
  {
    onConflict: "id", // specify the conflict resolution field
    returning: "minimal", // or 'representation' to get data back
  }
);
```

## 3. Read Operations

### Fetching a Single Record

```typescript
async function getUserById(userId) {
  const supabase = createClientSupabase();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found
      return null;
    }
    throw error;
  }

  return data;
}
```

### Fetching Multiple Records with Filtering

```typescript
async function getUsersBySkillLevel(skillLevel) {
  const supabase = createClientSupabase();

  const { data, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, skill_level")
    .eq("skill_level", skillLevel);

  if (error) throw error;
  return data || [];
}
```

### Complex Queries

```typescript
// With pagination, ordering and filtering
const { data, error } = await supabase
  .from("users")
  .select("*, courses(*)") // Include related data
  .eq("is_active", true)
  .gte("created_at", startDate)
  .order("last_name", { ascending: true })
  .range(0, 9); // First 10 records (0-9)
```

## 4. Update Operations

### Updating by ID

```typescript
async function updateUser(userId, userData) {
  const supabase = createClientSupabase();

  const { error } = await supabase
    .from("users")
    .update({
      first_name: userData.firstName,
      last_name: userData.lastName,
      skill_level: userData.skillLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
  return { success: true };
}
```

### Updating Multiple Records

```typescript
// Update all users with a certain skill level
const { data, error } = await supabase
  .from("users")
  .update({ has_access: true })
  .eq("skill_level", "advanced");
```

### Conditional Updates

```typescript
// Update only if a condition is met
const { data, error } = await supabase
  .from("users")
  .update({ status: "active" })
  .eq("id", userId)
  .eq("status", "pending"); // Only update if status is currently 'pending'
```

## 5. Delete Operations

### Deleting a Single Record

```typescript
async function deleteUser(userId) {
  const supabase = createClientSupabase();

  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) throw error;
  return { success: true };
}
```

### Soft Delete (Recommended)

```typescript
// Instead of actually deleting records, mark them as deleted
const { error } = await supabase
  .from("users")
  .update({
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  })
  .eq("id", userId);
```

### Deleting Multiple Records

```typescript
// Delete all inactive users created before a certain date
const { error } = await supabase
  .from("users")
  .delete()
  .eq("is_active", false)
  .lt("created_at", cutoffDate);
```

## 6. Error Handling

### Common Error Patterns

```typescript
try {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Record not found - this is a specific Postgrest error code
      console.log("User not found");
      return null;
    }

    // Database constraint errors
    if (error.code === "23505") {
      // Unique violation
      throw new Error("A user with this email already exists");
    }

    if (error.code === "23503") {
      // Foreign key violation
      throw new Error("Referenced record does not exist");
    }

    // Default error handling
    console.error("Database error:", error);
    throw new Error("An unexpected error occurred");
  }

  return data;
} catch (error) {
  console.error("Error in getUserByEmail:", error);
  throw error;
}
```

## 7. Best Practices

### 1. Use Type Safety

Define interfaces for your database tables:

```typescript
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  skill_level: "beginner" | "intermediate" | "advanced";
  learning_objectives: string | null;
  created_at: string;
  updated_at: string;
}
```

### 2. Handle Email Check Correctly

When checking if a user exists by email:

```typescript
const { data, error } = await supabase
  .from("users")
  .select("id")
  .eq("email", email)
  .single();

if (error && error.code !== "PGRST116") {
  throw error;
}

const userExists = !!data;
```

### 3. Timestamp Management

Always include created/updated timestamps:

```typescript
const now = new Date().toISOString();

const newRecord = {
  ...data,
  created_at: now,
  updated_at: now,
};

// For updates
const updateData = {
  ...data,
  updated_at: new Date().toISOString(),
};
```

### 4. Transaction Management

For operations that affect multiple tables:

```typescript
const { error } = await supabase.rpc("create_user_with_profile", {
  user_data: {
    email: email,
    first_name: firstName,
  },
  profile_data: {
    bio: bio,
    avatar_url: avatarUrl,
  },
});
```

### 5. Database Constraints vs. Application Logic

Rely on database constraints for data integrity, but also validate in your application:

```typescript
// Client-side validation
function validateUserData(userData) {
  if (!userData.email || !userData.email.includes("@")) {
    throw new Error("Valid email is required");
  }

  if (!userData.firstName || userData.firstName.length < 2) {
    throw new Error("First name must be at least 2 characters");
  }

  return true;
}
```

### 6. API Route Pattern for CRUD

Structure your API routes consistently:

```
/api/users - GET (list), POST (create)
/api/users/[id] - GET (read), PUT (update), DELETE (delete)
/api/users/search - GET (custom search)
```

## Real-World Example: Profile Update

Below is a real-world example of updating a user profile with proper error handling and email uniqueness checking:

```typescript
// my-app/app/api/profile/update/route.ts
import { createClientSupabase } from "@/src/lib/supabase/client";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const supabase = createClientSupabase();

    // Verify the token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError || "No user found");
      return NextResponse.json(
        { error: "Authentication failed. Please log in again." },
        { status: 401 }
      );
    }

    const data = await request.json();
    const userId = user.id;
    const userEmail = user.email || "";

    // Update fields to save
    const updateFields = {
      first_name: data.firstName,
      last_name: data.lastName,
      skill_level: data.skillLevel,
      learning_objectives: data.learningObjectives,
      updated_at: new Date().toISOString(),
    };

    // Check if user exists by email first (most reliable way)
    const { data: existingUserByEmail, error: emailCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("email", userEmail)
      .single();

    if (emailCheckError && emailCheckError.code !== "PGRST116") {
      console.error("Error checking user by email:", emailCheckError);
      return NextResponse.json(
        { error: emailCheckError.message },
        { status: 500 }
      );
    }

    if (existingUserByEmail) {
      // User exists with this email, update by that record's ID
      console.log(
        "Found existing user by email, updating:",
        existingUserByEmail.id
      );
      const { error: updateError } = await supabase
        .from("users")
        .update(updateFields)
        .eq("id", existingUserByEmail.id);

      if (updateError) {
        console.error("Error updating user:", updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // User doesn't exist at all, create new
      console.log("No existing user found, creating new record");
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: userId,
          email: userEmail,
          ...updateFields,
        },
      ]);

      if (insertError) {
        console.error("Error inserting user:", insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      email: userEmail,
      fields: Object.keys(updateFields),
    });
  } catch (error) {
    console.error("Unexpected error during profile update:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
```

These patterns should help you build robust CRUD operations in your Next.js application with Supabase!
