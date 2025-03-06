# Adaptive Learning System

## Project Overview

The Adaptive Learning System is a web-based platform built for AI enthusiasts and professionals who want to learn and master AI through hands-on implementation. It simplifies daily learning operations by providing personalized AI workflow blueprints, step-by-step implementation guides, and actionable insights to help users advance their careers or grow their businesses. By blending human validation with automated processes, the platform ensures users not only execute AI projects efficiently but also learn from every implementation with measurable progress.

This project uses Next.js, Supabase, Drizzle ORM, and various AI APIs to provide personalized learning experiences.

[View detailed project requirements](./REQUIREMENTS.md)

## Project Structure

```
/my-app
├── app/                          # Next.js App Router pages & API routes
│   ├── api/                      # API endpoints
│   │   ├── ai/                  # AI-related routes (e.g., /api/ai/route.ts)
│   │   ├── blueprints/          # Blueprint-related routes
│   │   └── ...                  # Other API domains
│   ├── chat/                     # Pages related to chat interface
│   │   └── page.tsx
│   ├── dashboard/                # Dashboard pages (authenticated routes)
│   └── layout.tsx                # Global layout
├── components/                   # Reusable UI components
│   ├── ui/                       # shadcn/ui components & custom UI primitives
│   ├── forms/                    # Form components (login, register, etc.)
│   └── layouts/                  # Layout components (header, sidebar, etc.)
├── hooks/                        # Custom React hooks (including AI SDK hooks)
├── context/                      # Global state providers (e.g., AuthProvider, ThemeProvider)
├── types/                        # TypeScript types and Zod schemas
├── utils/                        # Helper functions (e.g., AI integrations, validation utilities)
│   ├── ai.ts                     # AI provider abstraction and sequential chaining
│   ├── supabase.ts               # Supabase client initialization & helper functions
│   └── validation.ts             # Zod validation schemas
├── drizzle/                      # Database schema, migrations, and configuration files
├── public/                       # Static assets (images, fonts, etc.)
├── styles/                       # Global styles & Tailwind CSS configuration
│   └── globals.css
├── next.config.js                # Next.js configuration file
├── package.json                  # Project dependencies and scripts
└── README.md                     # Project documentation
```

## Key Features

- **Authentication**: User registration, login, and profile management via Supabase Auth
- **AI-Powered Research**: Sequential AI processing using OpenAI and Perplexity API
- **Blueprints**: Templates for creating learning pathways
- **Adaptive Learning**: Personalized learning paths based on user skill levels and goals
- **Dashboard**: Central hub for managing blueprints, courses, and tracking progress
- **Community Hub**: Discussion boards and collaborative spaces for blueprint sharing
- **Edge Functions**: API routes use Vercel Edge Functions for optimal performance
- **Validation**: All API inputs are validated using Zod schemas

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see `.env.example`)
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-openai-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
```

## Database

This project uses Drizzle ORM with Supabase PostgreSQL. The schema is defined in `drizzle/schema.ts`.

To run migrations:

```bash
npm run db:migrate
```

To generate migrations:

```bash
npm run db:generate
```

## API Routes

- `/api/ai/research`: AI-powered research using sequential OpenAI and Perplexity processing
- `/api/blueprints`: CRUD operations for learning blueprints
- `/api/auth`: Authentication endpoints

## Documentation

The following documentation is available to help developers understand and work with the Adaptive Learning System:

- [Project Requirements](./REQUIREMENTS.md) - Comprehensive overview of the project requirements
- [Supabase Integration Guide](./docs/supabase_integration_guide.md) - Guidelines for using Supabase
- [AI Orchestration](./docs/ai_orchestration.md) - How the AI integration works

## License

MIT
