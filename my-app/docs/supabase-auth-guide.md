# Supabase Authentication Guide

This document provides an overview of the authentication system in our application.

## Authentication Flow

Our authentication system uses Supabase's cookie-based auth flow for Next.js applications, following the official Supabase SSR (Server-Side Rendering) pattern.

### Key Components

1. **Middleware**: Handles session refreshing and route protection
2. **Server Utilities**: Create authenticated Supabase clients for server components and API routes
3. **Client Utilities**: Create authenticated Supabase clients for client components
4. **Route Handlers**: Wrappers for API routes to ensure authentication

## Usage Guide

### Client-Side Authentication

For client components, use the browser client:

```tsx
import { supabaseClient } from "@/utils/supabase/client";

// In a React component
const signIn = async () => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: "user@example.com",
    password: "password",
  });

  if (error) {
    console.error("Error signing in:", error.message);
    return;
  }

  // Redirect or update UI
};
```

### Server-Side Authentication

For server components, use the server client:

```tsx
import { createServerSupabaseClient } from "@/utils/supabase/server";

// In a Server Component
export default async function Profile() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Render authenticated content
  return <div>Hello, {user.email}</div>;
}
```

### API Routes

For API routes, use the route handlers:

```tsx
import { createRouteHandler } from "@/utils/route-handlers";

export const GET = createRouteHandler(
  ["GET"],
  async (req, { supabase, user }) => {
    // Your authenticated logic here

    return NextResponse.json({
      message: "Success",
      user: user?.email,
    });
  }
);
```

### Making Authenticated Fetch Calls

Always use the fetch wrapper to ensure cookies are sent:

```tsx
import { get, post } from "@/utils/fetch-wrapper";

// In a component
const fetchData = async () => {
  try {
    // GET request
    const data = await get("/api/endpoint");

    // POST request
    const result = await post("/api/endpoint", { key: "value" });

    // Handle the response
  } catch (error) {
    // Handle errors
  }
};
```

## Middleware Configuration

Our middleware:

1. Refreshes the Supabase session on each request
2. Protects authenticated routes (redirects to login if not authenticated)
3. Redirects authenticated users away from login/register pages
4. Syncs the authenticated user to our database

## Important Considerations

1. Always use the provided utilities instead of creating new Supabase clients
2. Include `credentials: 'include'` in all fetch calls to APIs
3. Use the route handlers for new API endpoints to ensure consistent authentication
4. Remember that middleware only runs on matched routes (see `middleware.ts` for configuration)

## Troubleshooting

Common issues:

1. **"Auth session missing" errors**: Ensure you're using the provided fetch wrapper or including credentials in your fetch calls
2. **Redirect loops**: Check middleware configuration for conflicting rules
3. **Session not persisting**: Verify that cookies are not being blocked or cleared

If you encounter persistent auth issues, check the browser console and server logs for more specific error messages.

## Migration Notes

This auth system replaces our previous implementation. The key improvements include:

1. Consistent session management across all request types
2. Proper cookie handling for authentication
3. Simplified API for creating authenticated clients
4. Better alignment with Supabase's recommended patterns
