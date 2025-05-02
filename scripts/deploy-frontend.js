/**
 * Cloud Migration Strategy Planner - Frontend Deployment Script
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configure AWS region
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
AWS.config.update({ region: AWS_REGION });

// CloudFormation stack name
const STACK_NAME = 'cloud-migration-strategy-planner';

// S3 bucket for frontend deployment (will be created if it doesn't exist)
let FRONTEND_BUCKET = `cloud-migration-planner-frontend-${Date.now().toString().substring(0, 10)}`;

// Frontend build directory - using quotes to handle spaces in path
const FRONTEND_BUILD_DIR = `"${path.resolve(__dirname, '../frontend/public')}"`;

// Main function
async function deployFrontend() {
  try {
    console.log('Starting frontend deployment for Cloud Migration Strategy Planner...');
    
    // Check if AWS CLI is installed
    checkAwsCliInstalled();
    
    // Check if AWS credentials are configured
    checkAwsCredentials();
    
    // Get API Gateway URL from deployed stack
    const apiUrl = await getApiGatewayUrl();
    
    // Update frontend config with API URL
    updateFrontendConfig(apiUrl);
    
    // Create S3 bucket for frontend if it doesn't exist
    await createFrontendBucket();
    
    // Deploy frontend to S3
    await uploadFrontendToS3();
    
    // Configure S3 bucket for static website hosting
    await configureBucketWebsiteHosting();
    
    // Verify deployment
    await verifyDeployment();
    
    // Get frontend URL
    const frontendUrl = `http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com`;
    
    console.log('\n========== Frontend Deployment Complete ==========');
    console.log(`Frontend URL: ${frontendUrl}`);
    console.log(`API Gateway URL: ${apiUrl}`);
    console.log('=======================================\n');
    
    console.log('Note: It may take a few minutes for the deployment to fully propagate.');
    console.log('Make sure to update the CORS settings in API Gateway if you encounter CORS issues.');
    
  } catch (error) {
    console.error('Frontend deployment failed:', error.message);
    process.exit(1);
  }
}

// Check if AWS CLI is installed
function checkAwsCliInstalled() {
  try {
    console.log('Checking if AWS CLI is installed...');
    execSync('aws --version', { stdio: 'ignore' });
    console.log('✅ AWS CLI is installed');
  } catch (error) {
    throw new Error('AWS CLI is not installed. Please install it before proceeding: https://aws.amazon.com/cli/');
  }
}

// Check if AWS credentials are configured
function checkAwsCredentials() {
  try {
    console.log('Checking if AWS credentials are configured...');
    execSync('aws sts get-caller-identity', { stdio: 'ignore' });
    console.log('✅ AWS credentials are configured');
  } catch (error) {
    throw new Error('AWS credentials are not configured. Please run "aws configure" to set up your credentials.');
  }
}

// Get API Gateway URL from deployed stack
async function getApiGatewayUrl() {
  console.log('Getting API Gateway URL from deployed stack...');
  
  const cloudformation = new AWS.CloudFormation();
  
  try {
    const { Stacks } = await cloudformation.describeStacks({ StackName: STACK_NAME }).promise();
    
    if (!Stacks || Stacks.length === 0) {
      throw new Error(`Stack ${STACK_NAME} not found`);
    }
    
    const outputs = Stacks[0].Outputs || [];
    const apiEndpointOutput = outputs.find(output => output.OutputKey === 'ApiEndpoint');
    
    if (!apiEndpointOutput) {
      throw new Error('API Gateway URL not found in stack outputs');
    }
    
    console.log(`✅ API Gateway URL: ${apiEndpointOutput.OutputValue}`);
    return apiEndpointOutput.OutputValue;
  } catch (error) {
    console.error('Error getting API Gateway URL:', error.message);
    return 'https://your-api-id.execute-api.your-region.amazonaws.com/dev';
  }
}

// Update frontend config with API URL
function updateFrontendConfig(apiUrl) {
  console.log('Updating frontend config with API URL...');
  
  const configFilePath = path.resolve(__dirname, '../frontend/public/js/config.js');
  
  try {
    let configContent = fs.readFileSync(configFilePath, 'utf8');
    
    // Replace base URL in the config
    configContent = configContent.replace(
      /BASE_URL: '.*'/,
      `BASE_URL: '${apiUrl}'`
    );
    
    fs.writeFileSync(configFilePath, configContent);
    console.log('✅ Frontend config updated successfully');
  } catch (error) {
    console.error('Error updating frontend config:', error.message);
  }
}

// Create S3 bucket for frontend if it doesn't exist
async function createFrontendBucket() {
  console.log('Creating S3 bucket for frontend...');
  
  const s3 = new AWS.S3();
  
  try {
    // Try to use stack name as bucket prefix
    FRONTEND_BUCKET = `${STACK_NAME}-frontend-${Date.now().toString().substring(0, 10)}`;
    
    // Create bucket with proper location constraint
    const createBucketParams = {
      Bucket: FRONTEND_BUCKET,
      ObjectOwnership: 'BucketOwnerEnforced' // Disable ACLs
    };
    
    // Only add LocationConstraint if not in us-east-1
    if (AWS_REGION !== 'us-east-1') {
      createBucketParams.CreateBucketConfiguration = {
        LocationConstraint: AWS_REGION
      };
    }
    
    // Create the bucket
    await s3.createBucket(createBucketParams).promise();
    console.log(`✅ S3 bucket '${FRONTEND_BUCKET}' created successfully`);
    
    // Configure bucket for public access
    await s3.putPublicAccessBlock({
      Bucket: FRONTEND_BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false
      }
    }).promise();
    
    console.log('✅ S3 bucket configured for public access');
    
  } catch (error) {
    if (error.code === 'BucketAlreadyOwnedByYou') {
      console.log(`✅ S3 bucket '${FRONTEND_BUCKET}' already exists`);
    } else {
      console.error('Error creating S3 bucket:', error.message);
      // Try with a different name
      FRONTEND_BUCKET = `cloud-migration-planner-frontend-${Date.now()}`;
      await createFrontendBucket();
    }
  }
}

// Deploy frontend to S3
async function uploadFrontendToS3() {
  console.log('Uploading frontend files to S3...');
  
  try {
    // Verify bucket exists before sync
    const s3 = new AWS.S3();
    await s3.headBucket({ Bucket: FRONTEND_BUCKET }).promise();
    
    // Sync frontend files to S3 bucket without ACL flag
    console.log(`Running: aws s3 sync ${FRONTEND_BUILD_DIR} s3://${FRONTEND_BUCKET}`);
    execSync(`aws s3 sync ${FRONTEND_BUILD_DIR} s3://${FRONTEND_BUCKET}`, { stdio: 'inherit' });
    
    console.log('✅ Frontend files uploaded successfully');
  } catch (error) {
    console.error('Error uploading frontend files:', error.message);
    throw error;
  }
}

// Configure S3 bucket for static website hosting
async function configureBucketWebsiteHosting() {
  console.log('Configuring S3 bucket for static website hosting...');
  
  const s3 = new AWS.S3();
  
  try {
    // Configure bucket for website hosting
    await s3.putBucketWebsite({
      Bucket: FRONTEND_BUCKET,
      WebsiteConfiguration: {
        IndexDocument: {
          Suffix: 'index.html'
        },
        ErrorDocument: {
          Key: 'index.html'
        }
      }
    }).promise();
    
    console.log('✅ S3 bucket configured for static website hosting');
    
    // Make bucket public using bucket policy
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${FRONTEND_BUCKET}/*`
        }
      ]
    };
    
    try {
      await s3.putBucketPolicy({
        Bucket: FRONTEND_BUCKET,
        Policy: JSON.stringify(bucketPolicy)
      }).promise();
      
      console.log('✅ S3 bucket policy configured for public access');
    } catch (policyError) {
      console.error('Error setting bucket policy. You may need to disable Block Public Access settings in the S3 console.');
      console.error('Policy error:', policyError.message);
    }
  } catch (error) {
    console.error('Error configuring bucket website hosting:', error.message);
  }
}

// Verify deployment and check all settings are configured correctly
async function verifyDeployment() {
  console.log('\nVerifying deployment settings...');
  
  const s3 = new AWS.S3();
  
  try {
    // 1. Check website configuration
    try {
      const websiteConfig = await s3.getBucketWebsite({ Bucket: FRONTEND_BUCKET }).promise();
      console.log('✅ Website configuration:', JSON.stringify(websiteConfig, null, 2));
    } catch (error) {
      console.error('❌ Website configuration error:', error.message);
    }
    
    // 2. Check bucket policy
    try {
      const policyResult = await s3.getBucketPolicy({ Bucket: FRONTEND_BUCKET }).promise();
      console.log('✅ Bucket policy:', policyResult.Policy);
    } catch (error) {
      console.error('❌ Bucket policy error:', error.message);
      
      // Try to fix by applying policy again
      console.log('Attempting to fix bucket policy...');
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${FRONTEND_BUCKET}/*`
          }
        ]
      };
      
      await s3.putBucketPolicy({
        Bucket: FRONTEND_BUCKET,
        Policy: JSON.stringify(bucketPolicy)
      }).promise();
      
      console.log('✅ Re-applied bucket policy for public access');
    }
    
    // 3. Check public access block configuration
    try {
      const publicAccessConfig = await s3.getPublicAccessBlock({ Bucket: FRONTEND_BUCKET }).promise();
      console.log('✅ Public access configuration:', JSON.stringify(publicAccessConfig.PublicAccessBlockConfiguration, null, 2));
      
      // If BlockPublicPolicy is true, fix it
      if (publicAccessConfig.PublicAccessBlockConfiguration.BlockPublicPolicy) {
        console.log('❌ BlockPublicPolicy is true, fixing...');
        await s3.putPublicAccessBlock({
          Bucket: FRONTEND_BUCKET,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            BlockPublicPolicy: false,
            RestrictPublicBuckets: false
          }
        }).promise();
        console.log('✅ Fixed public access block settings');
      }
    } catch (error) {
      console.error('❌ Public access configuration error:', error.message);
    }
    
    // 4. Try to access website URL
    const frontendUrl = `http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com`;
    console.log(`\nTesting website URL: ${frontendUrl}`);
    console.log('Note: If you cannot access this URL, you may need to manually check settings in AWS console:');
    console.log('1. Go to S3 console: https://console.aws.amazon.com/s3/');
    console.log(`2. Select bucket: ${FRONTEND_BUCKET}`);
    console.log('3. Go to "Permissions" tab and ensure:');
    console.log('   - "Block all public access" is OFF for "Block public policies"');
    console.log('   - Bucket policy exists allowing public read access');
    console.log('4. Go to "Properties" tab and verify static website hosting is enabled');
    
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

// Run the deployment
deployFrontend(); 