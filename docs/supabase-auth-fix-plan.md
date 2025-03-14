# Supabase Auth Implementation Plan

## Plan Status Update (March 2025)

**Implementation Status**: Completed with different approach  
**Issue Resolution**: Fixed schema mismatch instead of auth issues  
**Summary**: During implementation, we discovered the root issue was a database schema mismatch rather than auth problems. The original plan below is preserved for reference, but see the "Actual Implementation" section at the end for details on what was actually fixed.

---

## Original Plan - Authentication Fix

### Current Issues Assessment

Based on the logs and code provided, we're experiencing authentication failures in `/api/blueprints/questions/responses` with "Auth session missing!" errors. The main issue appears to be how Supabase auth sessions are being managed across API requests.

## Phase 1: Create Parallel Auth Implementation (Non-Invasive)

### 1. Create Necessary Utility Files

```typescript
// utils/supabase/server.ts - Create a standardized server-side client
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          cookieStore.set(name, value, options);
        },
        remove: (name, options) => {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}
```

```typescript
// utils/supabase/client.ts - Client-side Supabase instance
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// utils/supabase/middleware.ts - Session refresh middleware
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return request.cookies.get(name)?.value;
        },
        set: (name, value, options) => {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // This will refresh the session if it's expired
  await supabase.auth.getUser();

  return response;
}
```

### 2. Add Next.js Middleware

```typescript
// middleware.ts (at project root)
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## Phase 2: Fix API Routes Without Changing Current Implementation

Create a wrapper function for API handlers that ensures auth is properly maintained:

```typescript
// utils/api-wrappers.ts
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export function withSupabaseAuth(handler) {
  return async (req, res) => {
    // Create a Supabase client with the request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => {
            return req.cookies[name];
          },
        },
      }
    );

    // Get the user - this validates the session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Attach the supabase client to the request
    req.supabase = supabase;
    req.user = user;

    // Call the original handler
    return handler(req, res);
  };
}
```

### 3. Apply the Wrapper to the Failing API Routes

```typescript
// api/blueprints/questions/responses.ts
import { withSupabaseAuth } from "@/utils/api-wrappers";

// Your existing handler
async function handler(req, res) {
  // Now you can use req.supabase and req.user without auth errors
  // ...existing code...
}

// Export the wrapped handler
export default withSupabaseAuth(handler);
```

## Phase 3: Fix Client-Side Blueprint Modal Component

Update the `saveResponseToDatabase` function in `create-blueprint-modal.tsx`:

```typescript
const saveResponseToDatabase = async (
  blueprintId: string,
  questionId: string,
  response: string
): Promise<boolean> => {
  // Input validation (keep existing)

  // Always update local state first (keep existing)

  // Add credentials: 'include' to ensure cookies are sent
  const saveResponse = await fetch("/api/blueprints/questions/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    credentials: "include", // <-- Add this
    body: JSON.stringify({
      blueprint_id: blueprintId,
      responses: {
        [questionId]: response,
      },
    }),
  });

  // Rest of the function remains the same
};
```

## Phase 4: Testing Plan

1. Implement changes in a feature branch
2. Test the blueprint creation flow completely:
   - Create blueprint with initial prompt
   - Submit responses to all generated questions
   - Verify responses are properly saved
   - Generate final blueprint

## Phase 5: Full Migration (After Validation)

If the parallel implementation works well, gradually migrate other API routes to use the new pattern.

## Implementation Strategy

1. **Start with Phase 1 and 2** - Create the utility files and middleware as non-invasive additions.
2. **Test the API wrapper** on just the `/api/blueprints/questions/responses` endpoint first.
3. **Add the `credentials: 'include'`** to the client-side fetch calls.
4. **Test thoroughly** before moving to other endpoints.

## Expected Outcomes

1. Session tokens will be properly refreshed by the middleware.
2. API routes will consistently have access to the authenticated user.
3. Auth errors during blueprint creation will be eliminated.
4. The changes are minimally invasive and contained to specific files.

## Important Considerations

- This approach follows Supabase's recommended patterns from their latest documentation
- It maintains backward compatibility with your existing code
- It implements the cookie-based auth flow that Supabase recommends for Next.js applications
- The parallel implementation allows for gradual adoption and fallback if needed

---

## Actual Implementation: Database Schema Mismatch Fix

### The Real Issue

During implementation, we discovered that the core issue was not related to authentication but rather a database schema mismatch affecting the blueprint creation process:

1. **Schema Discrepancy**: The database had a `details` field for blueprints, but no `description` field.
2. **Code Mismatch**: Parts of our codebase were attempting to:
   - Write to a non-existent `description` column
   - Inconsistently prioritize between `description` and `details` when reading data

This caused errors such as:

```
Error updating blueprint: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'description' column of 'blueprints' in the schema cache"
}
```

### Implemented Fixes

1. **API Route Fix**: Modified `my-app/app/api/blueprints/questions/route.ts` to remove references to the non-existent `description` field:

   ```typescript
   // Before
   const { data: updatedBlueprint, error: updateError } = await serviceClient
     .from("blueprints")
     .update({
       title: title,
       prompt: promptToUse,
       details: description,
       description: description, // This was causing the error
       ...(shouldUpdateUserId ? { user_id: applicationUserId } : {}),
     })
     .eq("id", blueprint_id)
     .select();

   // After
   const { data: updatedBlueprint, error: updateError } = await serviceClient
     .from("blueprints")
     .update({
       title: title,
       prompt: promptToUse,
       details: description,
       ...(shouldUpdateUserId ? { user_id: applicationUserId } : {}),
     })
     .eq("id", blueprint_id)
     .select();
   ```

2. **Frontend Logic Fix**: Updated the `processLoadedBlueprint` function in `create-blueprint-modal.tsx` to prioritize the `details` field to align with the database schema:

   ```typescript
   // Before
   setDescription(data.description || data.details || "");
   // and
   description: data.description || data.details,

   // After
   setDescription(data.details || data.description || "");
   // and
   description: data.details || data.description,
   ```

### Blueprint Creation Process

The blueprint creation process now works correctly:

1. **Initial Blueprint Creation**:

   - When a user enters a prompt, we generate a title using the dedicated `/api/blueprints/generate-title` endpoint
   - We create a minimal blueprint with an empty details field initially

2. **Questions and Description Generation**:

   - We immediately call the `/api/blueprints/questions` endpoint with the new blueprint ID
   - This endpoint returns questions, but importantly also returns:
     - `blueprint_title` - A title for the blueprint
     - `blueprint_description` - A description for the blueprint

3. **Blueprint Update**:
   - Once we have the description from the questions API, we update the blueprint using a POST request to `/api/blueprints`
   - We properly store this in the `details` field of the database
   - As a fallback, we store the description in localStorage if the update fails

### Root Cause Analysis

The schema inconsistency arose from:

1. **Documentation Discrepancy**: Inconsistencies in how the schema was documented:

   - Official documentation in `blueprint_system_schema.md` showed the column as `details`
   - Type definition in `types/schema.ts` defined both `description` and new fields
   - Drizzle schema defined the column as `description`

2. **Code/DB Mismatch**: The code attempted to use both field names, but the database only had a `details` field.

### Lessons Learned

1. **Schema Validation**: Ensure database schema definitions are consistent across documentation and code.
2. **Field Naming Consistency**: Use consistent field names throughout the codebase.
3. **Error Diagnosis**: Look beyond the obvious error messages to understand the root cause.
4. **Type Safety**: Consider adding stronger type checking to prevent field name mismatches.

The original authentication improvement plan remains valid and may be implemented later if auth issues arise, but resolving this schema mismatch was more critical for blueprint functionality.
