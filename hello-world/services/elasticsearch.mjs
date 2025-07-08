import { Client } from '@elastic/elasticsearch';

class ElasticsearchService {
  constructor () {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_ENDPOINT || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      },
      tls: {
        rejectUnauthorized: false // For development - should be true in production
      }
    });

    this.indexName = 'jobs';
  }

  async initializeIndex () {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.indexName
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: {
                  type: 'text',
                  analyzer: 'english',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                company: {
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                location: {
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                description: {
                  type: 'text',
                  analyzer: 'english'
                },
                salary: { type: 'keyword' },
                type: { type: 'keyword' },
                postedDate: { type: 'date' },
                requirements: {
                  type: 'keyword',
                  analyzer: 'standard'
                },
                skills: {
                  type: 'keyword',
                  analyzer: 'standard'
                },
                experience: { type: 'keyword' },
                remote: { type: 'boolean' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
              }
            },
            settings: {
              analysis: {
                analyzer: {
                  custom_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball']
                  }
                }
              }
            }
          }
        });

        console.log(`Created index: ${this.indexName}`);
      }
    } catch (error) {
      console.error('Error initializing Elasticsearch index:', error);
      throw error;
    }
  }

  async indexJob (job) {
    try {
      const document = {
        ...job,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.client.index({
        index: this.indexName,
        id: job.id.toString(),
        body: document
      });

      console.log(`Indexed job: ${job.id}`);
      return document;
    } catch (error) {
      console.error('Error indexing job:', error);
      throw error;
    }
  }

  async searchJobs (query, filters = {}) {
    try {
      const searchBody = {
        query: {
          bool: {
            must: [],
            filter: []
          }
        },
        sort: [
          { postedDate: { order: 'desc' } },
          { _score: { order: 'desc' } }
        ],
        size: filters.size || 20,
        from: filters.from || 0
      };

      // Text search
      if (query) {
        searchBody.query.bool.must.push({
          multi_match: {
            query,
            fields: ['title^3', 'company^2', 'description', 'requirements', 'skills'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }

      // Filters
      if (filters.location) {
        searchBody.query.bool.filter.push({
          term: { 'location.keyword': filters.location }
        });
      }

      if (filters.company) {
        searchBody.query.bool.filter.push({
          term: { 'company.keyword': filters.company }
        });
      }

      if (filters.type) {
        searchBody.query.bool.filter.push({
          term: { type: filters.type }
        });
      }

      if (filters.remote !== undefined) {
        searchBody.query.bool.filter.push({
          term: { remote: filters.remote }
        });
      }

      if (filters.skills && filters.skills.length > 0) {
        searchBody.query.bool.filter.push({
          terms: { skills: filters.skills }
        });
      }

      if (filters.salaryRange) {
        searchBody.query.bool.filter.push({
          range: {
            salary: {
              gte: filters.salaryRange.min,
              lte: filters.salaryRange.max
            }
          }
        });
      }

      const response = await this.client.search({
        index: this.indexName,
        body: searchBody
      });

      return {
        hits: response.hits.hits.map(hit => ({
          ...hit._source,
          score: hit._score
        })),
        total: response.hits.total.value,
        aggregations: response.aggregations
      };
    } catch (error) {
      console.error('Error searching jobs:', error);
      throw error;
    }
  }

  async getJobSuggestions (query, field = 'title') {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          suggest: {
            suggestions: {
              prefix: query,
              completion: {
                field: `${field}_suggest`,
                size: 5,
                skip_duplicates: true
              }
            }
          }
        }
      });

      return response.suggest.suggestions[0].options.map(option => option.text);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  async updateJob (jobId, updates) {
    try {
      const document = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.client.update({
        index: this.indexName,
        id: jobId.toString(),
        body: {
          doc: document
        }
      });

      console.log(`Updated job: ${jobId}`);
      return document;
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  }

  async deleteJob (jobId) {
    try {
      await this.client.delete({
        index: this.indexName,
        id: jobId.toString()
      });

      console.log(`Deleted job: ${jobId}`);
      return true;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  }

  async getAggregations () {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: 0,
          aggs: {
            companies: {
              terms: { field: 'company.keyword', size: 20 }
            },
            locations: {
              terms: { field: 'location.keyword', size: 20 }
            },
            job_types: {
              terms: { field: 'type', size: 10 }
            },
            skills: {
              terms: { field: 'skills', size: 30 }
            },
            remote_jobs: {
              terms: { field: 'remote' }
            }
          }
        }
      });

      return response.aggregations;
    } catch (error) {
      console.error('Error getting aggregations:', error);
      throw error;
    }
  }

  async healthCheck () {
    try {
      const response = await this.client.cluster.health();
      return {
        status: response.status,
        numberOfNodes: response.number_of_nodes,
        activeShards: response.active_shards,
        relocatingShards: response.relocating_shards,
        initializingShards: response.initializing_shards,
        unassignedShards: response.unassigned_shards
      };
    } catch (error) {
      console.error('Elasticsearch health check failed:', error);
      throw error;
    }
  }
}

export default ElasticsearchService;
