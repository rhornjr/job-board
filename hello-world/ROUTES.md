# Adding New Endpoints

This document explains how to add new endpoints to the Job Board API using the modular route structure.

## Current Structure

```
hello-world/
├── app.mjs                 # Main Lambda handler
├── routes/
│   ├── index.mjs          # Route aggregator
│   ├── jobs.mjs           # Job-related endpoints
│   ├── health.mjs         # Health check endpoints
│   └── companies.mjs      # Company-related endpoints (example)
├── services/
│   └── elasticsearch.mjs  # Elasticsearch service
└── utils/
    └── response.mjs       # Shared response utilities
```

## How to Add New Endpoints

### Option 1: Add to Existing Route File

If your new endpoint fits into an existing category (e.g., jobs, health), add it to the appropriate route file:

1. **Add the handler function** to the route file (e.g., `routes/jobs.mjs`)
2. **Add the route mapping** to the export object at the bottom of the file

Example:
```javascript
// In routes/jobs.mjs

async function handleGetJobById({ pathParameters }) {
  const { id } = pathParameters || {};
  // ... handler logic
}

export default {
  'GET /jobs': handleGetJobs,
  'GET /jobs/{id}': handleGetJobById,  // New endpoint
  // ... other routes
};
```

### Option 2: Create a New Route File (Recommended)

For new functionality, create a separate route file:

1. **Create a new file** in the `routes/` directory (e.g., `routes/users.mjs`)
2. **Import shared utilities**:
   ```javascript
   import { createResponse } from '../utils/response.mjs';
   ```
3. **Define your handlers**:
   ```javascript
   async function handleGetUsers({ queryStringParameters }) {
     // Your handler logic
     return createResponse(200, { users: [] });
   }
   ```
4. **Export the routes**:
   ```javascript
   export default {
     'GET /users': handleGetUsers,
     'POST /users': handleCreateUser,
     // ... other routes
   };
   ```
5. **Import in routes/index.mjs**:
   ```javascript
   import userRoutes from './users.mjs';
   
   const routes = {
     ...jobRoutes,
     ...healthRoutes,
     ...userRoutes  // Add your new routes
   };
   ```

## Path Parameters

The router supports path parameters using curly braces:

```javascript
'GET /users/{id}'  // Matches /users/123, /users/abc, etc.
'GET /jobs/{id}/applications/{applicationId}'  // Nested parameters
```

Path parameters are automatically extracted and passed to your handler in the `pathParameters` object.

## Query Parameters

Query parameters are automatically available in your handler:

```javascript
async function handleSearch({ queryStringParameters }) {
  const { q, page, limit } = queryStringParameters || {};
  // Use the parameters
}
```

## Response Format

Always use the shared `createResponse` utility:

```javascript
import { createResponse } from '../utils/response.mjs';

return createResponse(200, {
  data: yourData,
  message: 'Success'
});
```

## Example: Adding a New Endpoint

Let's say you want to add a `/applications` endpoint:

1. Create `routes/applications.mjs`:
```javascript
import { createResponse } from '../utils/response.mjs';

async function handleGetApplications({ queryStringParameters }) {
  // Your logic here
  return createResponse(200, { applications: [] });
}

export default {
  'GET /applications': handleGetApplications
};
```

2. Update `routes/index.mjs`:
```javascript
import applicationRoutes from './applications.mjs';

const routes = {
  ...jobRoutes,
  ...healthRoutes,
  ...companyRoutes,
  ...applicationRoutes  // Add this line
};
```

That's it! Your new endpoint will be automatically available.

## Best Practices

1. **Group related endpoints** in the same file
2. **Use descriptive function names** (e.g., `handleGetUsers`, `handleCreateUser`)
3. **Follow the existing pattern** for consistency
4. **Add error handling** to your handlers
5. **Use the shared response utility** for consistent API responses
6. **Update the API info endpoint** in `app.mjs` to document new endpoints 