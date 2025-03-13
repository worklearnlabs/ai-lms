"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runAuthTest } from "@/utils/tests/auth-system-test";
import { supabaseClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface TestResult {
  success: boolean;
  results?: Record<string, boolean>;
  error?: string;
}

export default function AuthSystemTestPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [results, setResults] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const checkCurrentUser = async () => {
    const { data } = await supabaseClient.auth.getUser();
    setCurrentUser(data.user);
  };

  const runTest = async () => {
    setLoading(true);
    try {
      const testResults = await runAuthTest(email, password);
      setResults(testResults);
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
      checkCurrentUser();
    }
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    checkCurrentUser();
  };

  // Run initial user check
  if (currentUser === null) {
    checkCurrentUser();
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Supabase Auth System Test</h1>
      <p className="text-gray-600">
        This page allows you to test the Supabase authentication system to ensure
        it&apos;s working correctly after the migration.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <Button
              onClick={runTest}
              disabled={loading || !email || !password}
              className="w-full"
            >
              {loading ? "Testing..." : "Run Auth Test"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Current User:</h3>
              {currentUser ? (
                <div className="p-3 bg-gray-100 rounded-md">
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {currentUser.email}
                  </p>
                  <p>
                    <span className="font-medium">ID:</span> {currentUser.id}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2" 
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500">Not signed in</p>
              )}
            </div>

            {results && (
              <div>
                <h3 className="font-medium mb-1">Test Results:</h3>
                <Textarea
                  className="font-mono text-sm h-64"
                  readOnly
                  value={JSON.stringify(results, null, 2)}
                />
                <div className="mt-2">
                  <div
                    className={`p-2 rounded-md ${
                      results.success
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {results.success
                      ? "✅ All tests passed!"
                      : "❌ Some tests failed. Check details above."}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 