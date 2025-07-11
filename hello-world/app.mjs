/**
 * Job Board API - Lambda Function
 * Handles job listing operations via API Gateway with Elasticsearch integration
 */

import ElasticsearchService from './services/elasticsearch.mjs';
import routes from './routes/index.mjs';
import { createResponse } from './utils/response.mjs';

// Initialize Elasticsearch service
const elasticsearchService = new ElasticsearchService();

export const lambdaHandler = async (event, _context) => {
  const { httpMethod, path, body, queryStringParameters } = event;
  let { pathParameters } = event;

  try {
    // Initialize Elasticsearch index on cold start (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      try {
        await elasticsearchService.initializeIndex();
      } catch (error) {
        console.warn('Elasticsearch initialization failed, using in-memory storage:', error.message);
      }
    }

    // Handle API info endpoint
    if (httpMethod === 'GET' && path === '/') {
      return await handleApiInfo();
    }

    // Try exact route match first
    const routeKey = `${httpMethod} ${path}`;
    let handler = routes[routeKey];

    // If no exact match, try to match with path parameters
    if (!handler) {
      for (const [route, routeHandler] of Object.entries(routes)) {
        const [method, routePath] = route.split(' ');

        if (method === httpMethod && routePath.includes('{')) {
          // Convert route path to regex pattern
          const pattern = routePath.replace(/\{[^}]+\}/g, '([^/]+)');
          const regex = new RegExp(`^${pattern}$`);

          if (regex.test(path)) {
            // Extract path parameters
            const matches = path.match(regex);
            const paramNames = (routePath.match(/\{([^}]+)\}/g) || []).map(p => p.slice(1, -1));
            const extractedParams = {};

            paramNames.forEach((name, index) => {
              extractedParams[name] = matches[index + 1];
            });

            handler = routeHandler;
            pathParameters = { ...pathParameters, ...extractedParams };
            break;
          }
        }
      }
    }

    if (handler) {
      return await handler({ body, queryStringParameters, pathParameters });
    }

    // Handle undefined routes
    return createResponse(404, {
      message: 'Endpoint not found',
      path,
      method: httpMethod,
      availableEndpoints: Object.keys(routes)
    });
  } catch (error) {
    console.error('Lambda handler error:', error);
    return createResponse(500, {
      message: 'Internal server error',
      error: error.message
    });
  }
};

// API Info handler
async function handleApiInfo () {
  return createResponse(200, {
    message: 'Job Board API',
    version: '1.0.0',
    availableEndpoints: [
      'GET /jobs - Get all job listings',
      'GET /jobs/search - Search jobs with Elasticsearch',
      'POST /jobs - Create a new job listing',
      'GET /jobs/aggregations - Get job aggregations',
      'GET /companies - Get all companies',
      'GET /companies/{id} - Get company by ID',
      'POST /companies - Create a new company',
      'GET /health - Health check',
      'GET /elasticsearch/health - Elasticsearch health check'
    ],
    documentation: 'This is a job board API built with AWS SAM, Node.js, and Elasticsearch'
  });
}
