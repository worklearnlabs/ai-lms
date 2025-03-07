"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing and Subscription</CardTitle>
          <CardDescription>
            Manage your subscription plan and billing information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are currently on the Free plan. Upgrade to access premium features.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 