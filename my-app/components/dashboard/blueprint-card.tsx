import Link from "next/link"
import { Blueprint } from "@/utils/models"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, Check, GitFork } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"

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
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {isVerified && (
              <div className="flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-1 flex items-center justify-center">
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              </div>
            )}
          </div>
          <CardDescription className="line-clamp-2">{details}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="flex items-center space-x-2 text-xs">
            <Badge variant="outline" className="text-xs px-2 py-0">
              {stepsCount} Steps
            </Badge>
            
            {cloneCount !== undefined && cloneCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0 flex items-center">
                <GitFork className="h-3 w-3 mr-1" />
                {cloneCount} {cloneCount === 1 ? "Clone" : "Clones"}
              </Badge>
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