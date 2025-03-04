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
  
  # Read the SQL file and replace newlines with spaces
  local sql=$(cat "$file" | tr '\n' ' ')
  
  # Execute the SQL using curl
  local response=$(curl -s -X POST \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$sql\"}")
  
  echo "Response: $response"
  
  # Check for errors
  if [[ $response == *"error"* ]]; then
    echo "Migration failed: $response"
    return 1
  else
    echo "Migration completed successfully!"
    return 0
  fi
}

# Function to check schema
check_schema() {
  echo "Checking users table schema..."
  
  # Get users table columns
  local response=$(curl -s -X GET \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?limit=1" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
  
  echo "Users table sample: $response"
  
  # Check businesses table
  echo "Checking businesses table..."
  local businesses_response=$(curl -s -X GET \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/businesses?limit=1" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
  
  echo "Businesses table response: $businesses_response"
  
  # Check if businesses table exists
  if [[ $businesses_response == *"does not exist"* ]]; then
    echo "❌ Businesses table does not exist"
  else
    echo "✅ Businesses table exists"
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