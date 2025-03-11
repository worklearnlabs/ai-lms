# Blueprint Creation Technical Notes

This document captures technical implementation details, challenges, and solutions related to the Blueprint Creation flow. It serves as a reference for developers working on the system, particularly around data flow, user ID mapping, and AI integration.

## Key Issues & Solutions

We've identified and resolved several issues in the blueprint creation flow related to data storage and user identity:

### 1. Blueprint Title Generation

**Issue**: The blueprint title wasn't being properly generated and stored during the blueprint creation flow.

**Solution**:

- Modified the system prompt in `/api/blueprints/questions/route.ts` to request a `blueprint_title` alongside the questions
- Added logic to extract the title from the AI response
- Update the blueprint with this AI-generated title immediately after receiving it

**Implementation Details**:

```typescript
// Extract the blueprint title if available
let blueprintTitle = null;
if (questionsData.blueprint_title) {
  blueprintTitle = questionsData.blueprint_title;
  console.log("Extracted blueprint title:", blueprintTitle);
  // ... update blueprint with this title
}
```

### 2. Prompt Storage

**Issue**: The user's original prompt wasn't being correctly stored in the database (either missing or in the wrong field).

**Solution**:

- Identified that the frontend was sending `searchQuery` (camelCase) while the API expected `search_query` (snake_case)
- Updated the backend API to handle both formats
- Ensured that the original prompt is stored in both the `prompt` and `search_query` fields for consistency
- Preserved the prompt during subsequent title updates

**Implementation Details**:

```typescript
// In API route
const search_query = jsonData.search_query || jsonData.searchQuery;
const blueprintPrompt = search_query || title;

// In database insertion
const result = await serviceClient.from("blueprints").insert({
  title,
  search_query,
  prompt: blueprintPrompt, // Store the original query/prompt
  is_temporary: true,
  content,
});
```

### 3. User ID Mapping

**Issue**: The wrong user ID was being used (auth ID instead of application user ID), causing foreign key constraint violations.

**Solution**:

- Identified that we were using the auth user ID directly from the JWT token
- Integrated with the `ensureUserInDatabase` utility to properly map auth users to application users
- Added checks to only update the user ID if it's not already set
- Added comprehensive error handling and logging

**Implementation Details**:

```typescript
// Get auth user ID from token
const authUserId = await getUserIdFromToken(token);

// Map auth user ID to application user ID
const {
  success,
  userId: applicationUserId,
  error,
} = await ensureUserInDatabase(authUserId);

// Only set user_id if it's not already set
if (needsUserUpdate) {
  updateData.user_id = applicationUserId;
}
```

### 4. Blueprint Filtering by User ID

**Issue**: Blueprints were not being filtered by user ID in the API, causing them not to appear on the "My Blueprints" page.

**Solution**:

- Updated the GET endpoint in `/api/blueprints/route.ts` to filter blueprints by the authenticated user's ID
- Implemented proper auth user to application user mapping using the `ensureUserInDatabase` utility
- Added logic to return only public blueprints for non-authenticated users
- Updated the frontend to use the real API endpoint instead of mock data
- Added proper filtering to the `blueprintApi.getBlueprints()` method to respect user context

**Implementation Details**:

```typescript
// Backend API route
const { success, userId, error } = await ensureUserInDatabase(authUserId);

// Fetch blueprints for the authenticated user (either their own or public ones)
const { data, error: fetchError } = await serviceClient
  .from("blueprints")
  .select("*")
  .or(`user_id.eq.${userId},visibility.eq.public`)
  .order("created_at", { ascending: false });

// Frontend component
useEffect(() => {
  async function fetchBlueprints() {
    const response = await fetch("/api/blueprints");
    const data = await response.json();
    setBlueprints(data);
  }
  fetchBlueprints();
}, []);
```

## System Architecture Insights

### Auth vs. Application User IDs

The system maintains two separate user identities:

- **Auth User ID**: Managed by Supabase Auth, used for authentication
- **Application User ID**: Stored in the `users` table, used for application data relationships

The `ensureUserInDatabase` utility bridges these identities by:

1. Taking an auth user ID as input
2. Checking if a user with this ID exists in the application database
3. If not, checking for a user with the same email
4. Creating a new user record if needed
5. Returning the correct application user ID

### Blueprint Data Flow

The blueprint creation follows this sequence:

1. Frontend creates a temporary blueprint with basic info
2. AI generates clarifying questions and a suggested title
3. System extracts the title and updates the blueprint
4. User answers questions, which are stored in `blueprint_questions`
5. Final blueprint is created with all collected data

## Best Practices for Future Development

1. **Consistent Field Naming**: Use either camelCase or snake_case consistently throughout the codebase. If mixing is necessary, ensure the API can handle both formats.

2. **User ID Mapping**: Always use the `ensureUserInDatabase` utility when mapping between auth users and application users.

3. **Data Preservation**: When updating records, retrieve existing data first and preserve important fields during updates.

4. **Error Logging**: Implement comprehensive error logging and verification to help diagnose issues:

   ```typescript
   // Log before update
   console.log("Current data before update:", currentData);

   // Perform update
   const response = await updateData();

   // Verify after update
   const verifyResponse = await fetchUpdatedData();
   console.log("Data after update:", verifyResponse);
   ```

5. **Foreign Key Constraints**: Be aware of foreign key constraints in the database schema and ensure you're using the correct IDs that satisfy these constraints.

## Conclusion

These improvements have significantly enhanced the reliability of the blueprint creation flow, ensuring:

- User-friendly, AI-generated titles for blueprints
- Proper storage of the original user prompt
- Correct association between blueprints and users
- Consistent data handling throughout the process

These changes maintain data integrity while providing a smooth user experience during the blueprint creation process.
