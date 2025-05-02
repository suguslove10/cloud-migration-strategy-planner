const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda function handler for retrieving migration analysis
 */
exports.handler = async (event) => {
  console.log('Getting migration analysis:', JSON.stringify(event, null, 2));
  
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
    
    // Check if analysis is completed
    if (projectStatus.status !== 'ANALYSIS_COMPLETED' && 
        projectStatus.status !== 'COST_ESTIMATION_COMPLETED' && 
        projectStatus.status !== 'ROADMAP_GENERATED') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Migration analysis not yet completed',
          status: projectStatus.status
        })
      };
    }
    
    // Get servers
    const servers = await getServerItems(projectId);
    
    // Get recommendations
    const recommendations = await getRecommendationItems(projectId);
    
    // Get recommendation summary
    const recommendationSummary = await getRecommendationSummary(projectId);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        projectId,
        status: projectStatus.status,
        summary: recommendationSummary,
        servers,
        recommendations
      })
    };
  } catch (error) {
    console.error('Error getting migration analysis:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error getting migration analysis',
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
 * Get all server items for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of server items
 */
async function getServerItems(projectId) {
  const result = await dynamoDB.scan({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    FilterExpression: 'projectId = :projectId AND resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'SERVER'
    }
  }).promise();
  
  return result.Items || [];
}

/**
 * Get all recommendation items for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of recommendation items
 */
async function getRecommendationItems(projectId) {
  const result = await dynamoDB.scan({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    FilterExpression: 'projectId = :projectId AND resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'MIGRATION_RECOMMENDATION'
    }
  }).promise();
  
  return result.Items || [];
}

/**
 * Get recommendation summary for a project
 * @param {string} projectId - Project ID
 * @returns {Object} - Recommendation summary
 */
async function getRecommendationSummary(projectId) {
  const result = await dynamoDB.get({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Key: {
      projectId,
      resourceId: 'PROJECT#RECOMMENDATIONS#SUMMARY'
    }
  }).promise();
  
  return result.Item;
} 