const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda function that analyzes workloads and recommends migration strategies
 */
exports.handler = async (event) => {
  console.log('Analyzing migration options:', JSON.stringify(event, null, 2));
  
  try {
    // Extract project ID from the event
    const projectId = event.projectId;
    
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    // Get all server resources for the project
    const serverItems = await getServerItems(projectId);
    console.log(`Found ${serverItems.length} servers for project: ${projectId}`);
    
    // Get all connections for the project
    const connectionItems = await getConnectionItems(projectId);
    console.log(`Found ${connectionItems.length} connections for project: ${projectId}`);
    
    // Get all software items for the project
    const softwareItems = await getSoftwareItems(projectId);
    console.log(`Found ${softwareItems.length} software items for project: ${projectId}`);
    
    // Analyze servers and recommend migration strategies
    const migrationRecommendations = analyzeWorkloads(serverItems, connectionItems, softwareItems);
    
    // Store migration recommendations in DynamoDB
    await storeMigrationRecommendations(projectId, migrationRecommendations);
    
    // Update project status
    await updateProjectStatus(projectId, 'ANALYSIS_COMPLETED');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Migration analysis completed successfully',
        recommendations: migrationRecommendations
      })
    };
  } catch (error) {
    console.error('Error analyzing migration options:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error analyzing migration options',
        error: error.message
      })
    };
  }
};

/**
 * Get all server items for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of server items
 */
async function getServerItems(projectId) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    KeyConditionExpression: 'projectId = :projectId',
    FilterExpression: 'resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'SERVER'
    }
  };
  
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
 * Get all connection items for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of connection items
 */
async function getConnectionItems(projectId) {
  const result = await dynamoDB.scan({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    FilterExpression: 'projectId = :projectId AND resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'CONNECTION'
    }
  }).promise();
  
  return result.Items || [];
}

/**
 * Get all software items for a project
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of software items
 */
async function getSoftwareItems(projectId) {
  const result = await dynamoDB.scan({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    FilterExpression: 'projectId = :projectId AND resourceType = :resourceType',
    ExpressionAttributeValues: {
      ':projectId': projectId,
      ':resourceType': 'SOFTWARE'
    }
  }).promise();
  
  return result.Items || [];
}

/**
 * Analyze workloads and recommend migration strategies
 * @param {Array} servers - Array of server items
 * @param {Array} connections - Array of connection items
 * @param {Array} software - Array of software items
 * @returns {Array} - Array of migration recommendations
 */
function analyzeWorkloads(servers, connections, software) {
  const recommendations = [];
  
  // Group software by server
  const serverSoftware = {};
  software.forEach(item => {
    if (!serverSoftware[item.serverId]) {
      serverSoftware[item.serverId] = [];
    }
    serverSoftware[item.serverId].push(item);
  });
  
  // Group connections by source server
  const serverConnections = {};
  connections.forEach(item => {
    if (!serverConnections[item.sourceServerId]) {
      serverConnections[item.sourceServerId] = [];
    }
    serverConnections[item.sourceServerId].push(item);
  });
  
  // Analyze each server
  servers.forEach(server => {
    // Extract server ID from resourceId (format: SERVER#{id})
    const serverId = server.resourceId.split('#')[1];
    
    // Get software for this server
    const serverSoftwareItems = serverSoftware[serverId] || [];
    
    // Get connections for this server
    const serverConnectionItems = serverConnections[serverId] || [];
    
    // Determine migration strategy
    const strategy = determineMigrationStrategy(server, serverSoftwareItems, serverConnectionItems);
    
    // Create recommendation
    recommendations.push({
      serverId: serverId,
      serverName: server.name,
      migrationStrategy: strategy.strategy,
      targetService: strategy.targetService,
      rationaleScore: strategy.rationaleScore,
      rationale: strategy.rationale
    });
  });
  
  return recommendations;
}

/**
 * Determine migration strategy for a server
 * @param {Object} server - Server item
 * @param {Array} software - Array of software items for the server
 * @param {Array} connections - Array of connection items for the server
 * @returns {Object} - Migration strategy recommendation
 */
function determineMigrationStrategy(server, software, connections) {
  // Calculate scores for different migration strategies
  let reHostScore = 70; // Default starting score for rehost (lift-and-shift)
  let rePlatformScore = 50; // Default starting score for replatform
  let reArchitectScore = 30; // Default starting score for rearchitect
  
  // Analyze server characteristics
  if (server.operatingSystem) {
    const os = server.operatingSystem.toLowerCase();
    
    // Windows servers are good candidates for EC2
    if (os.includes('windows')) {
      reHostScore += 10;
    }
    
    // Linux servers might be good candidates for containerization
    if (os.includes('linux') || os.includes('unix')) {
      rePlatformScore += 10;
    }
  }
  
  // Check utilization
  if (server.utilization) {
    // Low utilization suggests optimization potential
    if (server.utilization.cpu < 20 && server.utilization.memory < 30) {
      reHostScore -= 10;
      rePlatformScore += 10;
      reArchitectScore += 15;
    }
    
    // High utilization might favor lift-and-shift initially
    if (server.utilization.cpu > 70 || server.utilization.memory > 80) {
      reHostScore += 10;
      rePlatformScore -= 5;
    }
  }
  
  // Analyze software
  const hasDatabase = software.some(s => 
    s.name.toLowerCase().includes('sql') || 
    s.name.toLowerCase().includes('oracle') || 
    s.name.toLowerCase().includes('db') ||
    s.name.toLowerCase().includes('mongo') ||
    s.name.toLowerCase().includes('postgresql')
  );
  
  const hasWebServer = software.some(s => 
    s.name.toLowerCase().includes('apache') || 
    s.name.toLowerCase().includes('nginx') || 
    s.name.toLowerCase().includes('iis')
  );
  
  const hasApplicationServer = software.some(s => 
    s.name.toLowerCase().includes('tomcat') || 
    s.name.toLowerCase().includes('weblogic') || 
    s.name.toLowerCase().includes('websphere') ||
    s.name.toLowerCase().includes('jboss')
  );
  
  // Database servers are good candidates for managed database services
  if (hasDatabase) {
    reHostScore -= 15;
    rePlatformScore += 20;
    reArchitectScore += 10;
  }
  
  // Web servers can be good candidates for containerization or serverless
  if (hasWebServer) {
    reHostScore -= 5;
    rePlatformScore += 15;
    reArchitectScore += 10;
  }
  
  // Application servers can be good candidates for containerization
  if (hasApplicationServer) {
    reHostScore -= 10;
    rePlatformScore += 20;
    reArchitectScore += 5;
  }
  
  // Analyze connections
  const hasHighConnectivity = connections.length > 5;
  
  // Highly connected servers might be best kept together initially
  if (hasHighConnectivity) {
    reHostScore += 10;
    rePlatformScore -= 5;
    reArchitectScore -= 10;
  }
  
  // Determine highest scoring strategy
  const scores = [
    { strategy: 'Rehost (Lift-and-Shift)', score: reHostScore },
    { strategy: 'Replatform', score: rePlatformScore },
    { strategy: 'Rearchitect', score: reArchitectScore }
  ];
  
  scores.sort((a, b) => b.score - a.score);
  const highestScore = scores[0];
  
  // Determine target AWS service based on strategy and server characteristics
  let targetService = '';
  let rationale = '';
  
  if (highestScore.strategy === 'Rehost (Lift-and-Shift)') {
    targetService = 'Amazon EC2';
    rationale = 'This server is a good candidate for a simple lift-and-shift migration to Amazon EC2.';
    
    if (server.operatingSystem && server.operatingSystem.toLowerCase().includes('windows')) {
      rationale += ' Windows workloads often start with EC2 migration for minimal disruption.';
    }
    
    if (hasHighConnectivity) {
      rationale += ' The high number of connections suggests keeping this workload intact initially.';
    }
  } else if (highestScore.strategy === 'Replatform') {
    if (hasDatabase) {
      const dbSoftware = software.find(s => 
        s.name.toLowerCase().includes('sql') || 
        s.name.toLowerCase().includes('oracle') || 
        s.name.toLowerCase().includes('db') ||
        s.name.toLowerCase().includes('mongo') ||
        s.name.toLowerCase().includes('postgresql')
      );
      
      if (dbSoftware) {
        const dbName = dbSoftware.name.toLowerCase();
        if (dbName.includes('mysql') || dbName.includes('mariadb')) {
          targetService = 'Amazon RDS for MySQL';
          rationale = 'This MySQL database server is a good candidate for migration to Amazon RDS.';
        } else if (dbName.includes('postgresql')) {
          targetService = 'Amazon RDS for PostgreSQL';
          rationale = 'This PostgreSQL database server is a good candidate for migration to Amazon RDS.';
        } else if (dbName.includes('sql server')) {
          targetService = 'Amazon RDS for SQL Server';
          rationale = 'This SQL Server database is a good candidate for migration to Amazon RDS.';
        } else if (dbName.includes('oracle')) {
          targetService = 'Amazon RDS for Oracle';
          rationale = 'This Oracle database is a good candidate for migration to Amazon RDS.';
        } else if (dbName.includes('mongo')) {
          targetService = 'Amazon DocumentDB';
          rationale = 'This MongoDB database is a good candidate for migration to Amazon DocumentDB.';
        } else {
          targetService = 'Amazon RDS';
          rationale = 'This database server is a good candidate for migration to Amazon RDS.';
        }
      } else {
        targetService = 'Amazon RDS';
        rationale = 'This database server is a good candidate for migration to Amazon RDS.';
      }
    } else if (hasWebServer || hasApplicationServer) {
      targetService = 'Amazon ECS/EKS';
      rationale = 'This application/web server is a good candidate for containerization and migration to Amazon ECS or EKS.';
      
      if (hasWebServer && !hasApplicationServer) {
        rationale = 'This web server is a good candidate for containerization and migration to Amazon ECS or EKS.';
      } else if (!hasWebServer && hasApplicationServer) {
        rationale = 'This application server is a good candidate for containerization and migration to Amazon ECS or EKS.';
      }
    } else {
      targetService = 'Amazon EC2 with Optimizations';
      rationale = 'This server is a good candidate for replatforming with optimizations on Amazon EC2.';
    }
  } else if (highestScore.strategy === 'Rearchitect') {
    if (hasWebServer && !hasDatabase && !hasApplicationServer) {
      targetService = 'AWS Lambda / Amazon S3';
      rationale = 'This web server could be re-architected as a serverless application using AWS Lambda and Amazon S3.';
    } else if (hasApplicationServer && !hasDatabase) {
      targetService = 'AWS App Runner';
      rationale = 'This application server could be re-architected for AWS App Runner for simplified deployment and operations.';
    } else if (hasDatabase) {
      targetService = 'Amazon DynamoDB / Aurora Serverless';
      rationale = 'This database workload could be re-architected to use modern cloud-native databases like DynamoDB or Aurora Serverless.';
    } else {
      targetService = 'AWS Lambda / Containers';
      rationale = 'This workload could be re-architected into serverless functions or microservices.';
    }
  }
  
  return {
    strategy: highestScore.strategy,
    targetService: targetService,
    rationaleScore: highestScore.score,
    rationale: rationale
  };
}

/**
 * Store migration recommendations in DynamoDB
 * @param {string} projectId - Project ID
 * @param {Array} recommendations - Array of migration recommendations
 */
async function storeMigrationRecommendations(projectId, recommendations) {
  // Store each recommendation
  for (const recommendation of recommendations) {
    const item = {
      projectId,
      resourceId: `SERVER#${recommendation.serverId}#RECOMMENDATION`,
      resourceType: 'MIGRATION_RECOMMENDATION',
      serverId: recommendation.serverId,
      serverName: recommendation.serverName,
      migrationStrategy: recommendation.migrationStrategy,
      targetService: recommendation.targetService,
      rationaleScore: recommendation.rationaleScore,
      rationale: recommendation.rationale,
      createdAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    };
    
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
      Item: item
    }).promise();
  }
  
  // Store summary
  const strategies = {
    'Rehost (Lift-and-Shift)': 0,
    'Replatform': 0,
    'Rearchitect': 0
  };
  
  recommendations.forEach(recommendation => {
    strategies[recommendation.migrationStrategy]++;
  });
  
  await dynamoDB.put({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Item: {
      projectId,
      resourceId: 'PROJECT#RECOMMENDATIONS#SUMMARY',
      resourceType: 'RECOMMENDATION_SUMMARY',
      totalServers: recommendations.length,
      strategies: strategies,
      createdAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    }
  }).promise();
}

/**
 * Update project status
 * @param {string} projectId - Project ID
 * @param {string} status - New status
 */
async function updateProjectStatus(projectId, status) {
  await dynamoDB.update({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Key: {
      projectId: projectId,
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
} 