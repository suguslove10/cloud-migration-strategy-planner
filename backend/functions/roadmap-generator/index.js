const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda function that generates a migration roadmap
 */
exports.handler = async (event) => {
  console.log('Generating migration roadmap:', JSON.stringify(event, null, 2));
  
  try {
    // Extract project ID from the event
    const projectId = event.projectId;
    
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    // Get servers with recommendations and cost estimates
    const serverItems = await getServerItems(projectId);
    console.log(`Found ${serverItems.length} servers for project: ${projectId}`);
    
    // Get recommendations for the project
    const recommendationItems = await getRecommendationItems(projectId);
    console.log(`Found ${recommendationItems.length} recommendations for project: ${projectId}`);
    
    // Get cost estimates for the project
    const costEstimateItems = await getCostEstimateItems(projectId);
    console.log(`Found ${costEstimateItems.length} cost estimates for project: ${projectId}`);
    
    // Get connections for the project
    const connectionItems = await getConnectionItems(projectId);
    console.log(`Found ${connectionItems.length} connections for project: ${projectId}`);
    
    // Create maps for easier lookup
    const recommendationMap = {};
    recommendationItems.forEach(item => {
      recommendationMap[item.serverId] = item;
    });
    
    const costEstimateMap = {};
    costEstimateItems.forEach(item => {
      costEstimateMap[item.serverId] = item;
    });
    
    // Group connections by source server ID
    const serverConnections = {};
    connectionItems.forEach(item => {
      const sourceServerId = item.sourceServerId;
      if (!serverConnections[sourceServerId]) {
        serverConnections[sourceServerId] = [];
      }
      serverConnections[sourceServerId].push(item);
    });
    
    // Generate dependency graph
    const dependencyGraph = generateDependencyGraph(serverItems, serverConnections);
    
    // Generate migration phases
    const migrationPhases = generateMigrationPhases(
      serverItems, 
      recommendationMap, 
      costEstimateMap, 
      dependencyGraph
    );
    
    // Generate roadmap
    const roadmap = generateRoadmap(migrationPhases);
    
    // Store roadmap in DynamoDB
    await storeRoadmap(projectId, roadmap);
    
    // Update project status
    await updateProjectStatus(projectId, 'ROADMAP_GENERATED');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Migration roadmap generated successfully',
        roadmap
      })
    };
  } catch (error) {
    console.error('Error generating migration roadmap:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error generating migration roadmap',
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
 * Generate dependency graph for servers
 * @param {Array} servers - Array of server items
 * @param {Object} serverConnections - Map of server ID to connections
 * @returns {Object} - Dependency graph
 */
function generateDependencyGraph(servers, serverConnections) {
  const graph = {};
  
  // Initialize graph with all servers
  servers.forEach(server => {
    const serverId = server.resourceId.split('#')[1];
    graph[serverId] = {
      dependencies: [],
      dependents: []
    };
  });
  
  // Populate dependencies and dependents
  servers.forEach(server => {
    const sourceServerId = server.resourceId.split('#')[1];
    const connections = serverConnections[sourceServerId] || [];
    
    connections.forEach(connection => {
      const targetServerId = connection.destinationServerId;
      
      // Add dependency relationship
      if (graph[sourceServerId] && graph[targetServerId]) {
        // Source server depends on target server
        if (!graph[sourceServerId].dependencies.includes(targetServerId)) {
          graph[sourceServerId].dependencies.push(targetServerId);
        }
        
        // Target server has source server as dependent
        if (!graph[targetServerId].dependents.includes(sourceServerId)) {
          graph[targetServerId].dependents.push(sourceServerId);
        }
      }
    });
  });
  
  return graph;
}

/**
 * Generate migration phases
 * @param {Array} servers - Array of server items
 * @param {Object} recommendationMap - Map of server ID to recommendation
 * @param {Object} costEstimateMap - Map of server ID to cost estimate
 * @param {Object} dependencyGraph - Dependency graph
 * @returns {Array} - Array of migration phases
 */
function generateMigrationPhases(servers, recommendationMap, costEstimateMap, dependencyGraph) {
  // Score servers based on migration priority
  const scoredServers = servers.map(server => {
    const serverId = server.resourceId.split('#')[1];
    const recommendation = recommendationMap[serverId] || null;
    const costEstimate = costEstimateMap[serverId] || null;
    const dependencies = dependencyGraph[serverId]?.dependencies || [];
    const dependents = dependencyGraph[serverId]?.dependents || [];
    
    // Calculate migration priority score
    let priorityScore = 50; // Default priority
    
    // Adjust score based on migration strategy
    if (recommendation) {
      const strategy = recommendation.migrationStrategy;
      
      if (strategy === 'Rehost (Lift-and-Shift)') {
        priorityScore += 20; // Lift-and-shift is relatively straightforward, prioritize
      } else if (strategy === 'Replatform') {
        priorityScore += 10; // Replatforming is next priority
      } else if (strategy === 'Rearchitect') {
        priorityScore -= 20; // Rearchitecting is complex, lower priority
      }
    }
    
    // Adjust score based on dependencies and dependents
    priorityScore -= dependencies.length * 5; // Lower priority for servers with many dependencies
    priorityScore += dependents.length * 5; // Higher priority for servers with many dependents
    
    // Adjust score based on utilization
    if (server.utilization) {
      // Lower priority for high utilization servers (more complex to migrate)
      if (server.utilization.cpu > 70 || server.utilization.memory > 80) {
        priorityScore -= 10;
      }
      
      // Higher priority for low utilization servers (easier to migrate)
      if (server.utilization.cpu < 30 && server.utilization.memory < 40) {
        priorityScore += 10;
      }
    }
    
    return {
      server,
      serverId,
      priorityScore,
      recommendation,
      costEstimate,
      dependencies,
      dependents
    };
  });
  
  // Sort servers by priority score (highest first)
  scoredServers.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Organize servers into phases
  const phases = [];
  const assignedServers = new Set();
  
  // Phase 1: Assessment and Planning (always first)
  phases.push({
    phaseNumber: 1,
    name: 'Assessment and Planning',
    description: 'Assess current infrastructure, finalize migration strategy, and create detailed plans',
    duration: 4, // 4 weeks
    tasks: [
      { name: 'Finalize migration goals and success criteria', durationWeeks: 1 },
      { name: 'Review and validate infrastructure assessment data', durationWeeks: 1 },
      { name: 'Confirm migration strategy recommendations', durationWeeks: 1 },
      { name: 'Develop detailed migration plan and timeline', durationWeeks: 2 },
      { name: 'Establish migration governance and communication plan', durationWeeks: 1 }
    ],
    serverIds: []
  });
  
  // Phase 2: Foundation Setup (always second)
  phases.push({
    phaseNumber: 2,
    name: 'Foundation Setup',
    description: 'Set up AWS foundation components required for the migration',
    duration: 3, // 3 weeks
    tasks: [
      { name: 'Set up AWS accounts and IAM policies', durationWeeks: 1 },
      { name: 'Configure networking (VPC, subnets, security groups)', durationWeeks: 2 },
      { name: 'Set up monitoring and logging infrastructure', durationWeeks: 1 },
      { name: 'Implement backup and disaster recovery solutions', durationWeeks: 2 },
      { name: 'Configure AWS landing zone', durationWeeks: 1 }
    ],
    serverIds: []
  });
  
  // Find servers with no dependencies (can be migrated first)
  const noDependencyServers = scoredServers.filter(serverInfo => 
    !assignedServers.has(serverInfo.serverId) && 
    serverInfo.dependencies.length === 0
  );
  
  // Phase 3: Initial Migration (less critical systems)
  const initialMigrationServers = noDependencyServers
    .filter(serverInfo => {
      const strategy = serverInfo.recommendation?.migrationStrategy;
      return strategy === 'Rehost (Lift-and-Shift)' || strategy === 'Replatform';
    })
    .slice(0, Math.ceil(noDependencyServers.length * 0.5)); // Take about half of them
  
  phases.push({
    phaseNumber: 3,
    name: 'Initial Migration',
    description: 'Migrate first batch of servers with minimal dependencies',
    duration: 4, // 4 weeks
    tasks: [
      { name: 'Prepare initial migration batch', durationWeeks: 1 },
      { name: 'Migrate development and test environments', durationWeeks: 2 },
      { name: 'Perform initial migration testing', durationWeeks: 1 },
      { name: 'Document lessons learned and update migration approach', durationWeeks: 1 }
    ],
    serverIds: initialMigrationServers.map(serverInfo => serverInfo.serverId)
  });
  
  // Mark these servers as assigned
  initialMigrationServers.forEach(serverInfo => {
    assignedServers.add(serverInfo.serverId);
  });
  
  // Phase 4: Core Infrastructure Migration
  // Find servers that only depend on already assigned servers
  const eligibleServers = scoredServers.filter(serverInfo => 
    !assignedServers.has(serverInfo.serverId) && 
    serverInfo.dependencies.every(depId => assignedServers.has(depId))
  );
  
  const coreServers = eligibleServers
    .filter(serverInfo => {
      // Focus on servers with more dependents (important infrastructure)
      return serverInfo.dependents.length > 0;
    })
    .slice(0, Math.min(10, eligibleServers.length)); // Limit batch size
  
  phases.push({
    phaseNumber: 4,
    name: 'Core Infrastructure Migration',
    description: 'Migrate core infrastructure components',
    duration: 6, // 6 weeks
    tasks: [
      { name: 'Migrate database servers', durationWeeks: 3 },
      { name: 'Migrate application servers', durationWeeks: 3 },
      { name: 'Configure high availability and scalability', durationWeeks: 2 },
      { name: 'Perform integration testing', durationWeeks: 2 }
    ],
    serverIds: coreServers.map(serverInfo => serverInfo.serverId)
  });
  
  // Mark these servers as assigned
  coreServers.forEach(serverInfo => {
    assignedServers.add(serverInfo.serverId);
  });
  
  // Phase 5: Main Application Migration
  // Identify remaining servers that can be migrated based on dependencies
  const mainAppsEligible = scoredServers.filter(serverInfo => 
    !assignedServers.has(serverInfo.serverId) && 
    serverInfo.dependencies.every(depId => assignedServers.has(depId))
  );
  
  phases.push({
    phaseNumber: 5,
    name: 'Main Application Migration',
    description: 'Migrate main business applications',
    duration: 8, // 8 weeks
    tasks: [
      { name: 'Migrate remaining application servers', durationWeeks: 4 },
      { name: 'Migrate web servers', durationWeeks: 2 },
      { name: 'Perform comprehensive application testing', durationWeeks: 3 },
      { name: 'User acceptance testing', durationWeeks: 2 }
    ],
    serverIds: mainAppsEligible.map(serverInfo => serverInfo.serverId)
  });
  
  // Mark these servers as assigned
  mainAppsEligible.forEach(serverInfo => {
    assignedServers.add(serverInfo.serverId);
  });
  
  // Phase 6: Rearchitecting and Optimization
  // Find servers recommended for rearchitecting
  const rearchitectServers = scoredServers.filter(serverInfo => 
    !assignedServers.has(serverInfo.serverId) && 
    serverInfo.recommendation?.migrationStrategy === 'Rearchitect'
  );
  
  phases.push({
    phaseNumber: 6,
    name: 'Rearchitecting and Optimization',
    description: 'Rearchitect and optimize applications for cloud-native operation',
    duration: 12, // 12 weeks
    tasks: [
      { name: 'Refactor applications for cloud-native architecture', durationWeeks: 8 },
      { name: 'Implement serverless components', durationWeeks: 4 },
      { name: 'Optimize databases for cloud performance', durationWeeks: 6 },
      { name: 'Implement CI/CD pipelines', durationWeeks: 4 }
    ],
    serverIds: rearchitectServers.map(serverInfo => serverInfo.serverId)
  });
  
  // Mark these servers as assigned
  rearchitectServers.forEach(serverInfo => {
    assignedServers.add(serverInfo.serverId);
  });
  
  // Phase 7: Final Cutover and Decommission
  // Any remaining servers
  const remainingServers = scoredServers.filter(serverInfo => 
    !assignedServers.has(serverInfo.serverId)
  );
  
  phases.push({
    phaseNumber: 7,
    name: 'Final Cutover and Decommission',
    description: 'Complete migration, cutover to AWS, and decommission on-premises infrastructure',
    duration: 4, // 4 weeks
    tasks: [
      { name: 'Finalize migration of remaining workloads', durationWeeks: 2 },
      { name: 'Perform final cutover activities', durationWeeks: 1 },
      { name: 'Verify all services are operational in AWS', durationWeeks: 1 },
      { name: 'Decommission on-premises infrastructure', durationWeeks: 2 }
    ],
    serverIds: remainingServers.map(serverInfo => serverInfo.serverId)
  });
  
  // Phase 8: Post-Migration Optimization (always last)
  phases.push({
    phaseNumber: 8,
    name: 'Post-Migration Optimization',
    description: 'Optimize AWS environment for cost, performance, and security',
    duration: 8, // 8 weeks
    tasks: [
      { name: 'Perform cost optimization analysis', durationWeeks: 2 },
      { name: 'Implement cost optimization recommendations', durationWeeks: 3 },
      { name: 'Performance tuning and optimization', durationWeeks: 4 },
      { name: 'Security assessment and hardening', durationWeeks: 3 },
      { name: 'Document as-built architecture', durationWeeks: 2 }
    ],
    serverIds: []
  });
  
  return phases;
}

/**
 * Generate detailed roadmap with timelines
 * @param {Array} phases - Array of migration phases
 * @returns {Object} - Roadmap with timeline details
 */
function generateRoadmap(phases) {
  // Calculate start and end dates for each phase
  let currentWeek = 0;
  
  phases.forEach(phase => {
    const startWeek = currentWeek;
    const endWeek = startWeek + phase.duration;
    
    phase.timeline = {
      startWeek,
      endWeek,
      startDate: getDateFromWeek(startWeek),
      endDate: getDateFromWeek(endWeek)
    };
    
    // Calculate task timelines
    phase.tasks.forEach(task => {
      task.startWeek = currentWeek;
      task.endWeek = currentWeek + task.durationWeeks;
      task.startDate = getDateFromWeek(task.startWeek);
      task.endDate = getDateFromWeek(task.endWeek);
      
      currentWeek = Math.max(currentWeek, task.endWeek);
    });
    
    // Ensure the next phase starts after all tasks in current phase
    currentWeek = endWeek;
  });
  
  // Calculate overall duration
  const totalDurationWeeks = currentWeek;
  const startDate = getDateFromWeek(0);
  const endDate = getDateFromWeek(totalDurationWeeks);
  
  // Create milestones
  const milestones = [
    {
      name: 'Project Kickoff',
      week: 0,
      date: getDateFromWeek(0)
    },
    {
      name: 'AWS Foundation Ready',
      week: phases[1].timeline.endWeek,
      date: phases[1].timeline.endDate
    },
    {
      name: 'Initial Migration Complete',
      week: phases[2].timeline.endWeek,
      date: phases[2].timeline.endDate
    },
    {
      name: 'Core Infrastructure Migrated',
      week: phases[3].timeline.endWeek,
      date: phases[3].timeline.endDate
    },
    {
      name: 'Main Applications Migrated',
      week: phases[4].timeline.endWeek,
      date: phases[4].timeline.endDate
    },
    {
      name: 'Final Cutover Complete',
      week: phases[6].timeline.endWeek,
      date: phases[6].timeline.endDate
    },
    {
      name: 'Project Complete',
      week: totalDurationWeeks,
      date: endDate
    }
  ];
  
  return {
    summary: {
      startDate,
      endDate,
      totalDurationWeeks,
      totalDurationMonths: Math.ceil(totalDurationWeeks / 4.33)
    },
    phases,
    milestones
  };
}

/**
 * Get date from week number (relative to today)
 * @param {number} weekNumber - Week number
 * @returns {string} - Date string (ISO format)
 */
function getDateFromWeek(weekNumber) {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (weekNumber * 7));
  return targetDate.toISOString().split('T')[0];
}

/**
 * Store roadmap in DynamoDB
 * @param {string} projectId - Project ID
 * @param {Object} roadmap - Roadmap object
 */
async function storeRoadmap(projectId, roadmap) {
  // Store roadmap summary
  await dynamoDB.put({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Item: {
      projectId,
      resourceId: 'PROJECT#ROADMAP#SUMMARY',
      resourceType: 'ROADMAP_SUMMARY',
      startDate: roadmap.summary.startDate,
      endDate: roadmap.summary.endDate,
      totalDurationWeeks: roadmap.summary.totalDurationWeeks,
      totalDurationMonths: roadmap.summary.totalDurationMonths,
      createdAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    }
  }).promise();
  
  // Store phases
  for (const phase of roadmap.phases) {
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
      Item: {
        projectId,
        resourceId: `PROJECT#ROADMAP#PHASE#${phase.phaseNumber}`,
        resourceType: 'ROADMAP_PHASE',
        phaseNumber: phase.phaseNumber,
        name: phase.name,
        description: phase.description,
        duration: phase.duration,
        timeline: phase.timeline,
        tasks: phase.tasks,
        serverIds: phase.serverIds,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
      }
    }).promise();
  }
  
  // Store milestones
  for (let i = 0; i < roadmap.milestones.length; i++) {
    const milestone = roadmap.milestones[i];
    
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
      Item: {
        projectId,
        resourceId: `PROJECT#ROADMAP#MILESTONE#${i}`,
        resourceType: 'ROADMAP_MILESTONE',
        milestoneNumber: i + 1,
        name: milestone.name,
        week: milestone.week,
        date: milestone.date,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
      }
    }).promise();
  }
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