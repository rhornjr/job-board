/**
 * Job-related route handlers
 */

import ElasticsearchService from '../services/elasticsearch.mjs';
import { createResponse } from '../utils/response.mjs';

// In-memory storage for demo purposes (will be replaced with MySQL later)
const jobs = [
  {
    id: 1,
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    description: 'We\'re looking for a senior engineer to join our team...',
    salary: '$120,000 - $150,000',
    type: 'Full-time',
    postedDate: '2024-01-15',
    requirements: ['JavaScript', 'React', 'Node.js', 'AWS'],
    skills: ['JavaScript', 'React', 'Node.js', 'AWS', 'TypeScript'],
    experience: '5+ years',
    remote: false
  },
  {
    id: 2,
    title: 'Frontend Developer',
    company: 'StartupXYZ',
    location: 'Remote',
    description: 'Join our fast-growing startup as a frontend developer...',
    salary: '$80,000 - $100,000',
    type: 'Full-time',
    postedDate: '2024-01-14',
    requirements: ['React', 'TypeScript', 'CSS', 'Git'],
    skills: ['React', 'TypeScript', 'CSS', 'Git', 'JavaScript'],
    experience: '2+ years',
    remote: true
  }
];

// Initialize Elasticsearch service
const elasticsearchService = new ElasticsearchService();

// Job route handlers
async function handleGetJobs ({ queryStringParameters }) {
  // Check if this is a search request
  if (queryStringParameters && (queryStringParameters.q || queryStringParameters.location || queryStringParameters.company)) {
    return await handleSearchJobs({ queryStringParameters });
  }

  // Return all jobs (fallback to in-memory if Elasticsearch fails)
  try {
    const searchResult = await elasticsearchService.searchJobs('', { size: 100 });
    return createResponse(200, {
      jobs: searchResult.hits,
      count: searchResult.total,
      source: 'elasticsearch'
    });
  } catch (error) {
    console.warn('Elasticsearch search failed, using in-memory data:', error.message);
    return createResponse(200, {
      jobs,
      count: jobs.length,
      source: 'in-memory'
    });
  }
}

async function handleSearchJobs ({ queryStringParameters }) {
  try {
    const { q, location, company, type, remote, skills, size, from } = queryStringParameters || {};

    const filters = {};
    if (location) filters.location = location;
    if (company) filters.company = company;
    if (type) filters.type = type;
    if (remote !== undefined) filters.remote = remote === 'true';
    if (skills) filters.skills = skills.split(',');
    if (size) filters.size = parseInt(size);
    if (from) filters.from = parseInt(from);

    const searchResult = await elasticsearchService.searchJobs(q, filters);

    return createResponse(200, {
      jobs: searchResult.hits,
      total: searchResult.total,
      aggregations: searchResult.aggregations,
      query: q,
      filters,
      source: 'elasticsearch'
    });
  } catch (error) {
    console.warn('Elasticsearch search failed, using in-memory fallback:', error.message);
    return await handleInMemorySearch(queryStringParameters || {});
  }
}

async function handleInMemorySearch (queryParams) {
  let filteredJobs = [...jobs];
  const { q, location, company, type, remote } = queryParams;

  if (q) {
    const query = q.toLowerCase();
    filteredJobs = filteredJobs.filter(job =>
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query) ||
      job.requirements.some(req => req.toLowerCase().includes(query))
    );
  }

  if (location) {
    filteredJobs = filteredJobs.filter(job =>
      job.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  if (company) {
    filteredJobs = filteredJobs.filter(job =>
      job.company.toLowerCase().includes(company.toLowerCase())
    );
  }

  if (type) {
    filteredJobs = filteredJobs.filter(job => job.type === type);
  }

  if (remote !== undefined) {
    filteredJobs = filteredJobs.filter(job => job.remote === (remote === 'true'));
  }

  return createResponse(200, {
    jobs: filteredJobs,
    total: filteredJobs.length,
    query: queryParams.q,
    filters: queryParams,
    source: 'in-memory-fallback'
  });
}

async function handleGetAggregations () {
  try {
    const aggregations = await elasticsearchService.getAggregations();
    return createResponse(200, {
      aggregations,
      source: 'elasticsearch'
    });
  } catch (error) {
    console.warn('Elasticsearch aggregations failed:', error.message);
    return createResponse(503, {
      message: 'Search service temporarily unavailable',
      error: error.message
    });
  }
}

async function handleCreateJob ({ body }) {
  const newJob = JSON.parse(body);
  newJob.id = jobs.length + 1;
  newJob.postedDate = new Date().toISOString().split('T')[0];
  newJob.createdAt = new Date().toISOString();
  newJob.updatedAt = new Date().toISOString();

  // Add to in-memory storage
  jobs.push(newJob);

  // Index in Elasticsearch
  try {
    await elasticsearchService.indexJob(newJob);
  } catch (error) {
    console.warn('Failed to index job in Elasticsearch:', error.message);
  }

  return createResponse(201, {
    message: 'Job created successfully',
    job: newJob,
    indexed: true
  });
}

// Export job routes
export default {
  'GET /jobs': handleGetJobs,
  'GET /jobs/search': handleSearchJobs,
  'GET /jobs/aggregations': handleGetAggregations,
  'POST /jobs': handleCreateJob
};
