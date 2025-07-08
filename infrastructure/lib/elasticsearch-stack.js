const { Stack, Duration, RemovalPolicy } = require('aws-cdk-lib');
const { Construct } = require('constructs');
const { Vpc, SubnetType, SecurityGroup, Port } = require('aws-cdk-lib/aws-ec2');
const { Domain, ElasticsearchVersion } = require('@aws-cdk/aws-elasticsearch-alpha');
const { LogGroup, RetentionDays } = require('aws-cdk-lib/aws-logs');
const { Role, ServicePrincipal, ManagedPolicy } = require('aws-cdk-lib/aws-iam');

class JobBoardElasticsearchStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { environment } = props;
    const domainName = `job-board-${environment}`;

    // Create VPC for Elasticsearch (required for production)
    const vpc = new Vpc(this, 'ElasticsearchVPC', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'public',
          subnetType: SubnetType.PUBLIC,
        }
      ],
    });

    // Create security group for Elasticsearch
    const elasticsearchSecurityGroup = new SecurityGroup(this, 'ElasticsearchSecurityGroup', {
      vpc,
      description: 'Security group for Elasticsearch domain',
      allowAllOutbound: true,
    });

    // Allow HTTPS access from Lambda functions (we'll update this when we add Lambda)
    elasticsearchSecurityGroup.addIngressRule(
      elasticsearchSecurityGroup,
      Port.tcp(443),
      'Allow HTTPS access from within the security group'
    );

    // Create CloudWatch log group for Elasticsearch
    const elasticsearchLogGroup = new LogGroup(this, 'ElasticsearchLogGroup', {
      logGroupName: `/aws/elasticsearch/${domainName}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create IAM role for Elasticsearch
    const elasticsearchRole = new Role(this, 'ElasticsearchRole', {
      assumedBy: new ServicePrincipal('es.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSElasticsearchServiceRole'),
      ],
    });

    // Create Elasticsearch domain
    const elasticsearchDomain = new Domain(this, 'ElasticsearchDomain', {
      domainName: domainName,
      version: ElasticsearchVersion.V7_10,
      vpc,
      vpcSubnets: [
        {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      securityGroups: [elasticsearchSecurityGroup],
      capacity: {
        dataNodes: environment === 'prod' ? 2 : 1,
        dataNodeInstanceType: environment === 'prod' ? 't3.medium.elasticsearch' : 't3.small.elasticsearch',
      },
      ebs: {
        volumeSize: environment === 'prod' ? 100 : 20,
        volumeType: 'gp3',
      },
      zoneAwareness: {
        enabled: environment === 'prod',
      },
      encryptionAtRest: {
        enabled: true,
      },
      nodeToNodeEncryption: {
        enabled: true,
      },
      enforceHttps: true,
      fineGrainedAccessControl: {
        masterUserArn: elasticsearchRole.roleArn,
      },
      logging: {
        slowSearchLogEnabled: true,
        slowSearchLogLevel: 'INFO',
        slowIndexLogEnabled: true,
        slowIndexLogLevel: 'INFO',
        appLogEnabled: true,
        appLogLevel: 'INFO',
        auditLogEnabled: environment === 'prod',
        auditLogLevel: 'INFO',
      },
      useUnsignedBasicAuth: false,
      accessPolicies: [
        {
          Effect: 'Allow',
          Principal: {
            AWS: elasticsearchRole.roleArn,
          },
          Action: 'es:*',
          Resource: `arn:aws:es:${this.region}:${this.account}:domain/${domainName}/*`,
        },
      ],
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Grant permissions to the log group
    elasticsearchLogGroup.grantWrite(elasticsearchRole);

    // Outputs
    this.addOutput('ElasticsearchDomainName', {
      value: elasticsearchDomain.domainName,
      description: 'Name of the Elasticsearch domain',
      exportName: `${this.stackName}-DomainName`,
    });

    this.addOutput('ElasticsearchDomainEndpoint', {
      value: elasticsearchDomain.domainEndpoint,
      description: 'Endpoint of the Elasticsearch domain',
      exportName: `${this.stackName}-DomainEndpoint`,
    });

    this.addOutput('ElasticsearchDomainArn', {
      value: elasticsearchDomain.domainArn,
      description: 'ARN of the Elasticsearch domain',
      exportName: `${this.stackName}-DomainArn`,
    });

    this.addOutput('ElasticsearchSecurityGroupId', {
      value: elasticsearchSecurityGroup.securityGroupId,
      description: 'Security Group ID for Elasticsearch',
      exportName: `${this.stackName}-SecurityGroupId`,
    });

    this.addOutput('ElasticsearchVpcId', {
      value: vpc.vpcId,
      description: 'VPC ID for Elasticsearch',
      exportName: `${this.stackName}-VpcId`,
    });
  }
}

module.exports = { JobBoardElasticsearchStack }; 