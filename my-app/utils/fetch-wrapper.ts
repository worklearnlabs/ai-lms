/**
 * A wrapper around the fetch API that ensures credentials are included
 * and handles common error cases
 */
export async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Merge user options with required auth options
  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include', // Always include credentials
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    // Handle non-2XX responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Unknown error',
        status: response.status,
      }));
      
      throw new Error(
        errorData.error || `Request failed with status ${response.status}`
      );
    }

    // If the response is 204 No Content or similar
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    // Parse the JSON response
    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * Helper function for GET requests
 */
export function get<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return fetchWithAuth<T>(url, { ...options, method: 'GET' });
}

/**
 * Helper function for POST requests
 */
export function post<T = any>(
  url: string,
  data: any,
  options: RequestInit = {}
): Promise<T> {
  return fetchWithAuth<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Helper function for PUT requests
 */
export function put<T = any>(
  url: string,
  data: any,
  options: RequestInit = {}
): Promise<T> {
  return fetchWithAuth<T>(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Helper function for DELETE requests
 */
export function del<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return fetchWithAuth<T>(url, { ...options, method: 'DELETE' });
}

/**
 * Helper function for PATCH requests
 */
export function patch<T = any>(
  url: string,
  data: any,
  options: RequestInit = {}
): Promise<T> {
  return fetchWithAuth<T>(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
} 