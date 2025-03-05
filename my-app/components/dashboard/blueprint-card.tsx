import Link from "next/link"
import { Blueprint } from "@/lib/models/blueprint"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface BlueprintCardProps {
  blueprint: Blueprint
}

export default function BlueprintCard({ blueprint }: BlueprintCardProps) {
  const { id, title, stepsCount, details, isVerified, cloneCount, updatedAt } = blueprint

  // Format the date safely
  const getFormattedDate = () => {
    try {
      // Handle string dates like "2 days ago" directly
      if (typeof updatedAt === 'string' && (
        updatedAt.includes('ago') || 
        updatedAt.includes('day') || 
        updatedAt.includes('week') || 
        updatedAt.includes('month') || 
        updatedAt.includes('year')
      )) {
        return updatedAt;
      }
      
      // Try to parse the date
      const date = new Date(updatedAt);
      
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return "recently";
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "recently";
    }
  }

  return (
    <Link href={`/blueprints/${id}`} className="block transition-transform hover:-translate-y-1">
      <Card className="h-full flex flex-col border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <CardDescription className="line-clamp-2">{details}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-2">
            <span>{stepsCount} Steps</span>
            <span>•</span>
            <span>{isVerified ? "Verified" : "Unverified"}</span>
            {cloneCount && (
              <>
                <span>•</span>
                <span>{cloneCount} Clones</span>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0 flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Updated {getFormattedDate()}
          </div>
          <div className="flex items-center text-xs text-primary font-medium group">
            View Details
            <ArrowUpRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
} 