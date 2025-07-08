'use strict';

import { lambdaHandler } from '../../app.mjs';
import { expect } from 'chai';

describe('Tests index', function () {
  it('verifies successful response', async () => {
    // Set test environment to skip Elasticsearch initialization
    process.env.NODE_ENV = 'test';

    const event = {
      httpMethod: 'GET',
      path: '/',
      body: null,
      queryStringParameters: null
    };
    const context = {};

    const result = await lambdaHandler(event, context);

    expect(result).to.be.an('object');
    expect(result.statusCode).to.equal(200);
    expect(result.body).to.be.an('string');

    const response = JSON.parse(result.body);

    expect(response).to.be.an('object');
    expect(response.message).to.be.equal('Job Board API');
    expect(response.version).to.be.equal('1.0.0');
  });
});
