#!/usr/bin/env node

const { App } = require('aws-cdk-lib');
const { JobBoardElasticsearchStack } = require('./lib/elasticsearch-stack');

const app = new App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';

// Create Elasticsearch stack
new JobBoardElasticsearchStack(app, `JobBoardElasticsearchStack-${environment}`, {
  environment: environment,
  description: `Elasticsearch infrastructure for Job Board - ${environment} environment`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
  }
});

app.synth(); 