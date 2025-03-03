export const mockDashboardData = {
  kpis: {
    blueprints: {
      count: 8,
      description: "AI workflows and blueprints"
    },
    courses: {
      count: 12,
      description: "3 in progress, 9 completed"
    },
    events: {
      count: 5,
      description: "2 upcoming this week"
    }
  },
  blueprints: [
    {
      id: "1",
      title: "LinkedIn Data Scraper",
      stepsCount: 6,
      details: "Scrape data from LinkedIn posts that have the words 'venture capital' and save on a Google Doc file",
      isVerified: true,
      cloneCount: 128,
      lastUpdated: "2 days ago"
    },
    {
      id: "2",
      title: "Data Analysis Pipeline",
      stepsCount: 4,
      details: "Analyze CSV data using Python and generate visualizations for business insights",
      isVerified: false,
      lastUpdated: "1 week ago"
    },
    {
      id: "3",
      title: "Customer Support Bot",
      stepsCount: 8,
      details: "AI-powered chatbot that handles customer inquiries and routes complex issues to human agents",
      isVerified: true,
      cloneCount: 256,
      lastUpdated: "3 days ago"
    },
    {
      id: "4",
      title: "Image Recognition System",
      stepsCount: 5,
      details: "Identify objects and patterns in uploaded images using computer vision algorithms",
      isVerified: false,
      lastUpdated: "5 days ago"
    }
  ],
  courses: [
    {
      id: "1",
      name: "AI Prompt Engineering",
      progress: 65,
      level: "Advanced",
      modules: 8
    },
    {
      id: "2",
      name: "Machine Learning",
      progress: 42,
      level: "Intermediate",
      modules: 12
    }
  ],
  events: [
    {
      id: "1",
      name: "AI Ethics Summit",
      date: {
        month: "MAY",
        day: "15"
      },
      location: "Virtual",
      time: "10:00 AM EST"
    },
    {
      id: "2",
      name: "Prompt Engineering Workshop",
      date: {
        month: "MAY",
        day: "22"
      },
      location: "Virtual",
      time: "1:00 PM EST"
    }
  ]
} 