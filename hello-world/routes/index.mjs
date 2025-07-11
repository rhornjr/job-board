/**
 * Main router for Job Board API
 * Imports and combines all route handlers
 */

import jobRoutes from './jobs.mjs';
import healthRoutes from './health.mjs';
import companyRoutes from './companies.mjs';

// Combine all routes
const routes = {
  ...jobRoutes,
  ...healthRoutes,
  ...companyRoutes
};

export default routes;
