# Database Schema Restructure Plan

## Executive Summary

This document outlines a comprehensive restructuring of our database schema to address several identified issues and enhance our system to support B2B clients and organizations. The restructuring will focus on:

1. Clarifying naming conventions between user attributes and blueprint attributes
2. Adding organizational structure for B2B clients
3. Ensuring proper relationships between users, organizations, and blueprints
4. Correcting field naming inconsistencies

## Current Structure Analysis

### Users Table

| Field                    | Type             | Description                      | Issue                           |
| ------------------------ | ---------------- | -------------------------------- | ------------------------------- |
| email                    | varchar          | User's email address             | None                            |
| role                     | varchar          | User role in the system          | None                            |
| skill_level              | text             | User's self-assessed skill level | Naming conflict with blueprints |
| experience               | experience_level | User's experience level          | Purpose unclear vs skill_level  |
| learning_objectives      | text             | User's learning goals (plural)   | Naming conflict with blueprints |
| preferred_learning_style | text             | User's preferred way of learning | Purpose unclear                 |
| created_at               | timestamp        | Account creation timestamp       | None                            |
| updated_at               | timestamp        | Account update timestamp         | None                            |
| first_name               | text             | User's first name                | None                            |
| last_name                | text             | User's last name                 | None                            |
| id                       | uuid             | Primary key                      | None                            |

### Blueprints Table

| Field              | Type             | Description                                | Issue                           |
| ------------------ | ---------------- | ------------------------------------------ | ------------------------------- |
| title              | text             | Blueprint title                            | None                            |
| details            | text             | Blueprint details/description              | None                            |
| content            | jsonb            | Blueprint content structure                | None                            |
| is_verified        | bool             | Whether blueprint is verified              | None                            |
| created_at         | timestamp        | Creation timestamp                         | None                            |
| updated_at         | timestamp        | Update timestamp                           | None                            |
| user_id            | uuid             | Creator user ID                            | None                            |
| id                 | uuid             | Primary key                                | None                            |
| prompt             | text             | Original prompt used to create blueprint   | None                            |
| clone_count        | int4             | Number of times blueprint was cloned       | None                            |
| steps_count        | int4             | Number of steps in blueprint               | None                            |
| search_query       | text             | Query used for research                    | None                            |
| visibility         | visibility_type  | Blueprint visibility setting               | None                            |
| team_id            | uuid             | Team the blueprint belongs to              | Need to expand for orgs         |
| skill_level        | skill_level_type | Recommended user skill level for blueprint | Naming conflict with user table |
| learning_objective | text             | Learning objective (singular)              | Naming conflict with user table |
| complexity         | complexity_type  | Objective complexity of blueprint          | Confusion with skill_level      |
| estimated_time     | text             | Estimated time to complete                 | None                            |
| is_temporary       | bool             | Whether blueprint is temporary             | None                            |

## Issues to Address

1. **Naming Conflicts**: Similar field names have different meanings in different tables
2. **Unclear Purpose**: Some fields have unclear purposes or overlap with others
3. **Missing B2B Structure**: Need to add organizations, teams, and proper relationships
4. **Field Type Inconsistencies**: Some related fields use different types

## Proposed New Structure

### Organizations Table (NEW)

```sql
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.organizations IS 'Organizations for B2B clients';
COMMENT ON COLUMN public.organizations.domain IS 'Primary email domain for auto-assignment';
COMMENT ON COLUMN public.organizations.settings IS 'Organization-specific settings and preferences';
```

### Teams Table (NEW)

```sql
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.teams IS 'Teams within organizations';
COMMENT ON COLUMN public.teams.settings IS 'Team-specific settings and preferences';
```

### Organization Structure Enhancements

```sql
-- Add owner/primary contact fields to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS primary_contact_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS account_owner_id uuid REFERENCES auth.users(id);

-- Create organization type enum
CREATE TYPE org_type AS ENUM (
  'academic',
  'enterprise',
  'government',
  'non_profit',
  'smb',
  'startup',
  'individual'
);

-- Create organization size category enum
CREATE TYPE org_size_category AS ENUM (
  'individual',
  'small_team', -- 2-10 employees
  'smb',        -- 11-200 employees
  'mid_market', -- 201-1000 employees
  'enterprise'  -- 1000+ employees
);

-- Add organization classification fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type org_type DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS size_category org_size_category DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS employee_count integer;

-- Add additional metadata
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_address jsonb,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS max_users integer,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
```

#### Purpose:

- **primary_contact_id**: Technical contact person for the organization
- **account_owner_id**: Business relationship owner
- **org_type**: Classifies organizations by type (academic, enterprise, etc.)
- **size_category**: Classifies organizations by size
- **industry**: Identifies the sector in which the organization operates
- **billing_fields**: Support for B2B billing requirements

### Organization Roles Table (NEW)

```sql
-- Create organization roles table for fine-grained permissions
CREATE TABLE IF NOT EXISTS public.organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- org_admin, billing_admin, member, etc.
  permissions jsonb DEFAULT '{}'::jsonb, -- For custom permission sets
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, user_id, role)
);

-- Add index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_org_roles_user_org ON public.organization_roles(user_id, organization_id);
```

#### Purpose:

- Provides fine-grained role-based access control at the organization level
- Allows users to have multiple roles within an organization
- Supports custom permission sets through the JSON permissions field
- Complements the team-based structure with organization-wide roles

### User Field Updates

```sql
-- Rename conflicting fields and add organization relationship
ALTER TABLE public.users
  -- Rename for clarity
  RENAME COLUMN skill_level TO user_skill_level;

ALTER TABLE public.users
  RENAME COLUMN learning_objectives TO user_learning_goals;

-- Add organization and team relationships
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS primary_team_id uuid REFERENCES public.teams(id);

-- Update field comments
COMMENT ON COLUMN public.users.user_skill_level IS 'Self-assessed skill level of the user (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.users.experience IS 'General experience level in the field (years or category)';
COMMENT ON COLUMN public.users.user_learning_goals IS 'User''s learning objectives and goals';
COMMENT ON COLUMN public.users.preferred_learning_style IS 'User''s preferred learning approach (visual, hands-on, etc.)';
COMMENT ON COLUMN public.users.organization_id IS 'Organization the user belongs to (for B2B)';
COMMENT ON COLUMN public.users.primary_team_id IS 'Primary team the user belongs to';
```

### Blueprint Field Updates

```sql
-- Rename and clarify blueprint-specific fields
ALTER TABLE public.blueprints
  -- Rename for clarity
  RENAME COLUMN learning_objective TO blueprint_learning_focus;

-- Add comments
COMMENT ON COLUMN public.blueprints.skill_level IS 'Recommended user skill level for this blueprint (beginner, intermediate, advanced)';
COMMENT ON COLUMN public.blueprints.complexity IS 'Objective complexity rating of the blueprint tasks (low, medium, high)';
COMMENT ON COLUMN public.blueprints.blueprint_learning_focus IS 'Specific learning focus or objective of this blueprint';
COMMENT ON COLUMN public.blueprints.team_id IS 'Team that owns this blueprint';
```

### Team Members Table (NEW)

```sql
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Add indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- Add comments
COMMENT ON TABLE public.team_members IS 'Associates users with teams they belong to';
COMMENT ON COLUMN public.team_members.role IS 'User''s role within the team (member, admin, etc.)';
```

## Mapping Between Field Values

To ensure proper mapping between user skill levels and blueprint complexity, we should document the relationship:

```sql
-- Create a view to document the mapping
CREATE OR REPLACE VIEW public.skill_complexity_mapping AS
SELECT
    'beginner' AS user_skill_level,
    'low' AS blueprint_complexity,
    'Beginner users typically work with low complexity blueprints' AS description
UNION ALL
SELECT
    'intermediate' AS user_skill_level,
    'medium' AS blueprint_complexity,
    'Intermediate users typically work with medium complexity blueprints' AS description
UNION ALL
SELECT
    'advanced' AS user_skill_level,
    'high' AS blueprint_complexity,
    'Advanced users typically work with high complexity blueprints' AS description;

-- Add comment to the view
COMMENT ON VIEW public.skill_complexity_mapping IS 'Documents the mapping between user skill levels and blueprint complexity';
```

## Data Migration

### Step 1: Create New Tables

Run the SQL scripts above to create:

- organizations
- teams
- team_members

### Step 2: Update Existing Tables

Run the ALTER TABLE scripts to:

- Rename conflicting fields
- Add new relationship fields
- Add comments

### Step 3: Backfill Organization Data

If you have existing users who should be part of organizations:

```sql
-- For development/testing: Create a default organization
INSERT INTO public.organizations (name, domain)
VALUES ('Default Organization', 'example.com')
RETURNING id;

-- Assign all existing users without an organization to the default one
UPDATE public.users
SET organization_id = (SELECT id FROM public.organizations WHERE name = 'Default Organization')
WHERE organization_id IS NULL;
```

## Row-Level Security Updates

After implementing the schema changes, update RLS policies to account for the new organizational structure:

```sql
-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Organization policies (admins can manage)
CREATE POLICY org_admin_all ON public.organizations
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Users can view their own organization
CREATE POLICY org_user_view ON public.organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

-- Team policies
CREATE POLICY team_member_view ON public.teams FOR SELECT
  USING (id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));

-- Organization admins can manage teams
CREATE POLICY team_org_admin_all ON public.teams
  USING (organization_id IN (
    SELECT organization_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Update blueprint policies to include team access
CREATE POLICY blueprint_team_access ON public.blueprints FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
  ));
```

## API Updates Required

1. **User Profile API**:

   - Update references from `skill_level` to `user_skill_level`
   - Update references from `learning_objectives` to `user_learning_goals`

2. **Blueprint API**:

   - Update references from `learning_objective` to `blueprint_learning_focus`
   - Maintain proper mapping between `skill_level` and `complexity`

3. **New Organization/Team APIs**:
   - Create CRUD endpoints for managing organizations
   - Create CRUD endpoints for managing teams
   - Create endpoints for managing team membership

## Implementation Plan

1. **Phase 1: Schema Updates**

   - Run the table creation scripts
   - Run the ALTER TABLE scripts
   - Create the mapping view

2. **Phase 2: RLS Updates**

   - Enable RLS on new tables
   - Update/create policies

3. **Phase 3: Code Updates**

   - Update TypeScript interfaces
   - Update API calls
   - Update UI components

4. **Phase 4: Data Migration**
   - Create default organization
   - Assign users to organizations
   - Verify data integrity

## Marketing and Analytics Infrastructure

This section outlines the database structures needed to support marketing functions, user analytics, and integration with PostHog for event tracking. These structures will enable data-driven marketing decisions, identify upsell opportunities, and track user engagement metrics.

### User and Organization Analytics Tables

```sql
-- User Analytics Table
CREATE TABLE IF NOT EXISTS public.user_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login_at timestamp with time zone,
  login_count integer DEFAULT 0,
  feature_usage jsonb DEFAULT '{}'::jsonb,
  referral_source text,
  acquisition_channel text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  first_session_date timestamp with time zone,
  onboarding_completed_at timestamp with time zone,
  nps_score integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Organization Analytics Table
CREATE TABLE IF NOT EXISTS public.organization_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_users integer DEFAULT 0,
  active_users_7d integer DEFAULT 0,
  active_users_30d integer DEFAULT 0,
  blueprint_count integer DEFAULT 0,
  last_activity_at timestamp with time zone,
  subscription_tier text,
  subscription_status text,
  billing_cycle text,
  mrr numeric(10,2) DEFAULT 0,
  feature_usage jsonb DEFAULT '{}'::jsonb,
  health_score integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add indices for faster queries
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_org_analytics_org_id ON public.organization_analytics(organization_id);
```

#### Purpose:

- **user_analytics**: Tracks individual user engagement metrics, attribution data, and satisfaction metrics.
- **organization_analytics**: Aggregates organization-level metrics for B2B accounts, including health scores and subscription data.

### Marketing and Engagement Tables

```sql
-- Marketing Touchpoints Table
CREATE TABLE IF NOT EXISTS public.marketing_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  touchpoint_type text NOT NULL, -- email_opened, webinar_attended, demo_requested, etc.
  touchpoint_details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Feature Engagement Tracking
CREATE TABLE IF NOT EXISTS public.feature_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  usage_count integer DEFAULT 1,
  first_used_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone DEFAULT now()
);

-- Upsell Opportunity Tracking
CREATE TABLE IF NOT EXISTS public.upsell_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_type text NOT NULL, -- feature_limit_reached, high_usage, etc.
  trigger_details jsonb,
  status text DEFAULT 'identified', -- identified, presented, converted, dismissed
  presented_at timestamp with time zone,
  converted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### Purpose:

- **marketing_touchpoints**: Records all marketing interactions with users and organizations.
- **feature_usage_logs**: Detailed tracking of feature usage for product analytics.
- **upsell_opportunities**: Identifies and tracks potential upgrade opportunities.

### Feedback Collection

```sql
-- User Feedback Table
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  feedback_type text NOT NULL, -- nps, feature_request, bug_report, etc.
  score integer, -- For numeric ratings
  content text, -- Text feedback
  context jsonb, -- Information about where feedback was given
  created_at timestamp with time zone DEFAULT now()
);
```

#### Purpose:

- **user_feedback**: Structured collection of user feedback, including NPS scores, feature requests, and general comments.

### Extensions to Existing Tables

```sql
-- Add marketing fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_stage text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone;

-- Add marketing fields to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lifecycle_stage text DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS customer_success_manager text,
  ADD COLUMN IF NOT EXISTS next_renewal_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS usage_alerts jsonb DEFAULT '{}'::jsonb;
```

#### Purpose:

- Extends existing tables with fields relevant to marketing and customer lifecycle management.

### PostHog Integration

```sql
-- PostHog Integration Table
CREATE TABLE IF NOT EXISTS public.analytics_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  posthog_distinct_id text,
  segment_anonymous_id text,
  ga_client_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);
```

#### Purpose:

- **analytics_identifiers**: Maps internal user IDs to external analytics platform identifiers, enabling cross-platform data correlation.

### Automation and Update Triggers

```sql
-- Trigger to update user_analytics on login
CREATE OR REPLACE FUNCTION update_login_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.user_analytics
  SET
    login_count = login_count + 1,
    last_login_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update organizational metrics (to be called by scheduled job)
CREATE OR REPLACE FUNCTION update_org_analytics()
RETURNS void AS $$
BEGIN
  UPDATE public.organization_analytics oa
  SET
    active_users_7d = (
      SELECT COUNT(DISTINCT user_id)
      FROM public.user_analytics
      WHERE organization_id = oa.organization_id
      AND last_login_at > NOW() - INTERVAL '7 days'
    ),
    active_users_30d = (
      SELECT COUNT(DISTINCT user_id)
      FROM public.user_analytics
      WHERE organization_id = oa.organization_id
      AND last_login_at > NOW() - INTERVAL '30 days'
    ),
    blueprint_count = (
      SELECT COUNT(*)
      FROM public.blueprints
      WHERE team_id IN (
        SELECT id FROM public.teams WHERE organization_id = oa.organization_id
      )
    ),
    last_activity_at = (
      SELECT MAX(last_login_at)
      FROM public.user_analytics
      WHERE organization_id = oa.organization_id
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

#### Purpose:

- Provides automation for keeping analytics tables updated with the latest metrics.
- Reduces manual data maintenance requirements.

### Row-Level Security for Analytics Tables

```sql
-- Apply RLS to marketing and analytics tables
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_identifiers ENABLE ROW LEVEL SECURITY;

-- Basic policies for user data access
CREATE POLICY user_analytics_own ON public.user_analytics FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'analytics')
  ));

-- Org admin policies for organizational data
CREATE POLICY org_analytics_admin ON public.organization_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (role = 'admin' OR organization_id = organization_id)
  ));
```

#### Purpose:

- Ensures analytics data is properly secured with appropriate access controls.
- Allows administrators and analytics users to access aggregated data.

### Integration with Marketing Workflows

The marketing and analytics tables support several key marketing workflows:

1. **User Onboarding Tracking**:

   - Track onboarding completion rates
   - Identify users stuck in specific onboarding stages
   - Trigger automated emails for incomplete onboarding

2. **Customer Health Monitoring**:

   - Calculate health scores based on activity and engagement
   - Alert customer success teams about at-risk accounts
   - Identify upgrade candidates based on usage patterns

3. **Marketing Campaign Attribution**:

   - Track campaign effectiveness through UTM parameters
   - Measure conversion rates from different acquisition channels
   - Calculate customer acquisition costs by source

4. **Upsell Opportunity Management**:

   - Identify feature usage patterns that indicate upgrade potential
   - Track the conversion rate of presented upsell opportunities
   - Measure the revenue impact of upsell campaigns

5. **Feedback Collection and Analysis**:
   - Collect structured feedback through NPS and other surveys
   - Track feedback sentiment over time
   - Identify feature requests and prioritize based on user segments

## Conclusion

This restructuring will provide a more consistent and intuitive database schema, clarify the relationships between entities, and support B2B use cases through proper organizational structure. The renamed fields will avoid confusion between user attributes and blueprint attributes, while the added comments will document the purpose of each field for future reference.

The marketing and analytics infrastructure will enable data-driven decision making, help identify growth opportunities, and support customer retention strategies. By combining structured database tables with PostHog event tracking, the platform will have comprehensive visibility into user engagement and organizational health metrics.
