import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"

interface Course {
  id: string
  name: string
  progress: number
  level: string
  modules: number
}

interface CoursesSectionProps {
  courses: Course[]
}

export function CoursesSection({ courses }: CoursesSectionProps) {
  return (
    <div className="space-y-4">
      {courses.length > 0 ? (
        courses.map((course) => (
          <div key={course.id} className="group p-3 border rounded-md">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium">{course.name}</h4>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {course.progress}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {course.level} • {course.modules} modules
            </p>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No courses found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Explore our catalog to find courses that match your interests
          </p>
          <Button>
            <BookOpen className="h-4 w-4 mr-2" /> Browse All Courses
          </Button>
        </div>
      )}
    </div>
  )
} 