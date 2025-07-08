# GitHub Actions Setup Guide

This guide will help you set up GitHub Actions for continuous integration and deployment of your job board application to AWS.

## Prerequisites

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **AWS CLI**: Install and configure AWS CLI locally for testing

## Step 1: Create AWS IAM User for GitHub Actions

1. Go to AWS IAM Console
2. Create a new IAM user named `github-actions-job-board`
3. Attach the following policies:
   - `AWSServerlessAdministratorAccess` (for SAM deployments)
   - `AmazonElasticsearchServiceFullAccess` (for Elasticsearch management)
   - `CloudWatchLogsFullAccess` (for logging)

4. Create access keys for this user
5. Note down the Access Key ID and Secret Access Key

## Step 2: Configure GitHub Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add the following secrets:

- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `AWS_ACCOUNT_ID`: Your AWS account ID (12-digit number)

## Step 3: Set Up GitHub Environments

1. Go to **Settings > Environments**
2. Create a new environment called `production`
3. Add environment protection rules if needed (optional)
4. Add the same secrets as above to the environment

## Step 4: Configure AWS SAM

1. Install AWS SAM CLI locally:
   ```bash
   # macOS
   brew install aws-sam-cli
   
   # Linux
   pip install aws-sam-cli
   ```

2. Configure SAM for your AWS account:
   ```bash
   sam configure
   ```

## Step 5: Test the Setup

1. Push your code to the `main` branch
2. Check the **Actions** tab in GitHub to see the workflow running
3. Monitor the deployment in AWS CloudFormation console

## Workflow Overview

The GitHub Actions workflow includes:

### 1. Test Job
- Runs on every push and pull request
- Installs dependencies
- Runs unit tests
- Performs linting with ESLint

### 2. Security Scan Job
- Runs Trivy vulnerability scanner
- Uploads results to GitHub Security tab
- Runs after tests pass

### 3. Build Job
- Only runs on pushes to `main` branch
- Builds the SAM application
- Uploads build artifacts
- Requires test and security scan to pass

### 4. Deploy Job
- Only runs on pushes to `main` branch
- Deploys to AWS using SAM
- Tests the deployed API
- Comments deployment info on the commit

## Manual Elasticsearch Setup

To set up Elasticsearch infrastructure manually:

1. Go to **Actions** tab in GitHub
2. Select **Setup Elasticsearch Infrastructure**
3. Click **Run workflow**
4. Choose environment (dev/staging/prod)
5. Choose AWS region
6. Click **Run workflow**

This will:
- Deploy Elasticsearch domain using CDK
- Set up VPC, security groups, and IAM roles
- Configure logging and monitoring

## Environment Variables

The following environment variables are automatically set:

- `AWS_REGION`: us-east-1 (default)
- `STACK_NAME`: job-board
- `ELASTICSEARCH_ENDPOINT`: Set by SAM template
- `ELASTICSEARCH_USERNAME`: elastic
- `ELASTICSEARCH_PASSWORD`: changeme (use Secrets Manager in production)

## API Endpoints

After deployment, your API will have these endpoints:

- `GET /` - API information
- `GET /jobs` - Get all jobs (with optional search parameters)
- `GET /jobs/search` - Search jobs with Elasticsearch
- `GET /jobs/aggregations` - Get job aggregations
- `POST /jobs` - Create a new job
- `GET /health` - Health check
- `GET /elasticsearch/health` - Elasticsearch health check

## Search Examples

```bash
# Search for jobs
curl "https://your-api-gateway-url/Prod/jobs/search?q=react&location=remote"

# Get job aggregations
curl "https://your-api-gateway-url/Prod/jobs/aggregations"

# Filter by company
curl "https://your-api-gateway-url/Prod/jobs/search?company=Tech%20Corp"

# Filter by job type and remote work
curl "https://your-api-gateway-url/Prod/jobs/search?type=Full-time&remote=true"
```

## Monitoring and Logging

- **CloudWatch Logs**: Lambda function logs
- **CloudWatch Metrics**: API Gateway and Lambda metrics
- **Elasticsearch Logs**: Search service logs
- **GitHub Actions**: Build and deployment logs

## Troubleshooting

### Common Issues

1. **IAM Permissions**: Ensure the GitHub Actions user has sufficient permissions
2. **VPC Configuration**: Elasticsearch requires VPC setup
3. **Security Groups**: Ensure Lambda can access Elasticsearch
4. **Timeout Issues**: Increase Lambda timeout if needed

### Debug Commands

```bash
# Check SAM build locally
sam build

# Test locally
sam local start-api

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name job-board

# Check Elasticsearch domain
aws es describe-elasticsearch-domain --domain-name job-board-job-board
```

## Security Considerations

1. **Secrets Management**: Use AWS Secrets Manager for production credentials
2. **VPC Security**: Configure security groups properly
3. **IAM Roles**: Follow principle of least privilege
4. **HTTPS**: All endpoints use HTTPS
5. **Encryption**: Elasticsearch data is encrypted at rest

## Cost Optimization

1. **Elasticsearch**: Use t3.small for development, t3.medium for production
2. **Lambda**: Monitor memory usage and optimize
3. **Log Retention**: Set appropriate log retention periods
4. **Auto Scaling**: Configure Elasticsearch auto-scaling for production

## Next Steps

1. Set up MySQL database integration
2. Add user authentication
3. Build React frontend
4. Implement advanced search features
5. Add monitoring and alerting 