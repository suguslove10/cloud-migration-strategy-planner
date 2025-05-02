const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda function handler for retrieving migration roadmap
 */
exports.handler = async (event) => {
  console.log('Getting migration roadmap:', JSON.stringify(event, null, 2));
  
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
    
    // Check if roadmap is generated
    if (projectStatus.status !== 'ROADMAP_GENERATED') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Migration roadmap not yet generated',
          status: projectStatus.status
        })
      };
    }
    
    // Get roadmap summary
    const roadmapSummary = await getRoadmapSummary(projectId);
    
    // Get roadmap phases
    const roadmapPhases = await getRoadmapPhases(projectId);
    
    // Get roadmap milestones
    const roadmapMilestones = await getRoadmapMilestones(projectId);
    
    // Sort phases and milestones by number
    roadmapPhases.sort((a, b) => a.phaseNumber - b.phaseNumber);
    roadmapMilestones.sort((a, b) => a.milestoneNumber - b.milestoneNumber);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        projectId,
        status: projectStatus.status,
        summary: roadmapSummary,
        phases: roadmapPhases,
        milestones: roadmapMilestones
      })
    };
  } catch (error) {
    console.error('Error getting migration roadmap:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error getting migration roadmap',
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
 * Get roadmap summary for a project
 * @param {string} projectId - Project ID
 * @returns {Object} - Roadmap summary
 */
async function getRoadmapSummary(projectId) {
  const result = await dynamoDB.get({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Key: {
      projectId,
      resourceId: 'PROJECT#ROADMAP#SUMMARY'
    }
  }).promise();
  
  return result.Item;
}

/**
 * Get roadmap phases for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of roadmap phases
 */
async function getRoadmapPhases(projectId) {
  const result = await dynamoDB.scan({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    FilterExpression: 'projectId = :projectId AND resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'ROADMAP_PHASE'
    }
  }).promise();
  
  return result.Items || [];
}

/**
 * Get roadmap milestones for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of roadmap milestones
 */
async function getRoadmapMilestones(projectId) {
  const result = await dynamoDB.scan({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    FilterExpression: 'projectId = :projectId AND resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'ROADMAP_MILESTONE'
    }
  }).promise();
  
  return result.Items || [];
} 