"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function LimitsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usage Limits</CardTitle>
          <CardDescription>
            Monitor your usage and limits for AI-generated blueprints and courses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Blueprints</span>
              <span className="text-sm text-muted-foreground">3/5 used</span>
            </div>
            <Progress value={60} />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Course Access</span>
              <span className="text-sm text-muted-foreground">2/3 used</span>
            </div>
            <Progress value={66} />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Upgrade to the Business plan for unlimited access to all features.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 