"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// The blueprint ID that was failing
const DEFAULT_BLUEPRINT_ID = "6b9b3fe0-b987-48b5-b80b-7fbfa30227e6";

export default function BlueprintDebugPage() {
  const [blueprintId, setBlueprintId] = useState<string>(DEFAULT_BLUEPRINT_ID);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [headResult, setHeadResult] = useState<any>(null);
  const [headError, setHeadError] = useState<string | null>(null);

  const testHeadRequest = async () => {
    setLoading(true);
    setHeadResult(null);
    setHeadError(null);
    
    try {
      const response = await fetch(`/api/blueprints/${blueprintId}`, {
        method: 'HEAD',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Debug-Client': 'debug-test-page'
        }
      });
      
      // Extract all headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      setHeadResult({
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers
      });
    } catch (err) {
      console.error('HEAD Request Error:', err);
      setHeadError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testGetRequest = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const response = await fetch(`/api/blueprints/${blueprintId}?_t=${Date.now()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Debug-Client': 'debug-test-page'
        }
      });
      
      // Extract all headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult({
          status: response.status,
          headers,
          data
        });
      } else {
        let errorMsg = response.statusText;
        try {
          const errorData = await response.json();
          errorMsg = JSON.stringify(errorData, null, 2);
        } catch {
          try {
            errorMsg = await response.text();
          } catch {
            errorMsg = `Status ${response.status}: ${response.statusText}`;
          }
        }
        
        setError(errorMsg);
      }
    } catch (err) {
      console.error('GET Request Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testFetchRecent = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      // Fetch recent blueprints to see what's in the database
      const response = await fetch(`/api/blueprints/recent`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Debug-Client': 'debug-test-page'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult({
          status: response.status,
          data
        });
      } else {
        let errorMsg = response.statusText;
        try {
          const errorData = await response.json();
          errorMsg = JSON.stringify(errorData, null, 2);
        } catch {
          try {
            errorMsg = await response.text();
          } catch {
            errorMsg = `Status ${response.status}: ${response.statusText}`;
          }
        }
        
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Recent Blueprints Request Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Blueprint API Debug</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Blueprint API Endpoints</CardTitle>
            <CardDescription>Test direct API calls to the blueprints endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <Input 
                type="text" 
                value={blueprintId} 
                onChange={(e) => setBlueprintId(e.target.value)} 
                placeholder="Blueprint ID"
                className="flex-1"
              />
              <Button onClick={testHeadRequest} disabled={loading || !blueprintId}>
                Test HEAD Request
              </Button>
              <Button onClick={testGetRequest} disabled={loading || !blueprintId}>
                Test GET Request
              </Button>
              <Button onClick={testFetchRecent} disabled={loading}>
                Fetch Recent Blueprints
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {headResult && (
          <Card>
            <CardHeader>
              <CardTitle>HEAD Request Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(headResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        
        {headError && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500">HEAD Request Error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 p-4 rounded-md">
                {headError}
              </div>
            </CardContent>
          </Card>
        )}
        
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>GET Request Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto text-sm max-h-[500px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        
        {error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500">GET Request Error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300 p-4 rounded-md">
                {error}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 