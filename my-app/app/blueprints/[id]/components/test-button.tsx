"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { callReasoningApi, createBlueprintFromReasoning } from "@/utils/reasoning-api";
import { toast } from "sonner";
// import { useRouter } from "next/navigation"; - removed until needed
import { Zap } from "lucide-react";

// Development-only endpoint for testing
async function callSimpleReasoningApi(prompt: string, sessionId?: string) {
  try {
    const requestBody = JSON.stringify({
      prompt,
      sessionId
    });
    
    console.log('Sending request to simplified reason endpoint:', requestBody);
    
    const response = await fetch('/api/dev/simple-reason', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    const responseText = await response.text();
    console.log('Raw response from simplified reason endpoint:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        // Parse error, just use raw response
        errorData = { rawResponse: responseText };
      }
      
      console.error('Simple reason API error:', errorData);
      throw new Error(errorData.error || `HTTP error ${response.status}: ${responseText.substring(0, 200)}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Error calling simple reason API:', error);
    throw error;
  }
}

// Original dev reasoning API for reference
async function callDevReasoningApi(prompt: string, sessionId?: string) {
  try {
    const requestBody = JSON.stringify({
      prompt,
      sessionId
    });
    
    console.log('Sending request to dev endpoint:', requestBody);
    
    const response = await fetch('/api/dev/reason', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    const responseText = await response.text();
    console.log('Raw response from dev endpoint:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        // Parse error, just use raw response
        errorData = { rawResponse: responseText };
      }
      
      console.error('Dev API error:', errorData);
      throw new Error(errorData.error || `HTTP error ${response.status}: ${responseText.substring(0, 200)}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Error calling dev reasoning API:', error);
    throw error;
  }
}

// Development-only endpoint for creating blueprints
async function createSimpleBlueprint(
  title: string,
  searchQuery: string,
  sessionId: string,
  options?: {
    complexity?: string;
    estimatedTime?: string;
    prompt?: string;
    skillLevel?: string;
    learningObjective?: string;
  }
) {
  try {
    const requestBody = JSON.stringify({
      title,
      searchQuery,
      sessionId,
      ...options
    });
    
    console.log('Sending request to create-blueprint endpoint:', requestBody);
    
    const response = await fetch('/api/dev/create-blueprint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    
    const responseText = await response.text();
    console.log('Raw response from create-blueprint endpoint:', responseText);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { rawResponse: responseText };
      }
      
      console.error('Create blueprint API error:', errorData);
      throw new Error(errorData.error || `HTTP error ${response.status}: ${responseText.substring(0, 200)}`);
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Error creating blueprint:', error);
    throw error;
  }
}

// Development-only endpoint for full blueprint creation flow
async function callFullFlowApi(prompt: string) {
  try {
    const requestBody = JSON.stringify({
      prompt,
      createBlueprint: true
    });
    
    console.log('Sending request to full-flow endpoint:', requestBody);
    
    const response = await fetch('/api/dev/full-flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    
    const responseText = await response.text();
    console.log('Raw response from full-flow endpoint:', responseText);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { rawResponse: responseText };
      }
      
      console.error('Full flow API error:', errorData);
      throw new Error(errorData.error || `HTTP error ${response.status}: ${responseText.substring(0, 200)}`);
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response JSON:', parseError);
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Error calling full flow API:', error);
    throw error;
  }
}

export default function TestButton() {
  const [isLoading, setIsLoading] = useState(false);
  // Keep router for potential future use - commented out for now
  // const router = useRouter();
  
  const handleClick = async () => {
    try {
      setIsLoading(true);
      
      // Try the full flow endpoint first
      toast.info("Testing complete flow API...");
      try {
        const prompt = "Create a blueprint for an AI system that can analyze customer support tickets and suggest solutions based on previous resolutions.";
        const response = await callFullFlowApi(prompt);
        
        console.log("Full flow API Response:", response);
        
        if (response.success) {
          toast.success("Complete flow successful!", {
            description: `Created session and blueprint in one call. Blueprint ID: ${response.blueprintId}`
          });
          
          return; // Exit early if this works
        }
      } catch (fullFlowError) {
        console.error("Full flow API failed:", fullFlowError);
        toast.error("Full flow API failed, trying other methods", {
          description: fullFlowError instanceof Error ? fullFlowError.message : String(fullFlowError)
        });
        // Continue with other methods
      }
      
      // First, try the schema inspection endpoint
      toast.info("Starting diagnostic checks...");
      console.log("Checking database schema...");
      
      try {
        const schemaResponse = await fetch('/api/dev/schema?table=blueprints');
        const schemaData = await schemaResponse.json();
        console.log("Blueprint schema:", schemaData);
        
        if (schemaResponse.ok) {
          toast.success("Schema check successful");
        } else {
          toast.error("Schema check failed", { 
            description: schemaData.error || "Unknown error" 
          });
        }
      } catch (schemaError) {
        console.error("Schema check failed:", schemaError);
        toast.error("Schema check failed", {
          description: schemaError instanceof Error ? schemaError.message : String(schemaError)
        });
      }
      
      // Next, test direct database access
      console.log("Testing direct database access...");
      try {
        const dbResponse = await fetch('/api/dev/direct-db');
        const dbData = await dbResponse.json();
        console.log("Direct DB test result:", dbData);
        
        if (dbResponse.ok) {
          toast.success("Direct database test successful!", {
            description: "Created and deleted a test blueprint and session"
          });
        } else {
          toast.error("Direct database test failed", { 
            description: dbData.error || "Unknown error" 
          });
          
          // If this fails, no point in continuing with API tests
          console.error("Direct database access failed - skipping API tests");
          return;
        }
      } catch (dbError) {
        console.error("Direct DB test failed:", dbError);
        toast.error("Direct database test failed", {
          description: dbError instanceof Error ? dbError.message : String(dbError)
        });
        
        // If this fails, no point in continuing with API tests
        return;
      }
      
      // Now try the simplified reasoning API
      toast.info("Testing simplified reasoning API...");
      console.log("Starting simplified reasoning API test");
      
      try {
        const testPrompt = "Create a blueprint for an AI system that can analyze customer support tickets and suggest solutions based on previous resolutions.";
        const response = await callSimpleReasoningApi(testPrompt);
        
        console.log("Simplified API Response:", response);
        toast.success("Simplified API call successful!");
        
        if (response.sessionId) {
          console.log("Session ID:", response.sessionId);
          console.log("Blueprint ID:", response.blueprintId);
          console.log("Message:", response.message);
          console.log("Is Complete:", response.isComplete);
          
          // If we have complete data, create a blueprint
          if (response.isComplete && response.data) {
            toast.success("Simplified API response complete!");
            
            // Try a regular createBlueprintFromReasoning call
            try {
              // First try our simplified blueprint creation
              console.log("Trying simplified blueprint creation...");
              const result = await createSimpleBlueprint(
                response.data.title,
                response.data.searchQuery,
                response.sessionId,
                {
                  complexity: response.data.complexity,
                  estimatedTime: response.data.estimatedTime
                }
              );
              
              toast.success("Blueprint created successfully!", {
                description: `Blueprint ID: ${result.id}`
              });
              console.log("Blueprint created:", result.id);
              
              // Option to redirect to the new blueprint
              // router.push(`/blueprints/${result.id}`);
            } catch (createError) {
              console.error("Error creating blueprint:", createError);
              toast.error("Failed to create blueprint", {
                description: createError instanceof Error ? createError.message : String(createError)
              });
              
              // Try the regular API as a fallback
              try {
                console.log("Falling back to regular API...");
                const regularResult = await createBlueprintFromReasoning(
                  response.data.title,
                  response.data.searchQuery,
                  response.sessionId,
                  {
                    complexity: response.data.complexity,
                    estimatedTime: response.data.estimatedTime,
                  }
                );
                
                toast.success("Regular API success!", {
                  description: `Blueprint ID: ${regularResult.id}`
                });
              } catch (regularError) {
                console.error("Regular API also failed:", regularError);
                toast.error("All blueprint creation methods failed", {
                  description: regularError instanceof Error ? regularError.message : String(regularError)
                });
              }
            }
          } else {
            toast.info("Response not complete - would continue conversation");
          }
        }
        
        return; // Skip other tests if this works
      } catch (simpleApiError) {
        console.error("Simplified API test failed:", simpleApiError);
        toast.error("Simplified API test failed", {
          description: simpleApiError instanceof Error ? simpleApiError.message : String(simpleApiError)
        });
        // Continue to try other methods
      }
      
      // Try the original dev endpoint as fallback
      toast.info("Trying original dev reasoning API...");
      try {
        const response = await callDevReasoningApi(
          "Create a blueprint for an AI system that can analyze customer support tickets and suggest solutions based on previous resolutions."
        );
        
        console.log("Dev API Response:", response);
        toast.success("Dev API call successful!");
        
        // Handle success case
        return;
      } catch (devError) {
        console.error("Dev endpoint failed, falling back to regular API:", devError);
        toast.error("Dev API failed, trying regular API", {
          description: devError instanceof Error ? devError.message : String(devError)
        });
      }
      
      // Fall back to the regular API as last resort
      try {
        const response = await callReasoningApi(
          "Create a blueprint for an AI system that can analyze customer support tickets and suggest solutions based on previous resolutions."
        );
        
        console.log("Regular API Response:", response);
        toast.success("Regular API call successful!");
        
        // Handle success case
      } catch (apiError) {
        console.error("Regular API call error:", apiError);
        toast.error("All API calls failed", {
          description: apiError instanceof Error ? apiError.message : String(apiError)
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleClick}
      disabled={isLoading}
      className="ml-2"
    >
      <Zap className="h-4 w-4 mr-1" />
      Test API
    </Button>
  );
} 