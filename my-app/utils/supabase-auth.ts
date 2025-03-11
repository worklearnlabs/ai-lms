/**
 * Utility functions for handling Supabase authentication
 */

// Function to extract the Supabase token from cookies
export function extractSupabaseTokenFromCookies(cookieHeader: string): string | null {
  console.log('=== EXTRACTING TOKEN FROM COOKIES ===');
  console.log('Cookie header length:', cookieHeader.length);
  
  if (!cookieHeader) {
    console.log('No cookie header provided');
    return null;
  }
  
  try {
    // Parse the cookie header
    const cookies = parseCookieString(cookieHeader);
    
    // Log all available cookie names for diagnosis
    console.log('Available cookie names:', Object.keys(cookies).join(', '));
    
    // First check for known exact cookie names
    let supabaseCookie = cookies['sb-access-token'] || cookies['sb'];
    
    if (supabaseCookie) {
      console.log('Found Supabase cookie with standard name');
      return handleCookieValue(supabaseCookie);
    }
    
    // Look for cookies with the pattern sb-xxx-auth-token (project-specific name)
    const sbAuthCookieKey = Object.keys(cookies).find(key => 
      key.match(/^sb-.*-auth-token$/));
    
    if (sbAuthCookieKey) {
      console.log('Found Supabase auth cookie with project-specific name:', sbAuthCookieKey);
      supabaseCookie = cookies[sbAuthCookieKey];
      return handleCookieValue(supabaseCookie);
    }
    
    // Check for any cookie with 'sb' prefix as last resort
    const anySbCookieKey = Object.keys(cookies).find(key => key.startsWith('sb-'));
    
    if (anySbCookieKey) {
      console.log('Found cookie with sb- prefix as fallback:', anySbCookieKey);
      supabaseCookie = cookies[anySbCookieKey];
      return handleCookieValue(supabaseCookie);
    }
    
    console.log('No Supabase cookie found with any expected pattern');
    return null;
  } catch (error) {
    console.error('Error extracting Supabase token from cookies:', error);
    return null;
  }
}

// Helper function to handle cookie value processing
function handleCookieValue(cookieValue: string): string | null {
  if (!cookieValue) return null;
  
  console.log('Processing cookie value, length:', cookieValue.length);
  
  try {
    // If the cookie is JSON, try to extract the token from it
    if ((cookieValue.startsWith('{') && cookieValue.endsWith('}')) || 
        (cookieValue.startsWith('"') && cookieValue.endsWith('"'))) {
      try {
        const parsed = JSON.parse(cookieValue);
        console.log('Parsed cookie as JSON, keys:', Object.keys(parsed).join(', '));
        
        // Check for access_token in parsed JSON
        if (parsed.access_token) {
          console.log('Found access_token in JSON cookie');
          return parsed.access_token;
        }
      } catch (jsonError) {
        console.log('Failed to parse cookie as JSON, treating as raw value:', jsonError instanceof Error ? jsonError.message : 'Unknown error');
      }
    }
    
    // Handle base64 prefixed values
    if (cookieValue.startsWith('base64-')) {
      console.log('Cookie has base64- prefix, decoding...');
      const base64Content = cookieValue.replace('base64-', '');
      
      // Decode properly based on environment
      let decoded;
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        decoded = window.atob(base64Content);
      } else {
        decoded = Buffer.from(base64Content, 'base64').toString();
      }
      
      console.log('Decoded base64 content, length:', decoded.length);
      
      // Try to parse as JSON after decoding
      try {
        const parsed = JSON.parse(decoded);
        console.log('Successfully parsed decoded content as JSON');
        
        if (parsed.access_token) {
          console.log('Found access_token in decoded JSON');
          return parsed.access_token;
        }
        
        // Return the entire decoded JSON string if no access_token
        return decoded;
      } catch (jsonError) {
        console.log('Decoded content is not valid JSON, using as raw value:', jsonError instanceof Error ? jsonError.message : 'Unknown error');
        return decoded;
      }
    }
    
    // Return the raw cookie value
    return cookieValue;
  } catch (error) {
    console.error('Error processing cookie value:', error);
    return null;
  }
}

// Function to get user ID from token
export async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    console.log('=== GETTING USER ID FROM TOKEN ===');
    if (!token) {
      console.log('No token provided');
      return null;
    }

    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 30) + '...');

    // Try to parse the token as JSON first
    let tokenData;
    try {
      tokenData = JSON.parse(token);
      console.log('Successfully parsed token as JSON');
      console.log('JSON token keys:', Object.keys(tokenData).join(', '));
    } catch (error) {
      console.log('Token is not valid JSON, assuming it is a raw JWT:', error instanceof Error ? error.message : 'Unknown error');
      tokenData = null;
    }

    // If token is already a parsed JSON object
    if (tokenData && typeof tokenData === 'object') {
      // Extract all possible user IDs for debugging
      const possibleIds = {
        'direct user_id': tokenData.user_id,
        'sub claim': tokenData.sub,
        'user.id': tokenData.user?.id,
        'user.app_metadata.user_id': tokenData.user?.app_metadata?.user_id,
        'user.app_metadata.provider_id': tokenData.user?.app_metadata?.provider_id,
        'user.user_metadata.id': tokenData.user?.user_metadata?.id,
      };
      console.log('Possible user IDs in token:', JSON.stringify(possibleIds, null, 2));

      // Check for app_metadata.user_id (common pattern in Supabase)
      if (tokenData.user?.app_metadata?.user_id) {
        console.log('Found user_id in app_metadata:', tokenData.user.app_metadata.user_id);
        return tokenData.user.app_metadata.user_id;
      }
      
      // Check for app_metadata.provider_id as fallback
      if (tokenData.user?.app_metadata?.provider_id) {
        console.log('Found provider_id in app_metadata:', tokenData.user.app_metadata.provider_id);
        return tokenData.user.app_metadata.provider_id;
      }
      
      // Check for sub claim (standard JWT claim for subject)
      if (tokenData.sub) {
        console.log('Found sub claim in token:', tokenData.sub);
        return tokenData.sub;
      }
      
      // Check direct user_id property
      if (tokenData.user_id) {
        console.log('Found user_id property in token:', tokenData.user_id);
        return tokenData.user_id;
      }
      
      // If we have a user object, check its ID
      if (tokenData.user?.id) {
        console.log('Found user.id in token:', tokenData.user.id);
        return tokenData.user.id;
      }

      // Last resort: use Supabase client to get user
      if (tokenData.access_token || tokenData.token) {
        const accessToken = tokenData.access_token || tokenData.token;
        console.log('Found access_token, will try to get user with Supabase client');
        
        try {
          // Create temporary client for auth check
          const { createClient } = await import('@supabase/supabase-js');
          
          if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.log('Missing Supabase env variables');
            return null;
          }
          
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${accessToken}`
                }
              }
            }
          );
          
          const { data, error } = await supabase.auth.getUser();
          
          if (error) {
            console.error('Error getting user with access token:', error.message);
            return null;
          }
          
          if (data.user) {
            console.log('Successfully got user from Supabase:', data.user.id);
            return data.user.id;
          }
        } catch (clientError) {
          console.error('Error using Supabase client:', clientError);
        }
      }

      console.log('Could not find user ID in parsed token data');
      return null;
    }

    // For raw JWT tokens, we need to decode them
    if (!token.includes('.')) {
      console.log('Token does not appear to be a JWT (no dots found)');
      return null;
    }
    
    // JWT tokens have 3 parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('Token is not a valid JWT (does not have 3 parts)');
      return null;
    }

    console.log('Decoding JWT payload...');
    
    // Decode the payload (second part)
    let payload;
    try {
      // Decode base64
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedPayload = typeof window !== 'undefined' && typeof window.atob === 'function'
        ? window.atob(base64Payload)
        : Buffer.from(base64Payload, 'base64').toString();
      
      payload = JSON.parse(decodedPayload);
      console.log('Successfully decoded JWT payload');
      console.log('Payload keys:', Object.keys(payload).join(', '));
    } catch (error) {
      console.error('Error decoding JWT payload:', error);
      return null;
    }

    // Extract all possible user IDs for debugging
    const possibleJwtIds = {
      'direct user_id': payload.user_id,
      'sub claim': payload.sub,
      'id property': payload.id,
      'app_metadata.user_id': payload.app_metadata?.user_id,
      'app_metadata.provider_id': payload.app_metadata?.provider_id,
    };
    console.log('Possible user IDs in JWT payload:', JSON.stringify(possibleJwtIds, null, 2));
    
    // Look for user ID in various locations within the payload
    if (payload.app_metadata?.user_id) {
      console.log('Found user_id in app_metadata:', payload.app_metadata.user_id);
      return payload.app_metadata.user_id;
    }
    
    if (payload.app_metadata?.provider_id) {
      console.log('Found provider_id in app_metadata:', payload.app_metadata.provider_id);
      return payload.app_metadata.provider_id;
    }
    
    if (payload.sub) {
      console.log('Found sub claim in payload:', payload.sub);
      return payload.sub;
    }
    
    if (payload.user_id) {
      console.log('Found user_id in payload:', payload.user_id);
      return payload.user_id;
    }
    
    if (payload.id) {
      console.log('Found id in payload:', payload.id);
      return payload.id;
    }

    console.log('Could not find user ID in token payload');
    console.log('Available payload fields:', Object.keys(payload).join(', '));
    return null;
  } catch (error) {
    console.error('Error getting user ID from token:', error);
    return null;
  }
}

// Helper function to parse cookie string
function parseCookieString(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  const pairs = cookieString.split(';');
  
  for (const pair of pairs) {
    const [name, ...rest] = pair.trim().split('=');
    const value = rest.join('=');
    if (name) cookies[name] = value;
  }
  
  return cookies;
} 