const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Lambda function that processes discovery data from AWS Application Discovery Service
 * Triggered by S3 event when new discovery data is uploaded
 */
exports.handler = async (event) => {
  console.log('Processing discovery data:', JSON.stringify(event, null, 2));
  
  try {
    // Extract S3 bucket and key from the event
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    
    // Get the discovery data file from S3
    const response = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    // Parse the discovery data
    const discoveryData = JSON.parse(response.Body.toString('utf-8'));
    console.log('Parsed discovery data successfully');
    
    // Extract project ID from the key - assuming format: "projects/{projectId}/discovery-data.json"
    const projectId = key.split('/')[1];
    
    // Process the discovery data
    const processed = await processDiscoveryData(discoveryData, projectId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Discovery data processed successfully',
        processed: processed
      })
    };
  } catch (error) {
    console.error('Error processing discovery data:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing discovery data',
        error: error.message
      })
    };
  }
};

/**
 * Process the discovery data and store relevant information in DynamoDB
 * @param {Object} data - Discovery data from AWS Application Discovery Service
 * @param {string} projectId - Project ID
 * @returns {Object} - Processing result
 */
async function processDiscoveryData(data, projectId) {
  console.log(`Processing data for project: ${projectId}`);
  
  // Extract servers information
  const servers = data.servers || [];
  console.log(`Found ${servers.length} servers`);
  
  // Process each server
  for (const server of servers) {
    // Basic server information
    const serverItem = {
      projectId,
      resourceId: `SERVER#${server.id}`,
      resourceType: 'SERVER',
      name: server.name,
      hostName: server.hostName,
      operatingSystem: server.osType,
      osVersion: server.osVersion,
      cpuType: server.cpuType,
      numCpus: server.numCpus,
      ramSizeGB: server.ramSizeGB,
      diskSizeGB: server.diskSizeGB,
      utilization: {
        cpu: server.averageCpuUtilization,
        memory: server.averageMemoryUtilization,
        diskIO: server.averageDiskIOPS
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    };
    
    // Store server information in DynamoDB
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
      Item: serverItem
    }).promise();
    
    console.log(`Processed server: ${server.name}`);
    
    // Process installed software
    if (server.installedSoftware && server.installedSoftware.length > 0) {
      for (const software of server.installedSoftware) {
        const softwareItem = {
          projectId,
          resourceId: `SERVER#${server.id}#SOFTWARE#${software.id}`,
          resourceType: 'SOFTWARE',
          serverId: server.id,
          serverName: server.name,
          name: software.name,
          version: software.version,
          publisher: software.publisher,
          installDate: software.installDate,
          createdAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
        };
        
        // Store software information in DynamoDB
        await dynamoDB.put({
          TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
          Item: softwareItem
        }).promise();
      }
      
      console.log(`Processed ${server.installedSoftware.length} software items for server: ${server.name}`);
    }
    
    // Process connections
    if (server.connections && server.connections.length > 0) {
      for (const connection of server.connections) {
        const connectionItem = {
          projectId,
          resourceId: `SERVER#${server.id}#CONNECTION#${connection.destinationServerId}`,
          resourceType: 'CONNECTION',
          sourceServerId: server.id,
          sourceServerName: server.name,
          destinationServerId: connection.destinationServerId,
          destinationServerName: connection.destinationServerName,
          networkPort: connection.port,
          protocol: connection.protocol,
          trafficRate: connection.averageTrafficRate,
          createdAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
        };
        
        // Store connection information in DynamoDB
        await dynamoDB.put({
          TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
          Item: connectionItem
        }).promise();
      }
      
      console.log(`Processed ${server.connections.length} connections for server: ${server.name}`);
    }
  }
  
  // Update project status
  await dynamoDB.put({
    TableName: process.env.DYNAMODB_TABLE || 'migration-planner-metadata-dev',
    Item: {
      projectId,
      resourceId: 'PROJECT#STATUS',
      resourceType: 'PROJECT_STATUS',
      status: 'DISCOVERY_PROCESSED',
      serverCount: servers.length,
      lastUpdated: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    }
  }).promise();
  
  return {
    projectId,
    serversProcessed: servers.length
  };
} 