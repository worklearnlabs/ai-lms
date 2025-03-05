import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlueprintsSection } from "@/components/dashboard/blueprints-section";
import { CreateBlueprintButton } from "./components/create-blueprint-button";

export default function BlueprintsPage() {
  // This would normally fetch from the database
  const blueprints = [
    {
      id: "1",
      title: "LinkedIn Data Scraper",
      stepsCount: 5,
      details: "Automated daily search of LinkedIn posts containing specific keywords, followed by extraction and summarization.",
      isVerified: true,
      cloneCount: 23,
      lastUpdated: "3 days ago"
    },
    {
      id: "2",
      title: "Customer Support Chatbot",
      stepsCount: 7,
      details: "AI-powered chatbot that handles customer inquiries, processes basic requests, and escalates complex issues.",
      isVerified: false,
      cloneCount: 5, 
      lastUpdated: "1 week ago"
    },
    {
      id: "3",
      title: "Content Recommendation Engine",
      stepsCount: 6,
      details: "Engine that analyzes user behavior and preferences to suggest personalized content and products.",
      isVerified: true,
      cloneCount: 18,
      lastUpdated: "2 weeks ago"
    }
  ];
  
  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Blueprints</h1>
          <p className="text-muted-foreground">View and manage your custom AI workflow blueprints</p>
        </div>
        <div className="flex space-x-2">
          <CreateBlueprintButton />
        </div>
      </div>
      
      <Card className="rounded-xl">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle>All Blueprints</CardTitle>
          <CardDescription>
            Your saved and generated blueprints
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <BlueprintsSection blueprints={blueprints} />
        </CardContent>
      </Card>
    </div>
  );
} 