/**
 * Cloud Migration Strategy Planner - Deployment Script
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configure AWS region
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
AWS.config.update({ region: AWS_REGION });

// CloudFormation stack name
const STACK_NAME = 'cloud-migration-strategy-planner';

// S3 bucket for frontend deployment (will be created if it doesn't exist)
let FRONTEND_BUCKET = `cloud-migration-planner-frontend-${Date.now().toString().substring(0, 10)}`;

// SAM template path - using quotes to handle spaces in path
const SAM_TEMPLATE_PATH = `"${path.resolve(__dirname, '../infrastructure/template.yaml')}"`;

// Frontend build directory - using quotes to handle spaces in path
const FRONTEND_BUILD_DIR = `"${path.resolve(__dirname, '../frontend/public')}"`;

// Main function
async function deploy() {
  try {
    console.log('Starting deployment of Cloud Migration Strategy Planner...');
    
    // Check if SAM CLI is installed
    checkSamCliInstalled();
    
    // Check if AWS CLI is installed
    checkAwsCliInstalled();
    
    // Check if AWS credentials are configured
    checkAwsCredentials();
    
    // Deploy backend using SAM
    await deployBackend();
    
    // Get API Gateway URL from deployed stack
    const apiUrl = await getApiGatewayUrl();
    
    // Update frontend config with API URL
    updateFrontendConfig(apiUrl);
    
    // Create S3 bucket for frontend if it doesn't exist
    await createFrontendBucket();
    
    // Deploy frontend to S3
    await deployFrontend();
    
    // Configure S3 bucket for static website hosting
    await configureBucketWebsiteHosting();
    
    // Get frontend URL
    const frontendUrl = `http://${FRONTEND_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com`;
    
    console.log('\n========== Deployment Complete ==========');
    console.log(`Frontend URL: ${frontendUrl}`);
    console.log(`API Gateway URL: ${apiUrl}`);
    console.log('=======================================\n');
    
    console.log('Note: It may take a few minutes for the deployment to fully propagate.');
    console.log('Make sure to update the CORS settings in API Gateway if you encounter CORS issues.');
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

// Check if SAM CLI is installed
function checkSamCliInstalled() {
  try {
    console.log('Checking if SAM CLI is installed...');
    execSync('sam --version', { stdio: 'ignore' });
    console.log('✅ SAM CLI is installed');
  } catch (error) {
    throw new Error('SAM CLI is not installed. Please install it before proceeding: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html');
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

// Deploy backend using SAM
async function deployBackend() {
  console.log('Deploying backend using SAM...');
  
  // Build and deploy the SAM application
  execSync(`sam build -t ${SAM_TEMPLATE_PATH}`, { stdio: 'inherit' });
  execSync(`sam deploy --stack-name ${STACK_NAME} --guided`, { stdio: 'inherit' });
  
  console.log('✅ Backend deployed successfully');
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
      Bucket: FRONTEND_BUCKET
    };
    
    // Only add LocationConstraint if not in us-east-1
    if (AWS_REGION !== 'us-east-1') {
      createBucketParams.CreateBucketConfiguration = {
        LocationConstraint: AWS_REGION
      };
    }
    
    // Check if bucket exists
    await s3.createBucket(createBucketParams).promise();
    
    console.log(`✅ S3 bucket '${FRONTEND_BUCKET}' created successfully`);
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
async function deployFrontend() {
  console.log('Deploying frontend to S3...');
  
  // Sync frontend files to S3 bucket
  execSync(`aws s3 sync ${FRONTEND_BUILD_DIR} s3://${FRONTEND_BUCKET} --acl public-read`, { stdio: 'inherit' });
  
  console.log('✅ Frontend deployed successfully');
}

// Configure S3 bucket for static website hosting
async function configureBucketWebsiteHosting() {
  console.log('Configuring S3 bucket for static website hosting...');
  
  const s3 = new AWS.S3();
  
  try {
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
    
    // Make bucket public
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
    
    console.log('✅ S3 bucket policy configured for public access');
  } catch (error) {
    console.error('Error configuring bucket website hosting:', error.message);
  }
}

// Run the deployment
deploy(); 