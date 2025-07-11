/**
 * Health check route handlers
 */

import ElasticsearchService from '../services/elasticsearch.mjs';
import { createResponse } from '../utils/response.mjs';

// Initialize Elasticsearch service
const elasticsearchService = new ElasticsearchService();

// Health route handlers
async function handleHealthCheck () {
  return createResponse(200, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      elasticsearch: 'checking...'
    }
  });
}

async function handleElasticsearchHealth () {
  try {
    const esHealth = await elasticsearchService.healthCheck();
    return createResponse(200, {
      status: 'healthy',
      elasticsearch: esHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createResponse(503, {
      status: 'unhealthy',
      elasticsearch: {
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}

// Export health routes
export default {
  'GET /health': handleHealthCheck,
  'GET /elasticsearch/health': handleElasticsearchHealth
};
