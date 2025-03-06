# Step-by-Step Implementation Plan for AI-Powered Next.js Architecture

## Step 1: Consolidate and Organize the Project Structure

### Specific Tasks for Step 1

#### Task 1.1: Directory Structure Audit ✅

- **Objective:** List and review all directories present in the project.
- **Actions:**
  - **Review Root Level Directories:**  
    Identify the key directories at the project root:
    - `/app` – Contains some application code.
    - `/my-app` – Main application directory.
    - `/src` – Contains additional source code.
    - `/docs` – Documentation.
    - `/.git` – Git repository.
    - `/.cursor` – Cursor IDE configuration.
    - `/node_modules` – Dependencies.
  - **Review Subdirectories in `/my-app`:**  
    Check the directories under `/my-app`:
    - `/my-app/app` – Next.js App Router pages and API routes.
    - `/my-app/components` – UI components.
    - `/my-app/hooks` – React hooks.
    - `/my-app/lib` – Utility functions.
    - `/my-app/src` – Additional source code.
    - `/my-app/drizzle` – Database schema and migrations.
    - `/my-app/public` – Static assets.
    - `/my-app/.next` – Next.js build output.
    - `/my-app/tmp` – Temporary files.
    - `/my-app/node_modules` – Dependencies.
  - **Examine `/my-app/app` Subdirectories:**  
    Identify key segments:
    - `/my-app/app/api` – API routes, including chat, research, blueprints, profile, auth, and users.
    - `/my-app/app/blueprints`, `/dashboard`, `/settings`, `/login`, `/register`, `/users` – Page-specific directories.
  - **Examine `/my-app/components`:**  
    Identify:
    - `/my-app/components/ui` – shadcn/ui components.
    - `/my-app/components/dashboard` – Dashboard-specific components.

#### Task 1.2: Overlapping Folder Analysis ✅

- **Objective:** Identify and document overlapping folders and duplicate functionalities.
- **Actions:**
  - **Compare `/my-app/lib` vs. `/my-app/src/lib`:**
    - **Supabase Utilities:**
      - `/my-app/src/lib/supabase/client.ts`
      - `/my-app/src/lib/supabase/server.ts`
    - **Database Migrations/Models:**
      - `/my-app/src/lib/db/migrate.ts` (referenced in package.json)
      - `/my-app/lib/models/blueprint.ts`
  - **Identify Overlap in App Directories:**
    - Compare `/app` at root vs. `/my-app/app` for duplication of Next.js code.
  - **Component Duplication:**
    - Components exist in both `/my-app/components/` and `/my-app/app/components/`.
  - **Documentation:**
    - Document which files/functions exist in each location so you can decide which location is the source of truth.

#### Task 1.3: Define the Final Directory Structure ✅

- **Objective:** Establish a clear and unified folder hierarchy.
- **Final Structure Should Look Like:**

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

#### Task 1.4: Execute the Consolidation

- **Actions:**
  - **Move and Merge:**
    - Consolidate files from `/my-app/lib` and `/my-app/src/lib` into `/my-app/utils`.
    - Merge duplicate utility files so that each functionality (e.g., Supabase configuration, database migrations) exists in one location.
  - **Reorganize Components:**
    - Move shared UI components from `/my-app/app/components` into `/my-app/components`.
    - Create subfolders under `/components` as needed.
  - **Reorganize API Routes:**
    - Ensure API endpoints are grouped by feature under `/my-app/app/api/`.
  - **Update Imports:**
    - Refactor import paths throughout the codebase to match the new structure.
  - **Documentation:**
    - Update the project README to reflect the new directory layout.

#### Task 1.5: Verification

- **Actions:**
  - Run `npm run dev` or `yarn dev` to verify that the application builds without module or path errors.
  - Navigate to key pages and API endpoints to ensure everything works as expected.
  - Commit the changes with a descriptive commit message (e.g., "Consolidate project structure and reorganize folders").

### Success Criteria for Step 1

- The final codebase structure strictly follows the hierarchy outlined above.
- Overlapping directories (`/lib` vs. `/src/lib`) are successfully merged into a single `/utils` folder.
- No duplicate or redundant directories remain.
- All import paths are updated, and the application starts without errors.
- The new structure is documented in the project README.

---

## Step 2: Set Up Edge Functions for API Routes with Zod Validation

_[Remaining steps as described previously]_

---

## Visual Representation of Client–Server–Data Flow

```
               ┌────────────────────────────┐
               │        Client UI           │
               │  (Next.js Pages/Components)│
               └─────────────┬──────────────┘
                             │
             User submits prompt via chat
                             │
                             ▼
               ┌────────────────────────────┐
               │   API Route (/api/ai)      │
               │ (Edge Function with Zod)   │
               └─────────────┬──────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
┌─────────────────┐   ┌─────────────────┐  ┌─────────────────┐
│  OpenAI Call    │   │  Perplexity     │  │ Error Handling  │
│ (Refine Prompt) │   │ (Research Query)│  │ (Catch & Log)   │
└─────────────────┘   └─────────────────┘  └─────────────────┘
           │                 │
           └─────Chained API Calls──────┘
                             │
                             ▼
               ┌────────────────────────────┐
               │  Store Interaction in      │
               │       Supabase             │
               └─────────────┬──────────────┘
                             │
                             ▼
               ┌────────────────────────────┐
               │ Return Final Response      │
               │ (Refined Query + Answer)   │
               └─────────────┬──────────────┘
                             │
                             ▼
               ┌────────────────────────────┐
               │  Client UI Updates:        │
               │  Display Results, Update   │
               │  State, etc.               │
               └────────────────────────────┘
```
