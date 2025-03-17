// This is a simple test script to diagnose user lookup issues
// Run it with: node test-user-lookup.js

import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Run this with: NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node test-user-lookup.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test IDs
const authUserId = '74d145ac-277d-4177-9f16-e1519459e551';
const dbUserId = 'a734ebba-3270-4a33-9078-2c27f61a6811';
const testEmail = 'amadeu@elementone.ca'; // Update this with the actual email

async function testUserLookup() {
  console.log('======= Testing User Lookup =======');
  
  // Test 1: Look up by auth user ID
  console.log('\n1. Testing lookup by auth user ID:', authUserId);
  const { data: authUserData, error: authUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .single();
    
  console.log('Result:', authUserError ? 'Error' : 'Success');
  if (authUserError) {
    console.log('Error:', authUserError.message);
  } else {
    console.log('User found:', authUserData);
  }
  
  // Test 2: Look up by database user ID
  console.log('\n2. Testing lookup by database user ID:', dbUserId);
  const { data: dbUserData, error: dbUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', dbUserId)
    .single();
    
  console.log('Result:', dbUserError ? 'Error' : 'Success');
  if (dbUserError) {
    console.log('Error:', dbUserError.message);
  } else {
    console.log('User found:', dbUserData);
  }
  
  // Test 3: Look up by email
  console.log('\n3. Testing lookup by email:', testEmail);
  const { data: emailUserData, error: emailUserError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .single();
    
  console.log('Result:', emailUserError ? 'Error' : 'Success');
  if (emailUserError) {
    console.log('Error:', emailUserError.message);
  } else {
    console.log('User found:', emailUserData);
  }
  
  // Test 4: List all users
  console.log('\n4. Listing all users in the database');
  const { data: allUsers, error: allUsersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(10);
    
  console.log('Result:', allUsersError ? 'Error' : 'Success');
  if (allUsersError) {
    console.log('Error:', allUsersError.message);
  } else {
    console.log('Users found:', allUsers);
  }
}

testUserLookup().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
}); 