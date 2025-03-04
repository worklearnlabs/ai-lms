#!/bin/bash

# Load environment variables
source .env.local

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing Supabase environment variables"
  exit 1
fi

# Function to run a SQL file
run_migration() {
  local file=$1
  echo "Running migration: $file..."
  
  # Read the SQL file
  local sql=$(cat "$file")
  
  # Execute the SQL using curl
  local response=$(curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$sql\"}")
  
  # Check for errors
  if [[ $response == *"error"* ]]; then
    echo "Migration failed: $response"
    return 1
  else
    echo "Migration completed successfully!"
    return 0
  fi
}

# Function to check table schema
check_schema() {
  echo "Checking database schema..."
  
  # Query to get table columns
  local query="SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"
  
  # Execute the query
  local response=$(curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\"}")
  
  echo "Users table schema:"
  echo "$response" | grep -v "error"
  
  # Check for specific columns
  if [[ $response == *"first_name"* ]]; then
    echo "✅ first_name column exists"
  else
    echo "❌ first_name column does not exist"
  fi
  
  if [[ $response == *"last_name"* ]]; then
    echo "✅ last_name column exists"
  else
    echo "❌ last_name column does not exist"
  fi
  
  if [[ $response == *"account_type"* ]]; then
    echo "✅ account_type column exists"
  else
    echo "❌ account_type column does not exist"
  fi
  
  if [[ $response == *"business_id"* ]]; then
    echo "✅ business_id column exists"
  else
    echo "❌ business_id column does not exist"
  fi
  
  if [[ $response == *"skill_level"* ]]; then
    echo "✅ skill_level column exists"
  else
    echo "❌ skill_level column does not exist"
  fi
  
  # Check businesses table
  local businesses_query="SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses');"
  local businesses_response=$(curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$businesses_query\"}")
  
  if [[ $businesses_response == *"true"* ]]; then
    echo "✅ businesses table exists"
  else
    echo "❌ businesses table does not exist"
  fi
}

# Main script
echo "Starting database migrations..."

# List of migration files to run in order
migrations=(
  "src/lib/migrations/add-profile-fields.sql"
  "src/lib/migrations/create-business-table.sql"
  "src/lib/migrations/update-users-table.sql"
)

# Run each migration
for migration in "${migrations[@]}"; do
  if [ -f "$migration" ]; then
    run_migration "$migration"
    if [ $? -ne 0 ]; then
      echo "Migration chain stopped at $migration"
      exit 1
    fi
  else
    echo "Migration file not found: $migration, skipping..."
  fi
done

echo "All migrations completed successfully!"

# Check schema after migrations
check_schema 