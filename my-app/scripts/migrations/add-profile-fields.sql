-- Add missing profile fields to the users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS skillLevel TEXT,
ADD COLUMN IF NOT EXISTS learningObjectives JSONB;

-- Comment explaining the migration
COMMENT ON COLUMN users.bio IS 'User biography text';
COMMENT ON COLUMN users.title IS 'User professional title';
COMMENT ON COLUMN users.skillLevel IS 'User AI skill level (basic, intermediate, advanced, specialist)';
COMMENT ON COLUMN users.learningObjectives IS 'JSON containing learning objective type and text'; 