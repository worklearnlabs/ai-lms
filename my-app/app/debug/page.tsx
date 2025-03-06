"use client";

import { useEffect, useState } from "react";
import { createClientSupabase } from "@/utils/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";

export default function DebugPage() {
  const [envInfo, setEnvInfo] = useState<{
    supabaseUrl?: string;
    supabaseAnonKeyPrefix?: string;
    hasAnon: boolean;
    hasService: boolean;
  }>({
    hasAnon: false,
    hasService: false
  });

  const [connectionStatus, setConnectionStatus] = useState<{
    pingSuccess?: boolean;
    authStatus?: string;
    error?: string;
    lastChecked?: string;
  }>({});

  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Check if environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    setEnvInfo({
      supabaseUrl,
      // Only show the first 6 characters of the key for security
      supabaseAnonKeyPrefix: supabaseAnonKey?.substring(0, 6) + "...",
      hasAnon: !!supabaseAnonKey,
      hasService: !!supabaseServiceKey
    });
  }, []);

  const testConnection = async () => {
    try {
      const supabase = createClientSupabase();
      const startTime = Date.now();
      
      // Simple health check
      const { data, error } = await supabase.from('users').select('count()', { count: 'exact' }).limit(0);
      
      const endTime = Date.now();
      const pingTime = endTime - startTime;
      
      if (error) {
        setConnectionStatus({
          pingSuccess: false,
          error: error.message,
          lastChecked: new Date().toISOString()
        });
      } else {
        // Check auth status
        const { data: { session } } = await supabase.auth.getSession();
        
        setConnectionStatus({
          pingSuccess: true,
          authStatus: session ? 'Authenticated' : 'Not authenticated',
          lastChecked: new Date().toISOString()
        });
      }
    } catch (err) {
      setConnectionStatus({
        pingSuccess: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      });
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">System Debug Information</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Supabase Configuration</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {envInfo.supabaseUrl || "Not set"}</p>
            <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {envInfo.hasAnon ? `${envInfo.supabaseAnonKeyPrefix} (partially hidden)` : "Not set"}</p>
            <p><strong>SUPABASE_SERVICE_ROLE_KEY:</strong> {envInfo.hasService ? "Set (hidden)" : "Not set"}</p>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Environment Status</h3>
            {envInfo.supabaseUrl && envInfo.hasAnon ? (
              <p className="text-green-600 dark:text-green-400">✅ All required environment variables are set</p>
            ) : (
              <p className="text-red-600 dark:text-red-400">❌ Missing one or more required environment variables</p>
            )}
          </div>
          
          <div className="mt-4">
            <Button onClick={testConnection}>Test Supabase Connection</Button>
            
            {connectionStatus.lastChecked && (
              <div className="mt-4 p-4 border rounded-md">
                <p><strong>Last Checked:</strong> {new Date(connectionStatus.lastChecked).toLocaleString()}</p>
                <p><strong>Connection:</strong> {connectionStatus.pingSuccess ? 
                  <span className="text-green-600 dark:text-green-400">✅ Successful</span> : 
                  <span className="text-red-600 dark:text-red-400">❌ Failed</span>}
                </p>
                {connectionStatus.authStatus && <p><strong>Auth Status:</strong> {connectionStatus.authStatus}</p>}
                {connectionStatus.error && <p className="text-red-600 dark:text-red-400"><strong>Error:</strong> {connectionStatus.error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        
        {isLoading ? (
          <p>Loading authentication state...</p>
        ) : user ? (
          <div className="grid grid-cols-1 gap-4">
            <p><strong>Logged in as:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Name:</strong> {user.full_name || "Not set"}</p>
            <pre className="bg-gray-200 dark:bg-gray-700 p-4 rounded-md mt-4 overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-yellow-600 dark:text-yellow-400">⚠️ Not authenticated</p>
        )}
      </div>
    </div>
  );
} 