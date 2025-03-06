#!/bin/bash

# Load environment variables
source .env.local

# Check if environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Missing Supabase environment variables"
  exit 1
fi

echo "Checking database schema..."

# Query to get table columns
query="SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"

# Execute the query
response=$(curl -s -X POST \
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
businesses_query="SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses');"
businesses_response=$(curl -s -X POST \
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