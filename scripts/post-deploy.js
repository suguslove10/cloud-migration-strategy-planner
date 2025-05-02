/**
 * Cloud Migration Strategy Planner - Post-Deployment Script
 * 
 * This script is used after the initial deployment to set up S3 event notifications
 * which cause circular dependencies in the CloudFormation template.
 */

const AWS = require('aws-sdk');
const { execSync } = require('child_process');

// Configure AWS region
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
AWS.config.update({ region: AWS_REGION });

// CloudFormation stack name
const STACK_NAME = 'cloud-migration-strategy-planner';

// Main function
async function postDeploy() {
  try {
    console.log('Starting post-deployment configuration...');
    console.log(`Using AWS region: ${AWS_REGION}`);
    
    // Check if AWS credentials are configured
    checkAwsCredentials();
    
    // List available stacks for debugging
    await listStacks();
    
    // Get stack information
    const stackInfo = await getStackInfo();
    
    // Configure S3 notification
    await configureS3Notification(stackInfo);
    
    console.log('\n✅ Post-deployment configuration completed successfully!');
    
  } catch (error) {
    console.error('Post-deployment configuration failed:', error.message);
    process.exit(1);
  }
}

// List available stacks for debugging
async function listStacks() {
  console.log('Listing CloudFormation stacks for debugging...');
  
  const cloudformation = new AWS.CloudFormation();
  
  try {
    const { StackSummaries } = await cloudformation.listStacks({
      StackStatusFilter: [
        'CREATE_COMPLETE',
        'UPDATE_COMPLETE'
      ]
    }).promise();
    
    if (!StackSummaries || StackSummaries.length === 0) {
      console.log('No stacks found');
      return;
    }
    
    console.log('Available stacks:');
    StackSummaries.forEach(stack => {
      console.log(`- ${stack.StackName} (${stack.StackStatus})`);
    });
  } catch (error) {
    console.error('Error listing stacks:', error.message);
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

// Get stack information
async function getStackInfo() {
  console.log('Getting stack information...');
  
  const cloudformation = new AWS.CloudFormation();
  
  try {
    const { Stacks } = await cloudformation.describeStacks({ StackName: STACK_NAME }).promise();
    
    if (!Stacks || Stacks.length === 0) {
      throw new Error(`Stack ${STACK_NAME} not found`);
    }
    
    const outputs = Stacks[0].Outputs || [];
    
    // Extract key outputs
    const bucketNameOutput = outputs.find(output => output.OutputKey === 'DiscoveryBucket');
    const bucketName = bucketNameOutput ? bucketNameOutput.OutputValue : null;
    
    if (!bucketName) {
      throw new Error('S3 bucket name not found in stack outputs');
    }
    
    console.log(`✅ Found S3 bucket: ${bucketName}`);
    
    // List Lambda functions for debugging
    const lambda = new AWS.Lambda();
    try {
      console.log('Listing Lambda functions for debugging...');
      const { Functions } = await lambda.listFunctions().promise();
      
      // Find the DiscoveryProcessor Lambda function
      const discoveryFunction = Functions.find(func => 
        func.FunctionName.includes('DiscoveryProcessor') || 
        func.FunctionName.includes('Discovery')
      );
      
      if (!discoveryFunction) {
        throw new Error('Discovery processor Lambda function not found');
      }
      
      console.log(`✅ Found Lambda function: ${discoveryFunction.FunctionName}`);
      const functionArn = discoveryFunction.FunctionArn;
      
      return {
        bucketName,
        functionArn
      };
    } catch (error) {
      console.error('Error finding Lambda function:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('Error getting stack information:', error);
    throw error;
  }
}

// Configure S3 notification
async function configureS3Notification(stackInfo) {
  console.log('Configuring S3 event notification...');
  
  const { bucketName, functionArn } = stackInfo;
  
  // First, add permission for S3 to invoke the Lambda function
  const lambda = new AWS.Lambda();
  
  try {
    await lambda.addPermission({
      Action: 'lambda:InvokeFunction',
      FunctionName: functionArn,
      Principal: 's3.amazonaws.com',
      SourceArn: `arn:aws:s3:::${bucketName}`,
      StatementId: `s3-notification-${Date.now()}`
    }).promise();
    
    console.log('✅ Added Lambda permission for S3');
  } catch (error) {
    if (error.code === 'ResourceConflictException') {
      console.log('✅ Lambda permission for S3 already exists');
    } else {
      throw error;
    }
  }
  
  // Configure S3 notification
  const s3 = new AWS.S3();
  
  try {
    await s3.putBucketNotificationConfiguration({
      Bucket: bucketName,
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [
          {
            Events: ['s3:ObjectCreated:*'],
            LambdaFunctionArn: functionArn
          }
        ]
      }
    }).promise();
    
    console.log('✅ Configured S3 bucket notification');
  } catch (error) {
    console.error('Error configuring S3 notification:', error);
    throw error;
  }
}

// Run the post-deployment configuration
postDeploy(); 