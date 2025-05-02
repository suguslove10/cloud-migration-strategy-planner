const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const discovery = new AWS.Discovery();
const s3 = new AWS.S3();

/**
 * Lambda function handler for starting discovery
 */
exports.handler = async (event) => {
  console.log('Starting discovery process:', JSON.stringify(event, null, 2));
  
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { projectId, agentIds } = body;
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Project ID is required'
        })
      };
    }
    
    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'At least one agent ID is required'
        })
      };
    }
    
    // Check if project exists
    const projectExists = await checkProjectExists(projectId);
    
    if (!projectExists) {
      // Create project record
      await createProject(projectId, body.projectName || `Migration Project ${projectId}`);
    }
    
    // Start data collection
    const startDataCollectionResult = await discovery.startDataCollectionByAgentIds({
      agentIds
    }).promise();
    
    // Update project status
    await updateProjectStatus(projectId, 'DISCOVERY_STARTED');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Discovery process started successfully',
        projectId,
        agentIds,
        result: startDataCollectionResult
      })
    };
  } catch (error) {
    console.error('Error starting discovery process:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error starting discovery process',
        error: error.message
      })
    };
  }
};

/**
 * Check if project exists
 * @param {string} projectId - Project ID
 * @returns {boolean} - Whether project exists
 */
async function checkProjectExists(projectId) {
  const result = await dynamoDB.get({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Key: {
      projectId,
      resourceId: 'PROJECT#INFO'
    }
  }).promise();
  
  return !!result.Item;
}

/**
 * Create project record
 * @param {string} projectId - Project ID
 * @param {string} projectName - Project name
 */
async function createProject(projectId, projectName) {
  // Create project info record
  await dynamoDB.put({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Item: {
      projectId,
      resourceId: 'PROJECT#INFO',
      resourceType: 'PROJECT_INFO',
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    }
  }).promise();
  
  // Create project status record
  await updateProjectStatus(projectId, 'CREATED');
  
  // Create S3 directory structure
  const bucketName = process.env.S3_BUCKET_NAME || `migration-planner-discovery-${process.env.AWS_ACCOUNT_ID || '000000000000'}-${process.env.ENVIRONMENT || 'dev'}`;
  
  // Create empty placeholder file to establish directory structure
  await s3.putObject({
    Bucket: bucketName,
    Key: `projects/${projectId}/.placeholder`,
    Body: 'Placeholder file for directory structure'
  }).promise();
}

/**
 * Update project status
 * @param {string} projectId - Project ID
 * @param {string} status - New status
 */
async function updateProjectStatus(projectId, status) {
  // Check if status record exists
  const result = await dynamoDB.get({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Key: {
      projectId,
      resourceId: 'PROJECT#STATUS'
    }
  }).promise();
  
  if (result.Item) {
    // Update existing status record
    await dynamoDB.update({
      TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
      Key: {
        projectId,
        resourceId: 'PROJECT#STATUS'
      },
      UpdateExpression: 'SET #status = :status, lastUpdated = :lastUpdated',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':lastUpdated': new Date().toISOString()
      }
    }).promise();
  } else {
    // Create new status record
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
      Item: {
        projectId,
        resourceId: 'PROJECT#STATUS',
        resourceType: 'PROJECT_STATUS',
        status,
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
      }
    }).promise();
  }
} 