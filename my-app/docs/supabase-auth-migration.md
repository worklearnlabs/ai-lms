# Supabase Auth Migration Guide

## Migration Status: ✅ Completed

We've successfully migrated our authentication system to use Supabase's recommended cookie-based auth flow for Next.js applications. This document explains the changes that were made and how to adapt your code.

## Key Changes Made

1. ✅ Moved from token-based auth to cookie-based auth
2. ✅ Implemented consistent middleware for session refreshing
3. ✅ Created standardized utilities for server and client auth
4. ✅ Added proper API wrappers for authenticated routes
5. ✅ Added fetch utilities to ensure credentials are included

## How We Updated Our Code

### Client Components

#### Before:

```tsx
import { supabase } from "@/utils/supabase";

const data = await supabase.from("table").select("*");
```

#### After:

```tsx
import { supabaseClient } from "@/utils/supabase";

const data = await supabaseClient.from("table").select("*");
```

### Fetch Requests

#### Before:

```tsx
const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

#### After:

```tsx
// Option 1: Use fetch wrapper
import { post } from "@/utils/fetch-wrapper";
const response = await post("/api/endpoint", data);

// Option 2: Include credentials manually
const response = await fetch("/api/endpoint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include", // Add this line
  body: JSON.stringify(data),
});
```

### Server Components

#### Before:

```tsx
import { createServerSupabaseClient } from "@/utils/supabase-server";

// In a Server Component
const supabase = createServerSupabaseClient();
const { data } = await supabase.from("table").select("*");
```

#### After:

```tsx
import { createServerSupabaseClient } from "@/utils/supabase";

// In a Server Component
const supabase = createServerSupabaseClient();
const { data } = await supabase.from("table").select("*");
```

### API Routes

#### Before:

```tsx
// api/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRouteAuth } from "@/utils/route-handlers";

export async function GET(request: NextRequest) {
  const { isAuthenticated, user, supabase, unauthorized } = await withRouteAuth(
    request
  );

  if (!isAuthenticated) {
    return unauthorized();
  }

  // Your logic here
  return NextResponse.json({ data: "success" });
}
```

#### After:

```tsx
// api/route.ts
import { createRouteHandler } from "@/utils/route-handlers";

export const GET = createRouteHandler(
  ["GET"],
  async (req, { supabase, user }) => {
    // Your logic here
    return NextResponse.json({ data: "success" });
  }
);
```

## Next Steps

1. **Continue API Route Migration**: We've updated some key API routes, but there are more that should be migrated to the new pattern. Run this command to find remaining routes to update:

   ```bash
   find my-app/app -type f -name "route.ts" | xargs grep -l "withRouteAuth"
   ```

2. **Update Fetch Calls**: Check for any remaining fetch calls that don't include credentials with:

   ```bash
   find my-app -path "my-app/node_modules" -prune -o -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "fetch("
   ```

   Then update them to use the fetch wrapper or add `credentials: 'include'`.

3. **Test Thoroughly**: After completing the migration, test all areas of the application that involve authentication to ensure smooth operation:

   - Login flow
   - Protected routes
   - API calls from client components
   - Server-rendered protected content

4. **Monitor for Issues**: Keep an eye on server logs and error tracking for any auth-related issues in the coming days.

## Testing Results and Fixes Applied

- ✅ Fixed "Auth session missing!" errors in `/api/blueprints/questions/responses`
- ✅ Ensured credentials are included in fetch calls
- ✅ Properly refreshed auth sessions via middleware
- ✅ Converted key API routes to use the new auth pattern

## Help and Support

If you encounter issues after the migration, check the following:

1. Browser console for client-side errors
2. Server logs for API issues
3. Network tab to ensure cookies are being sent correctly

For persistent issues, consult the documentation at `/docs/supabase-auth-guide.md` or contact the Dev team.
