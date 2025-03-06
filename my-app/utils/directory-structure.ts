/**
 * This is a conceptual file to visualize the new consolidated directory structure
 */
const directoryStructure = {
  app: { /* Next.js App Router structure */ 
    api: { /* API routes */
      ai: { /* AI-related routes */},
      blueprints: { /* Blueprint-related routes */},
      auth: { /* Auth-related routes */},
    },
    "(auth)": { /* Auth route group with login page */ },
    dashboard: { /* Dashboard pages */ },
    layout: { /* Root layout */ },
  },
  components: { 
    ui: { /* UI primitives from shadcn/ui */ },
    forms: { /* Form components */ },
    layouts: { /* Layout components */ },
  },
  utils: { /* Helper functions */
    ai: { /* AI-related utilities */ },
    models: { /* Data models */ },
    supabase: { /* Supabase client */ },
    validation: { /* Zod schemas */ },
  },
  types: { /* TypeScript types */
    models: { /* Model types */ },
    user: { /* User types */ },
    supabase: { /* Supabase types */ },
  },
  context: { /* Context providers */
    "auth-context": { /* Authentication context */ },
  },
  hooks: { /* Custom React hooks */ },
  drizzle: { /* Drizzle ORM configuration */ },
  scripts: { /* Scripts for migrations, etc. */ },
  public: { /* Static assets */ },
  styles: { /* Global styles */ },
}; 

export default directoryStructure; 