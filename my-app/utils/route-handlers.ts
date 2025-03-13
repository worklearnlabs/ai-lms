import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Type for the function that handles a route request
 */
type RouteHandler<ResponseData = any> = (
  req: NextRequest, 
  context: { 
    supabase: ReturnType<typeof createServerClient<Database>>,
    user?: User | null,
    params?: Record<string, string | string[]>
  }
) => Promise<NextResponse<ResponseData>>;

/**
 * Wraps a route handler with auth validation using Supabase
 * @param handler The route handler function
 * @param options Configuration options
 * @returns A function compatible with Next.js App Router
 */
export function withAuth<ResponseData = any>(
  handler: RouteHandler<ResponseData>,
  options: {
    requireAuth?: boolean;
  } = { requireAuth: true }
) {
  return async (
    req: NextRequest,
    context: { params?: Record<string, string | string[]> }
  ): Promise<NextResponse<ResponseData>> => {
    // Create a fresh Supabase client for this request
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => {
            return req.cookies.get(name)?.value;
          },
          set: (name, value, options) => {
            req.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove: (name, options) => {
            req.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Get the user
    const { data: { user } } = await supabase.auth.getUser();

    // Check if authentication is required but user is not authenticated
    if (options.requireAuth && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as NextResponse<ResponseData>;
    }

    // Call the handler with the context
    return handler(req, { 
      supabase, 
      user,
      params: context.params
    });
  };
}

/**
 * Creates a route handler with CORS support and optional auth validation
 * @param methods Allowed HTTP methods
 * @param handler The handler function
 * @param options Configuration options
 * @returns A function compatible with Next.js App Router
 */
export function createRouteHandler<ResponseData = any>(
  methods: string[],
  handler: RouteHandler<ResponseData>,
  options: {
    requireAuth?: boolean;
    allowedOrigins?: string[];
  } = { requireAuth: true, allowedOrigins: ['*'] }
) {
  return async (
    req: NextRequest,
    context: { params?: Record<string, string | string[]> }
  ): Promise<NextResponse<ResponseData>> => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return handleCors<ResponseData>(req, methods, options.allowedOrigins);
    }

    // Check if the method is allowed
    if (!methods.includes(req.method)) {
      return NextResponse.json(
        { error: `Method ${req.method} Not Allowed` },
        { status: 405 }
      ) as NextResponse<ResponseData>;
    }

    // Apply CORS headers to the response
    const corsResponse = handleCors<ResponseData>(req, methods, options.allowedOrigins);
    
    // Apply auth validation
    const authHandler = withAuth(handler, { requireAuth: options.requireAuth });
    const response = await authHandler(req, context);
    
    // Copy CORS headers to the final response
    for (const [key, value] of corsResponse.headers.entries()) {
      response.headers.set(key, value);
    }
    
    return response;
  };
}

/**
 * Handles CORS for a request
 * @param req The request object
 * @param methods Allowed HTTP methods
 * @param allowedOrigins Allowed origins
 * @returns A response with CORS headers
 */
function handleCors<ResponseData = any>(
  req: NextRequest,
  methods: string[],
  allowedOrigins: string[] = ['*']
): NextResponse<ResponseData> {
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  
  const response = NextResponse.json({} as ResponseData);
  
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

/**
 * @deprecated Use withAuth or createRouteHandler instead
 * Legacy wrapper for backward compatibility with existing API routes
 */
export async function withRouteAuth(req: NextRequest) {
  // Create a fresh Supabase client for this request
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          return req.cookies.get(name)?.value;
        },
        set: (name, value, options) => {
          req.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name, options) => {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get the user
  const { data: { user } } = await supabase.auth.getUser();

  // Return an object with auth information that matches the expected structure
  return {
    isAuthenticated: !!user,
    user,
    supabase,
    unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  };
} 