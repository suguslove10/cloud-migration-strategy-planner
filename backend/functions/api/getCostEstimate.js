const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda function handler for retrieving cost estimates
 */
exports.handler = async (event) => {
  console.log('Getting cost estimates:', JSON.stringify(event, null, 2));
  
  try {
    // Extract project ID from path parameters
    const projectId = event.pathParameters?.projectId;
    
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
    
    // Get project status
    const projectStatus = await getProjectStatus(projectId);
    
    if (!projectStatus) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Project not found'
        })
      };
    }
    
    // Check if cost estimation is completed
    if (projectStatus.status !== 'COST_ESTIMATION_COMPLETED' && 
        projectStatus.status !== 'ROADMAP_GENERATED') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Cost estimation not yet completed',
          status: projectStatus.status
        })
      };
    }
    
    // Get cost estimates
    const costEstimates = await getCostEstimateItems(projectId);
    
    // Get cost summary
    const costSummary = await getCostSummary(projectId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        projectId,
        status: projectStatus.status,
        summary: costSummary,
        costEstimates
      })
    };
  } catch (error) {
    console.error('Error getting cost estimates:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error getting cost estimates',
        error: error.message
      })
    };
  }
};

/**
 * Get project status
 * @param {string} projectId - Project ID
 * @returns {Object} - Project status
 */
async function getProjectStatus(projectId) {
  const result = await dynamoDB.get({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Key: {
      projectId,
      resourceId: 'PROJECT#STATUS'
    }
  }).promise();
  
  return result.Item;
}

/**
 * Get all cost estimate items for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of cost estimate items
 */
async function getCostEstimateItems(projectId) {
  const result = await dynamoDB.scan({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    FilterExpression: 'projectId = :projectId AND resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'COST_ESTIMATE'
    }
  }).promise();
  
  return result.Items || [];
}

/**
 * Get cost summary for a project
 * @param {string} projectId - Project ID
 * @returns {Object} - Cost summary
 */
async function getCostSummary(projectId) {
  const result = await dynamoDB.get({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Key: {
      projectId,
      resourceId: 'PROJECT#COSTS#SUMMARY'
    }
  }).promise();
  
  return result.Item;
} 