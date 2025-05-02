const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda function that estimates costs for migrating workloads to AWS
 */
exports.handler = async (event) => {
  console.log('Estimating migration costs:', JSON.stringify(event, null, 2));
  
  try {
    // Extract project ID from the event
    const projectId = event.projectId;
    
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    // Get all server resources for the project
    const serverItems = await getServerItems(projectId);
    console.log(`Found ${serverItems.length} servers for project: ${projectId}`);
    
    // Get migration recommendations for the project
    const recommendationItems = await getRecommendationItems(projectId);
    console.log(`Found ${recommendationItems.length} recommendations for project: ${projectId}`);
    
    // Create a map of server ID to recommendation for easier lookup
    const recommendationMap = {};
    recommendationItems.forEach(item => {
      const serverId = item.serverId;
      recommendationMap[serverId] = item;
    });
    
    // Estimate costs for each server
    const costEstimates = [];
    for (const server of serverItems) {
      // Extract server ID from resourceId (format: SERVER#{id})
      const serverId = server.resourceId.split('#')[1];
      
      // Get recommendation for this server
      const recommendation = recommendationMap[serverId] || null;
      
      // Estimate costs
      const costEstimate = estimateServerCost(server, recommendation);
      
      costEstimates.push({
        serverId,
        serverName: server.name,
        ...costEstimate
      });
    }
    
    // Calculate total costs
    const totalMonthlyCost = costEstimates.reduce((sum, item) => sum + item.monthlyCost, 0);
    const totalYearlyCost = costEstimates.reduce((sum, item) => sum + item.yearlyCost, 0);
    const totalUpfrontCost = costEstimates.reduce((sum, item) => sum + item.upfrontCost, 0);
    
    // Store cost estimates in DynamoDB
    await storeCostEstimates(projectId, costEstimates, totalMonthlyCost, totalYearlyCost, totalUpfrontCost);
    
    // Update project status
    await updateProjectStatus(projectId, 'COST_ESTIMATION_COMPLETED');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cost estimation completed successfully',
        costEstimates,
        totalCosts: {
          monthly: totalMonthlyCost,
          yearly: totalYearlyCost,
          upfront: totalUpfrontCost
        }
      })
    };
  } catch (error) {
    console.error('Error estimating migration costs:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error estimating migration costs',
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
 * Estimate costs for migrating a server to AWS
 * @param {Object} server - Server item
 * @param {Object} recommendation - Recommendation item
 * @returns {Object} - Cost estimates
 */
function estimateServerCost(server, recommendation) {
  // Default cost estimates
  let monthlyCost = 0;
  let yearlyCost = 0;
  let upfrontCost = 0;
  let costBreakdown = {};
  
  // Set migration cost estimates based on recommendation
  if (recommendation) {
    const strategy = recommendation.migrationStrategy;
    const targetService = recommendation.targetService;
    
    // Get costs based on server specs and target service
    const costs = calculateCosts(server, strategy, targetService);
    
    monthlyCost = costs.monthlyCost;
    yearlyCost = costs.yearlyCost;
    upfrontCost = costs.upfrontCost;
    costBreakdown = costs.breakdown;
  } else {
    // Default to EC2 if no recommendation exists
    const costs = calculateEC2Cost(server);
    
    monthlyCost = costs.monthlyCost;
    yearlyCost = costs.yearlyCost;
    upfrontCost = costs.upfrontCost;
    costBreakdown = costs.breakdown;
  }
  
  return {
    migrationStrategy: recommendation ? recommendation.migrationStrategy : 'Rehost (Lift-and-Shift)',
    targetService: recommendation ? recommendation.targetService : 'Amazon EC2',
    monthlyCost,
    yearlyCost,
    upfrontCost,
    costBreakdown
  };
}

/**
 * Calculate costs based on server specs, migration strategy, and target service
 * @param {Object} server - Server item
 * @param {string} strategy - Migration strategy
 * @param {string} targetService - Target AWS service
 * @returns {Object} - Cost estimates
 */
function calculateCosts(server, strategy, targetService) {
  if (targetService.includes('EC2')) {
    return calculateEC2Cost(server);
  } else if (targetService.includes('RDS') || targetService.includes('DocumentDB')) {
    return calculateDatabaseCost(server, targetService);
  } else if (targetService.includes('ECS') || targetService.includes('EKS')) {
    return calculateContainerCost(server);
  } else if (targetService.includes('Lambda')) {
    return calculateServerlessCost(server);
  } else if (targetService.includes('Aurora')) {
    return calculateAuroraCost(server);
  } else if (targetService.includes('DynamoDB')) {
    return calculateDynamoDBCost(server);
  } else if (targetService.includes('App Runner')) {
    return calculateAppRunnerCost(server);
  } else {
    // Default to EC2
    return calculateEC2Cost(server);
  }
}

/**
 * Calculate EC2 costs
 * @param {Object} server - Server item
 * @returns {Object} - Cost estimates
 */
function calculateEC2Cost(server) {
  // Get number of CPUs and memory
  const numCpus = server.numCpus || 2;
  const ramSizeGB = server.ramSizeGB || 4;
  const diskSizeGB = server.diskSizeGB || 50;
  
  // Determine instance type based on specs
  let instanceType = 't2.micro'; // Default for Free Tier
  let instanceHourlyCost = 0.0116; // Default cost for t2.micro
  
  if (numCpus <= 1 && ramSizeGB <= 1) {
    instanceType = 't2.micro';
    instanceHourlyCost = 0.0116;
  } else if (numCpus <= 2 && ramSizeGB <= 4) {
    instanceType = 't2.medium';
    instanceHourlyCost = 0.0464;
  } else if (numCpus <= 4 && ramSizeGB <= 8) {
    instanceType = 'm5.large';
    instanceHourlyCost = 0.096;
  } else if (numCpus <= 8 && ramSizeGB <= 16) {
    instanceType = 'm5.xlarge';
    instanceHourlyCost = 0.192;
  } else if (numCpus <= 16 && ramSizeGB <= 32) {
    instanceType = 'm5.2xlarge';
    instanceHourlyCost = 0.384;
  } else {
    instanceType = 'm5.4xlarge';
    instanceHourlyCost = 0.768;
  }
  
  // Calculate EBS cost
  const ebsCostPerGB = 0.10; // $0.10 per GB per month for GP2
  const ebsMonthlyCost = diskSizeGB * ebsCostPerGB;
  
  // Calculate data transfer cost (estimate 100GB per month out)
  const dataTransferCost = 100 * 0.09; // First 10TB at $0.09 per GB
  
  // Calculate total monthly cost
  const instanceMonthlyCost = instanceHourlyCost * 24 * 30; // 30 days per month
  const totalMonthlyCost = instanceMonthlyCost + ebsMonthlyCost + dataTransferCost;
  const totalYearlyCost = totalMonthlyCost * 12;
  
  // Estimate upfront migration cost
  const upfrontCost = calculateUpfrontMigrationCost(server, 'Rehost');
  
  return {
    monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
    yearlyCost: parseFloat(totalYearlyCost.toFixed(2)),
    upfrontCost: parseFloat(upfrontCost.toFixed(2)),
    breakdown: {
      instanceType,
      compute: parseFloat(instanceMonthlyCost.toFixed(2)),
      storage: parseFloat(ebsMonthlyCost.toFixed(2)),
      dataTransfer: parseFloat(dataTransferCost.toFixed(2))
    }
  };
}

/**
 * Calculate RDS/DocumentDB costs
 * @param {Object} server - Server item
 * @param {string} databaseService - Database service type
 * @returns {Object} - Cost estimates
 */
function calculateDatabaseCost(server, databaseService) {
  // Get number of CPUs and memory
  const numCpus = server.numCpus || 2;
  const ramSizeGB = server.ramSizeGB || 4;
  const diskSizeGB = server.diskSizeGB || 50;
  
  // Determine instance type based on specs
  let instanceType = 'db.t3.micro'; // Default for Free Tier
  let instanceHourlyCost = 0.017; // Default cost for db.t3.micro
  
  if (numCpus <= 1 && ramSizeGB <= 1) {
    instanceType = 'db.t3.micro';
    instanceHourlyCost = 0.017;
  } else if (numCpus <= 2 && ramSizeGB <= 4) {
    instanceType = 'db.t3.medium';
    instanceHourlyCost = 0.068;
  } else if (numCpus <= 4 && ramSizeGB <= 8) {
    instanceType = 'db.m5.large';
    instanceHourlyCost = 0.133;
  } else if (numCpus <= 8 && ramSizeGB <= 16) {
    instanceType = 'db.m5.xlarge';
    instanceHourlyCost = 0.267;
  } else {
    instanceType = 'db.m5.2xlarge';
    instanceHourlyCost = 0.534;
  }
  
  // Add premium for specific database engines
  if (databaseService.includes('SQL Server')) {
    instanceHourlyCost += 0.15; // Additional cost for SQL Server
  } else if (databaseService.includes('Oracle')) {
    instanceHourlyCost += 0.17; // Additional cost for Oracle
  }
  
  // Calculate storage cost
  const storageCostPerGB = 0.115; // $0.115 per GB per month for GP2
  const storageMonthlyCost = diskSizeGB * storageCostPerGB;
  
  // Calculate backup cost (assume 50% of storage)
  const backupCost = (diskSizeGB * 0.5) * 0.095; // $0.095 per GB per month
  
  // Calculate total monthly cost
  const instanceMonthlyCost = instanceHourlyCost * 24 * 30; // 30 days per month
  const totalMonthlyCost = instanceMonthlyCost + storageMonthlyCost + backupCost;
  const totalYearlyCost = totalMonthlyCost * 12;
  
  // Estimate upfront migration cost
  const upfrontCost = calculateUpfrontMigrationCost(server, 'Replatform');
  
  return {
    monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
    yearlyCost: parseFloat(totalYearlyCost.toFixed(2)),
    upfrontCost: parseFloat(upfrontCost.toFixed(2)),
    breakdown: {
      instanceType,
      compute: parseFloat(instanceMonthlyCost.toFixed(2)),
      storage: parseFloat(storageMonthlyCost.toFixed(2)),
      backup: parseFloat(backupCost.toFixed(2))
    }
  };
}

/**
 * Calculate container (ECS/EKS) costs
 * @param {Object} server - Server item
 * @returns {Object} - Cost estimates
 */
function calculateContainerCost(server) {
  // Get number of CPUs and memory
  const numCpus = server.numCpus || 2;
  const ramSizeGB = server.ramSizeGB || 4;
  const diskSizeGB = server.diskSizeGB || 50;
  
  // Calculate EC2 cost (containers will run on EC2)
  const ec2Cost = calculateEC2Cost(server);
  
  // EKS cluster cost (if using EKS) - $0.10 per hour
  const eksCost = 0.10 * 24 * 30; // 30 days per month
  
  // ECS has no additional cost beyond EC2 instances
  // For simplicity, we'll assume EKS is being used
  
  // Calculate total monthly cost
  const totalMonthlyCost = ec2Cost.monthlyCost + eksCost;
  const totalYearlyCost = totalMonthlyCost * 12;
  
  // Estimate upfront migration cost
  const upfrontCost = calculateUpfrontMigrationCost(server, 'Replatform');
  
  return {
    monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
    yearlyCost: parseFloat(totalYearlyCost.toFixed(2)),
    upfrontCost: parseFloat(upfrontCost.toFixed(2)),
    breakdown: {
      compute: parseFloat(ec2Cost.monthlyCost.toFixed(2)),
      eksCluster: parseFloat(eksCost.toFixed(2))
    }
  };
}

/**
 * Calculate serverless (Lambda) costs
 * @param {Object} server - Server item
 * @returns {Object} - Cost estimates
 */
function calculateServerlessCost(server) {
  // Estimate Lambda costs based on server specs
  const numCpus = server.numCpus || 2;
  const ramSizeGB = server.ramSizeGB || 4;
  
  // Estimate Lambda memory configuration
  const lambdaMemoryMB = Math.min(Math.max(ramSizeGB * 1024, 128), 10240);
  
  // Estimate number of requests per month
  const requestsPerMonth = 3000000; // 100k per day
  
  // Estimate average duration per request in ms
  const avgDurationMs = 500;
  
  // Calculate Lambda cost
  // $0.0000166667 per GB-second
  const gbSeconds = (lambdaMemoryMB / 1024) * (avgDurationMs / 1000) * requestsPerMonth;
  const computeCost = gbSeconds * 0.0000166667;
  
  // Request cost ($0.20 per 1M requests)
  const requestCost = requestsPerMonth * 0.20 / 1000000;
  
  // API Gateway cost ($3.50 per million requests)
  const apiGatewayCost = requestsPerMonth * 3.50 / 1000000;
  
  // DynamoDB costs (estimation for table storage and operations)
  const dynamoDBCost = 25; // Flat estimation
  
  // S3 storage (10GB)
  const s3Cost = 10 * 0.023;
  
  // Calculate total monthly cost
  const totalMonthlyCost = computeCost + requestCost + apiGatewayCost + dynamoDBCost + s3Cost;
  const totalYearlyCost = totalMonthlyCost * 12;
  
  // Estimate upfront migration cost (higher for re-architecting)
  const upfrontCost = calculateUpfrontMigrationCost(server, 'Rearchitect');
  
  return {
    monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
    yearlyCost: parseFloat(totalYearlyCost.toFixed(2)),
    upfrontCost: parseFloat(upfrontCost.toFixed(2)),
    breakdown: {
      lambdaCompute: parseFloat(computeCost.toFixed(2)),
      lambdaRequests: parseFloat(requestCost.toFixed(2)),
      apiGateway: parseFloat(apiGatewayCost.toFixed(2)),
      dynamoDB: parseFloat(dynamoDBCost.toFixed(2)),
      s3Storage: parseFloat(s3Cost.toFixed(2))
    }
  };
}

/**
 * Calculate Aurora Serverless costs
 * @param {Object} server - Server item
 * @returns {Object} - Cost estimates
 */
function calculateAuroraCost(server) {
  // Estimate Aurora Serverless costs based on server specs
  const numCpus = server.numCpus || 2;
  const ramSizeGB = server.ramSizeGB || 4;
  const diskSizeGB = server.diskSizeGB || 50;
  
  // Estimate Aurora Serverless capacity units (ACUs)
  const acu = Math.max(2, Math.ceil(numCpus * 2)); // 2 ACUs minimum
  
  // Estimate usage hours per month (assume 50% active time)
  const hoursPerMonth = 24 * 30 * 0.5;
  
  // Calculate Aurora Serverless compute cost
  // $0.06 per ACU-hour
  const computeCost = acu * hoursPerMonth * 0.06;
  
  // Calculate storage cost
  // $0.10 per GB-month
  const storageCost = diskSizeGB * 0.10;
  
  // Calculate I/O cost
  // $0.20 per 1M requests (estimated)
  const ioCost = 10; // Flat estimation
  
  // Calculate backup cost (assume 100% of storage)
  const backupCost = diskSizeGB * 0.021;
  
  // Calculate total monthly cost
  const totalMonthlyCost = computeCost + storageCost + ioCost + backupCost;
  const totalYearlyCost = totalMonthlyCost * 12;
  
  // Estimate upfront migration cost (higher for re-architecting)
  const upfrontCost = calculateUpfrontMigrationCost(server, 'Rearchitect');
  
  return {
    monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
    yearlyCost: parseFloat(totalYearlyCost.toFixed(2)),
    upfrontCost: parseFloat(upfrontCost.toFixed(2)),
    breakdown: {
      compute: parseFloat(computeCost.toFixed(2)),
      storage: parseFloat(storageCost.toFixed(2)),
      io: parseFloat(ioCost.toFixed(2)),
      backup: parseFloat(backupCost.toFixed(2))
    }
  };
}

/**
 * Calculate DynamoDB costs
 * @param {Object} server - Server item
 * @returns {Object} - Cost estimates
 */
function calculateDynamoDBCost(server) {
  // Estimate DynamoDB costs based on server specs
  const diskSizeGB = server.diskSizeGB || 50;
  
  // Estimate storage requirements
  const storageSizeGB = Math.min(diskSizeGB * 0.2, 25); // DynamoDB is more efficient, but Free Tier offers 25GB
  
  // Calculate storage cost
  // $0.25 per GB-month
  const storageCost = Math.max(0, storageSizeGB - 25) * 0.25; // First 25GB free
  
  // Estimate read capacity units (RCUs)
  const rcu = 25; // Free Tier: 25 RCUs
  
  // Estimate write capacity units (WCUs)
  const wcu = 25; // Free Tier: 25 WCUs
  
  // Calculate RCU cost
  // $0.00013 per RCU-hour
  const rcuCost = Math.max(0, rcu - 25) * 0.00013 * 24 * 30; // First 25 RCUs free
  
  // Calculate WCU cost
  // $0.00065 per WCU-hour
  const wcuCost = Math.max(0, wcu - 25) * 0.00065 * 24 * 30; // First 25 WCUs free
  
  // Calculate total monthly cost
  const totalMonthlyCost = storageCost + rcuCost + wcuCost;
  const totalYearlyCost = totalMonthlyCost * 12;
  
  // Estimate upfront migration cost (higher for re-architecting)
  const upfrontCost = calculateUpfrontMigrationCost(server, 'Rearchitect');
  
  return {
    monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
    yearlyCost: parseFloat(totalYearlyCost.toFixed(2)),
    upfrontCost: parseFloat(upfrontCost.toFixed(2)),
    breakdown: {
      storage: parseFloat(storageCost.toFixed(2)),
      readCapacity: parseFloat(rcuCost.toFixed(2)),
      writeCapacity: parseFloat(wcuCost.toFixed(2))
    }
  };
}

/**
 * Calculate App Runner costs
 * @param {Object} server - Server item
 * @returns {Object} - Cost estimates
 */
function calculateAppRunnerCost(server) {
  // Estimate App Runner costs based on server specs
  const numCpus = server.numCpus || 2;
  const ramSizeGB = server.ramSizeGB || 4;
  
  // Determine App Runner configuration
  let cpuUnits = 1; // 1 vCPU
  let memoryGB = 2; // 2 GB
  
  if (numCpus > 2 || ramSizeGB > 4) {
    cpuUnits = 2; // 2 vCPU
    memoryGB = 4; // 4 GB
  }
  
  if (numCpus > 4 || ramSizeGB > 8) {
    cpuUnits = 4; // 4 vCPU
    memoryGB = 8; // 8 GB
  }
  
  // Calculate compute costs
  // $0.064 per vCPU-hour
  // $0.008 per GB-hour
  const computeCostPerHour = (cpuUnits * 0.064) + (memoryGB * 0.008);
  
  // Estimate active hours per month (assume 50% active time)
  const activeHoursPerMonth = 24 * 30 * 0.5;
  
  // Calculate compute cost
  const computeCost = computeCostPerHour * activeHoursPerMonth;
  
  // Calculate data transfer cost (estimate 100GB per month out)
  const dataTransferCost = 100 * 0.09; // First 10TB at $0.09 per GB
  
  // Calculate total monthly cost
  const totalMonthlyCost = computeCost + dataTransferCost;
  const totalYearlyCost = totalMonthlyCost * 12;
  
  // Estimate upfront migration cost (higher for re-architecting)
  const upfrontCost = calculateUpfrontMigrationCost(server, 'Rearchitect');
  
  return {
    monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
    yearlyCost: parseFloat(totalYearlyCost.toFixed(2)),
    upfrontCost: parseFloat(upfrontCost.toFixed(2)),
    breakdown: {
      compute: parseFloat(computeCost.toFixed(2)),
      dataTransfer: parseFloat(dataTransferCost.toFixed(2))
    }
  };
}

/**
 * Calculate upfront migration cost
 * @param {Object} server - Server item
 * @param {string} strategy - Migration strategy
 * @returns {number} - Upfront cost
 */
function calculateUpfrontMigrationCost(server, strategy) {
  // Base cost for migration planning and testing
  let baseCost = 1000;
  
  // Get server size factors
  const numCpus = server.numCpus || 2;
  const ramSizeGB = server.ramSizeGB || 4;
  const diskSizeGB = server.diskSizeGB || 50;
  
  // Adjust base cost based on server size
  const serverSizeFactor = Math.sqrt((numCpus * ramSizeGB * diskSizeGB) / 50);
  baseCost = baseCost * serverSizeFactor;
  
  // Apply strategy multiplier
  let strategyMultiplier = 1.0;
  
  if (strategy === 'Rehost') {
    strategyMultiplier = 1.0; // Lift-and-shift is relatively straightforward
  } else if (strategy === 'Replatform') {
    strategyMultiplier = 2.0; // Replatforming requires more effort
  } else if (strategy === 'Rearchitect') {
    strategyMultiplier = 3.5; // Rearchitecting is the most effort-intensive
  }
  
  return baseCost * strategyMultiplier;
}

/**
 * Store cost estimates in DynamoDB
 * @param {string} projectId - Project ID
 * @param {Array} costEstimates - Array of cost estimates
 * @param {number} totalMonthlyCost - Total monthly cost
 * @param {number} totalYearlyCost - Total yearly cost
 * @param {number} totalUpfrontCost - Total upfront cost
 */
async function storeCostEstimates(projectId, costEstimates, totalMonthlyCost, totalYearlyCost, totalUpfrontCost) {
  // Store each cost estimate
  for (const estimate of costEstimates) {
    const item = {
      projectId,
      resourceId: `SERVER#${estimate.serverId}#COST`,
      resourceType: 'COST_ESTIMATE',
      serverId: estimate.serverId,
      serverName: estimate.serverName,
      migrationStrategy: estimate.migrationStrategy,
      targetService: estimate.targetService,
      monthlyCost: estimate.monthlyCost,
      yearlyCost: estimate.yearlyCost,
      upfrontCost: estimate.upfrontCost,
      costBreakdown: estimate.costBreakdown,
      createdAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    };
    
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
      Item: item
    }).promise();
  }
  
  // Store summary
  await dynamoDB.put({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Item: {
      projectId,
      resourceId: 'PROJECT#COSTS#SUMMARY',
      resourceType: 'COST_SUMMARY',
      totalServers: costEstimates.length,
      totalMonthlyCost,
      totalYearlyCost,
      totalUpfrontCost,
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