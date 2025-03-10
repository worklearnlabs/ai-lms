# Blueprint System Database Schema

This document serves as the **definitive source of truth** for the Blueprint system database schema implemented in Supabase.

## Overview

The Blueprint system enables users to create, share, and collaborate on step-by-step implementation plans. The system includes support for multi-turn reasoning, dynamic step regeneration, and interactive commenting.

## Related Documentation

This document focuses specifically on the database schema and structure. For additional information, refer to:

- **supabase_blueprint_guide.md**: Usage guide for working with the Blueprint API in React components
- **supabase_integration_guide.md**: General Supabase integration guidelines for the entire application

## Implementation Notes

The schema was implemented by running individual SQL commands via the SQL Editor in Supabase. All SQL commands used for the implementation are saved in a private folder in Supabase for future reference.

The implementation process was broken down into steps:

1. Creating enum types using PL/pgSQL to safely check for existence first
2. Adding new columns to the existing blueprints table
3. Creating new tables for steps, subtasks, comments, and reasoning
4. Implementing a migration function to convert existing data
5. Setting up Row-Level Security (RLS) policies for all tables

This approach allowed for incremental implementation and testing of each component.

## Schema Structure

### Enum Types

The following enum types are used throughout the schema:

- **visibility_type**: 'private', 'public', 'team'
- **skill_level_type**: 'beginner', 'intermediate', 'advanced'
- **complexity_type**: 'low', 'medium', 'high'
- **step_status_type**: 'not_started', 'in_progress', 'completed'
- **session_status_type**: 'active', 'completed', 'failed'
- **message_role_type**: 'system', 'user', 'assistant'

### Tables

#### Blueprints

The main table storing blueprint metadata and content.

| Column             | Type             | Description                                   |
| ------------------ | ---------------- | --------------------------------------------- |
| id                 | uuid             | Primary key                                   |
| title              | text             | Blueprint title                               |
| details            | text             | Blueprint details                             |
| content            | jsonb            | Original blueprint content                    |
| is_verified        | boolean          | Whether the blueprint is verified             |
| created_at         | timestamp        | Creation timestamp                            |
| updated_at         | timestamp        | Last update timestamp                         |
| user_id            | uuid             | User who created the blueprint                |
| prompt             | text             | Original prompt used for creation             |
| search_query       | text             | Search query for research                     |
| visibility         | visibility_type  | Visibility level (private, public, team)      |
| team_id            | uuid             | Associated team (if applicable)               |
| skill_level        | skill_level_type | Required skill level                          |
| learning_objective | text             | Learning objective                            |
| complexity         | complexity_type  | Complexity level                              |
| estimated_time     | text             | Estimated completion time                     |
| clone_count        | integer          | Number of times the blueprint has been cloned |
| steps_count        | integer          | Number of steps in the blueprint              |

#### Blueprint Steps

Stores individual steps for each blueprint.

| Column         | Type             | Description                         |
| -------------- | ---------------- | ----------------------------------- |
| id             | uuid             | Primary key                         |
| blueprint_id   | uuid             | Reference to parent blueprint       |
| number         | integer          | Step number for ordering            |
| title          | text             | Step title                          |
| estimated_time | text             | Estimated time to complete the step |
| instructions   | jsonb            | Array of bullet-point instructions  |
| tools          | jsonb            | Array of tool tags                  |
| status         | step_status_type | Current status of the step          |
| created_at     | timestamp        | Creation timestamp                  |
| updated_at     | timestamp        | Last update timestamp               |

#### Blueprint Subtasks

Stores subtasks for each step.

| Column         | Type             | Description                            |
| -------------- | ---------------- | -------------------------------------- |
| id             | uuid             | Primary key                            |
| step_id        | uuid             | Reference to parent step               |
| task_number    | integer          | Task number for ordering               |
| description    | text             | Task description                       |
| status         | step_status_type | Current status of the subtask          |
| estimated_time | text             | Estimated time to complete the subtask |
| created_at     | timestamp        | Creation timestamp                     |
| updated_at     | timestamp        | Last update timestamp                  |

#### Blueprint Comments

Stores comments on blueprints or specific steps.

| Column       | Type      | Description                           |
| ------------ | --------- | ------------------------------------- |
| id           | uuid      | Primary key                           |
| blueprint_id | uuid      | Reference to parent blueprint         |
| step_id      | uuid      | Reference to specific step (optional) |
| user_id      | uuid      | User who created the comment          |
| content      | text      | Comment content                       |
| created_at   | timestamp | Creation timestamp                    |

#### Reasoning Sessions

Stores sessions for multi-turn reasoning during blueprint creation.

| Column             | Type                | Description                        |
| ------------------ | ------------------- | ---------------------------------- |
| id                 | uuid                | Primary key                        |
| blueprint_id       | uuid                | Reference to parent blueprint      |
| status             | session_status_type | Current status of the session      |
| context            | jsonb               | Additional context for the session |
| skill_level        | skill_level_type    | Target skill level                 |
| learning_objective | text                | Learning objective                 |
| created_at         | timestamp           | Creation timestamp                 |
| updated_at         | timestamp           | Last update timestamp              |

#### Reasoning Messages

Stores individual messages within reasoning sessions.

| Column     | Type              | Description                            |
| ---------- | ----------------- | -------------------------------------- |
| id         | uuid              | Primary key                            |
| session_id | uuid              | Reference to parent session            |
| role       | message_role_type | Message role (system, user, assistant) |
| content    | text              | Message content                        |
| created_at | timestamp         | Creation timestamp                     |

## Row-Level Security (RLS) Policies

Access control is implemented through RLS policies:

### Blueprints Policies

```sql
-- Owner can do anything with their blueprints
CREATE POLICY blueprint_owner_all ON public.blueprints
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Team members can view team blueprints
CREATE POLICY blueprint_team_view ON public.blueprints FOR SELECT
  USING (visibility = 'team' AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  ));

-- Anyone can view public blueprints
CREATE POLICY blueprint_public_view ON public.blueprints FOR SELECT
  USING (visibility = 'public');
```

### Blueprint Steps Policies

```sql
-- Owner has full access to their blueprint steps
CREATE POLICY blueprint_steps_owner_all ON public.blueprint_steps
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ))
  WITH CHECK (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE user_id = auth.uid()
  ));

-- View access for team blueprints
CREATE POLICY blueprint_steps_team_view ON public.blueprint_steps FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints
    WHERE visibility = 'team'
    AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  ));

-- View access for public blueprints
CREATE POLICY blueprint_steps_public_view ON public.blueprint_steps FOR SELECT
  USING (blueprint_id IN (
    SELECT id FROM public.blueprints WHERE visibility = 'public'
  ));
```

Similar policies are implemented for subtasks, comments, reasoning sessions, and messages, with appropriate access controls based on the parent objects.

## Data Migration

A PL/pgSQL function `migrate_blueprint_content()` is provided to migrate existing blueprint content from the jsonb structure to the new relational schema. The function:

1. Iterates through existing blueprints
2. Extracts steps from the JSON content
3. Creates step records with associated metadata
4. Creates subtask records if present
5. Updates the steps_count and search_query fields in the blueprints table

## Troubleshooting and Maintenance

When making future schema changes, consider:

1. **Run migrations incrementally**: Break down complex changes into smaller, manageable pieces as was done during the initial implementation.
2. **Test each change**: Verify each migration step before proceeding to the next one.
3. **Keep SQL backups**: Continue storing SQL commands in the private Supabase folder for reference.
4. **Update this documentation**: Maintain this document as the source of truth for the blueprint system schema.

## Type Generation

After schema changes, regenerate TypeScript types using:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > ./types/supabase-schema.ts
```

## Next Steps

Refer to `supabase_blueprint_guide.md` for implementation details on how to use the Blueprint API in your application code.
