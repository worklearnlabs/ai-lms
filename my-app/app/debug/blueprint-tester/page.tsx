"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BlueprintTester() {
  const [blueprintId, setBlueprintId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<Record<string, {
    loading?: boolean;
    success?: boolean;
    statusInfo?: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
    };
    data?: Record<string, unknown>;
    error?: unknown;
  }>>({});
  const [activeTab, setActiveTab] = useState<string>('standard');
  
  // Test using standard API
  const testStandardApi = async () => {
    if (!blueprintId) return;
    
    setLoading(true);
    setResults(prev => ({ ...prev, standard: { loading: true } }));
    
    try {
      // Standard API request
      const response = await fetch(`/api/blueprints/${blueprintId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const statusInfo = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      };
      
      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({ 
          ...prev, 
          standard: { 
            success: true, 
            statusInfo, 
            data 
          } 
        }));
      } else {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        
        setResults(prev => ({ 
          ...prev, 
          standard: { 
            success: false, 
            statusInfo, 
            error: errorText 
          } 
        }));
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        standard: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // Test using direct access API
  const testDirectApi = async () => {
    if (!blueprintId) return;
    
    setLoading(true);
    setResults(prev => ({ ...prev, direct: { loading: true } }));
    
    try {
      // Direct access API request
      const response = await fetch(`/api/blueprints/direct-access?id=${blueprintId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const statusInfo = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      };
      
      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({ 
          ...prev, 
          direct: { 
            success: true, 
            statusInfo, 
            data 
          } 
        }));
      } else {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        
        setResults(prev => ({ 
          ...prev, 
          direct: { 
            success: false, 
            statusInfo, 
            error: errorText 
          } 
        }));
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        direct: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // Test using debug info API
  const testDebugInfo = async () => {
    if (!blueprintId) return;
    
    setLoading(true);
    setResults(prev => ({ ...prev, debug: { loading: true } }));
    
    try {
      // Debug info API request
      const response = await fetch(`/api/debug/blueprint-check?id=${blueprintId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const statusInfo = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      };
      
      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({ 
          ...prev, 
          debug: { 
            success: true, 
            statusInfo, 
            data 
          } 
        }));
      } else {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        
        setResults(prev => ({ 
          ...prev, 
          debug: { 
            success: false, 
            statusInfo, 
            error: errorText 
          } 
        }));
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        debug: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // Test database access
  const testDbAccess = async () => {
    setLoading(true);
    setResults(prev => ({ ...prev, db: { loading: true } }));
    
    try {
      // DB access API request
      const response = await fetch('/api/debug/db-access', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const statusInfo = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      };
      
      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({ 
          ...prev, 
          db: { 
            success: true, 
            statusInfo, 
            data 
          } 
        }));
      } else {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        
        setResults(prev => ({ 
          ...prev, 
          db: { 
            success: false, 
            statusInfo, 
            error: errorText 
          } 
        }));
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        db: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // Test RLS policies and visibility
  const testRlsPolicies = async () => {
    setLoading(true);
    setResults(prev => ({ ...prev, rls: { loading: true } }));
    
    try {
      // RLS test API request
      const url = blueprintId 
        ? `/api/blueprints/rls-test?id=${blueprintId}`
        : '/api/blueprints/rls-test';
        
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      const statusInfo = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      };
      
      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({ 
          ...prev, 
          rls: { 
            success: true, 
            statusInfo, 
            data 
          } 
        }));
      } else {
        let errorText;
        try {
          errorText = await response.json();
        } catch {
          errorText = await response.text();
        }
        
        setResults(prev => ({ 
          ...prev, 
          rls: { 
            success: false, 
            statusInfo, 
            error: errorText 
          } 
        }));
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        rls: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        } 
      }));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Blueprint Access Tester</h1>
      
      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input 
                type="text" 
                value={blueprintId} 
                onChange={(e) => setBlueprintId(e.target.value)} 
                placeholder="Blueprint ID"
                className="flex-1"
              />
              <Button onClick={testStandardApi} disabled={loading || !blueprintId}>
                Test Standard API
              </Button>
              <Button onClick={testDirectApi} disabled={loading || !blueprintId}>
                Test Direct API
              </Button>
              <Button onClick={testDebugInfo} disabled={loading || !blueprintId}>
                Test Debug Info
              </Button>
              <Button onClick={testDbAccess} disabled={loading}>
                Test DB Access
              </Button>
              <Button onClick={testRlsPolicies} disabled={loading}>
                Test RLS Policies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="standard">Standard API</TabsTrigger>
          <TabsTrigger value="direct">Direct API</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
          <TabsTrigger value="db">DB Access</TabsTrigger>
          <TabsTrigger value="rls">RLS Policies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard">
          <Card>
            <CardHeader>
              <CardTitle>Standard API Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.standard?.loading ? (
                <div>Loading...</div>
              ) : results.standard ? (
                <div className="overflow-auto max-h-[60vh]">
                  <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm">
                    {JSON.stringify(results.standard, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground">No results yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="direct">
          <Card>
            <CardHeader>
              <CardTitle>Direct API Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.direct?.loading ? (
                <div>Loading...</div>
              ) : results.direct ? (
                <div className="overflow-auto max-h-[60vh]">
                  <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm">
                    {JSON.stringify(results.direct, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground">No results yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Debug Info Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.debug?.loading ? (
                <div>Loading...</div>
              ) : results.debug ? (
                <div className="overflow-auto max-h-[60vh]">
                  <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm">
                    {JSON.stringify(results.debug, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground">No results yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="db">
          <Card>
            <CardHeader>
              <CardTitle>DB Access Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.db?.loading ? (
                <div>Loading...</div>
              ) : results.db ? (
                <div className="overflow-auto max-h-[60vh]">
                  <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm">
                    {JSON.stringify(results.db, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground">No results yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rls">
          <Card>
            <CardHeader>
              <CardTitle>RLS Policies Results</CardTitle>
            </CardHeader>
            <CardContent>
              {results.rls?.loading ? (
                <div>Loading...</div>
              ) : results.rls ? (
                <div className="overflow-auto max-h-[60vh]">
                  <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md text-sm">
                    {JSON.stringify(results.rls, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-muted-foreground">No results yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 