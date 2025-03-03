import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, GitFork, Info } from "lucide-react"

interface BlueprintCardProps {
  id?: string
  title: string
  stepsCount: number
  details: string
  isVerified: boolean
  cloneCount?: number
  lastUpdated: string
}

export function BlueprintCard({
  title,
  stepsCount,
  details,
  isVerified,
  cloneCount = 0,
  lastUpdated
}: BlueprintCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:border-primary/20">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium line-clamp-1">{title}</CardTitle>
            <CardDescription className="text-xs">
              {stepsCount} {stepsCount === 1 ? 'step' : 'steps'} • Last updated {lastUpdated}
            </CardDescription>
          </div>
          {isVerified ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">{cloneCount}</span>
                    <GitFork className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Verified blueprint • {cloneCount} clones</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-none text-xs">
              Not verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{details}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-xs text-muted-foreground flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Details
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View blueprint details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  )
} 