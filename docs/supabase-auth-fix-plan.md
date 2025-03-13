# Supabase Auth Implementation Plan

## Current Issues Assessment

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
