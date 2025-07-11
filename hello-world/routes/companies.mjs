/**
 * Company-related route handlers
 * Example of how to add new endpoints in separate files
 */

import { createResponse } from '../utils/response.mjs';

// Example company data (in real app, this would come from a database)
const companies = [
  {
    id: 1,
    name: 'Tech Corp',
    industry: 'Technology',
    size: '500-1000',
    location: 'San Francisco, CA',
    description: 'Leading technology company focused on innovation...',
    website: 'https://techcorp.com',
    founded: 2010
  },
  {
    id: 2,
    name: 'StartupXYZ',
    industry: 'SaaS',
    size: '50-100',
    location: 'Remote',
    description: 'Fast-growing SaaS startup...',
    website: 'https://startupxyz.com',
    founded: 2020
  }
];

// Company route handlers
async function handleGetCompanies ({ queryStringParameters }) {
  const { industry, size, location } = queryStringParameters || {};

  let filteredCompanies = [...companies];

  if (industry) {
    filteredCompanies = filteredCompanies.filter(company =>
      company.industry.toLowerCase().includes(industry.toLowerCase())
    );
  }

  if (size) {
    filteredCompanies = filteredCompanies.filter(company => company.size === size);
  }

  if (location) {
    filteredCompanies = filteredCompanies.filter(company =>
      company.location.toLowerCase().includes(location.toLowerCase())
    );
  }

  return createResponse(200, {
    companies: filteredCompanies,
    count: filteredCompanies.length
  });
}

async function handleGetCompanyById ({ pathParameters }) {
  const { id } = pathParameters || {};

  if (!id) {
    return createResponse(400, {
      message: 'Company ID is required'
    });
  }

  const company = companies.find(c => c.id === parseInt(id));

  if (!company) {
    return createResponse(404, {
      message: 'Company not found'
    });
  }

  return createResponse(200, { company });
}

async function handleCreateCompany ({ body }) {
  const newCompany = JSON.parse(body);
  newCompany.id = companies.length + 1;
  newCompany.createdAt = new Date().toISOString();
  newCompany.updatedAt = new Date().toISOString();

  companies.push(newCompany);

  return createResponse(201, {
    message: 'Company created successfully',
    company: newCompany
  });
}

// Export company routes
export default {
  'GET /companies': handleGetCompanies,
  'GET /companies/{id}': handleGetCompanyById,
  'POST /companies': handleCreateCompany
};
