import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

interface Event {
  id: string
  name: string
  date: {
    month: string
    day: string
  }
  location: string
  time: string
}

interface EventsSectionProps {
  events: Event[]
}

export function EventsSection({ events }: EventsSectionProps) {
  return (
    <div className="space-y-4">
      {events.length > 0 ? (
        events.map((event) => (
          <div key={event.id} className="group p-3 border rounded-md">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center bg-primary/10 rounded p-1 w-10 h-10">
                <span className="text-xs font-bold">{event.date.month}</span>
                <span className="text-sm font-bold">{event.date.day}</span>
              </div>
              <div>
                <h4 className="font-medium">{event.name}</h4>
                <p className="text-sm text-muted-foreground">{event.location} • {event.time}</p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No events found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Discover upcoming AI community events and workshops
          </p>
          <Button>
            <Calendar className="h-4 w-4 mr-2" /> Explore Events
          </Button>
        </div>
      )}
    </div>
  )
} 