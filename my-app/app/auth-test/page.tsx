"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClientSupabase } from '@/utils/supabase';
import { testClientAuth } from '@/utils/tests';

// Define types for session data
interface SessionData {
  authenticated: boolean;
  user: {
    id: string;
    email: string | null | undefined;
  } | null;
  expires: number | null;
}

// Define types for API test result
interface ApiTestResult {
  success?: boolean;
  message?: string;
  error?: string;
  authenticated?: boolean;
  userId?: string;
  userEmail?: string;
  [key: string]: unknown; // Use unknown instead of any
}

export default function AuthTestPage() {
  const [sessionStatus, setSessionStatus] = useState<{
    loading: boolean;
    error: string | null;
    data: SessionData | null;
  }>({
    loading: true,
    error: null,
    data: null
  });

  const [apiTestResult, setApiTestResult] = useState<{
    loading: boolean;
    error: string | null;
    data: ApiTestResult | null;
  }>({
    loading: false,
    error: null,
    data: null
  });

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClientSupabase();
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setSessionStatus({
            loading: false,
            error: error.message,
            data: null
          });
          return;
        }
        
        setSessionStatus({
          loading: false,
          error: null,
          data: {
            authenticated: !!data.session,
            user: data.session?.user ? {
              id: data.session.user.id,
              email: data.session.user.email
            } : null,
            expires: data.session?.expires_at || null
          }
        });
      } catch (err) {
        setSessionStatus({
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          data: null
        });
      }
    }
    
    checkSession();
  }, []);

  const handleTestApi = async () => {
    setApiTestResult({
      loading: true,
      error: null,
      data: null
    });
    
    try {
      const response = await fetch('/api/auth/test', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      setApiTestResult({
        loading: false,
        error: null,
        data
      });
    } catch (err) {
      setApiTestResult({
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        data: null
      });
    }
  };

  const handleRunClientTest = () => {
    testClientAuth();
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
            <CardDescription>Current authentication status from client-side</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionStatus.loading ? (
              <div className="flex items-center justify-center h-40">
                <p>Loading session data...</p>
              </div>
            ) : sessionStatus.error ? (
              <div className="bg-red-50 p-4 rounded-md text-red-800">
                <p className="font-semibold">Error checking session:</p>
                <p>{sessionStatus.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${sessionStatus.data?.authenticated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {sessionStatus.data?.authenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
                
                {sessionStatus.data?.authenticated && sessionStatus.data.user && (
                  <>
                    <div>
                      <p className="font-semibold">User ID:</p>
                      <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">{sessionStatus.data.user.id}</p>
                    </div>
                    
                    <div>
                      <p className="font-semibold">Email:</p>
                      <p>{sessionStatus.data.user.email}</p>
                    </div>
                    
                    {sessionStatus.data.expires && (
                      <div>
                        <p className="font-semibold">Session Expires:</p>
                        <p>{new Date(sessionStatus.data.expires * 1000).toLocaleString()}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Refresh Session</Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>API Test</CardTitle>
            <CardDescription>Test the authentication with API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleTestApi} disabled={apiTestResult.loading}>
                {apiTestResult.loading ? 'Testing...' : 'Test API Authentication'}
              </Button>
              
              {apiTestResult.error && (
                <div className="bg-red-50 p-4 rounded-md text-red-800">
                  <p className="font-semibold">Error testing API:</p>
                  <p>{apiTestResult.error}</p>
                </div>
              )}
              
              {apiTestResult.data && (
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(apiTestResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleRunClientTest}>
              Run Console Test
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 