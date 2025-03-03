# Codebase Structure for Adaptive Learning System

This document outlines the recommended structure for organizing the codebase of the Adaptive Learning System. A clear and well-organized codebase is essential to maintainability, scalability, and ease of collaboration amongst developers.

## Directory Structure

The Adaptive Learning System's codebase will follow a modular structure, organized by functionality, to ensure that each component of the application is easy to locate and maintain. Below is the suggested directory layout:

```
project-root/
├── src/
│   ├── app/ # Next.js App Router structure
│   │   ├── (auth)/ # Auth-related routes grouped
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── onboarding/
│   │   ├── dashboard/
│   │   ├── blueprints/
│   │   ├── courses/
│   │   ├── community/
│   │   ├── api/ # Backend API routes
│   │   │   ├── auth/
│   │   │   ├── blueprint/
│   │   │   ├── ai/
│   │   │   ├── courses/
│   │   │   └── community/
│   │   └── actions/ # Server actions (Vercel Serverless)
│   ├── components/
│   │   ├── ui/ # Reusable UI components
│   │   ├── forms/ # Form components
│   │   └── layouts/ # Layout components
│   ├── lib/ # Core utilities and services
│   │   ├── supabase/ # Supabase client and config
│   │   ├── ai/ # AI service integrations
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── perplexity.ts
│   │   │   └── orchestrator.ts # Fallback handling
│   │   ├── auth/ # Authentication utilities
│   │   └── error/ # Error handling infrastructure
│   ├── models/ # TypeScript interfaces and schema definitions
│   │   ├── user.ts
│   │   ├── blueprint.ts
│   │   ├── course.ts
│   │   └── types.d.ts
│   ├── hooks/ # Custom React hooks
│   ├── utils/ # Helper functions
│   └── styles/ # Global styles
├── public/
├── docs/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/
│   └── schema.prisma
├── middleware.ts # Next.js middleware for auth/routing
├── next.config.js
├── package.json
├── tsconfig.json
└── .env.example

```

### Key Directories Explained

- `src/`: The main source directory for all TypeScript and CSS code.
- `components/`: Contains React components divided into `ui` for shared components like buttons or modals and `pages` for page-specific components.
- `services/`: Houses API service integration logic, authentication services, and other asynchronous tasks.
- `hooks/`: Contains custom React hooks to manage state and logic across components.
- `utils/`: Utility functions, constants common across the project, and validation logic.
- `styles/`: Global and theme-specific styling files leveraging Tailwind CSS.
- `docs/`: Markdown files for documentation on various aspects of the codebase, contributing guidelines, and user roles.
- `tests/`: Organized into unit and integration test directories to ensure comprehensive coverage for components and API integrations.

### Special Directories and Files

- `docs/`**:**

  - `README.md`: The primary readme providing an overview, installation instructions, and usage examples.
  - `CONTRIBUTING.md`: Guidelines for contributing to the project, including defining the coding standards and pull request processes.
  - `CODE_OF_CONDUCT.md`: Community expectations and standards in line with creating a welcoming environment.
  - `deployment_guide.md`: Instructions on deploying the platform, including environmental setups and CI/CD procedures.
  - `architecture_overview.md`: A high-level description of the system architecture, intended to provide context to new developers.
  - `api_reference.md`: A detailed reference guide for the API integrations, particularly with AI services.
  - `blueprint_integration_guide.md`: Guidance on how AI blueprints are structured and integrated into the system.
  - `user_roles_permissions.md`: Explanation of the various user roles available and their permissions, including admin, mentors, and regular users.
  - `community_guidelines.md`: Defines acceptable behavior within the community hub, encouraging positive engagement and collaboration.

- `tests/`**:**

  - `unit/`: Unit tests for individual components and functions for assuring small, isolated pieces of code.
  - `integration/`: Tests that cover interactions between modules or components, ensuring they work together correctly.

By following this structured approach, your development process will be more organized, and the system will remain maintainable and scalable, supporting future features or integrations seamlessly.
