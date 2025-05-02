/**
 * Cloud Migration Strategy Planner - Utility Functions
 */

// Load utility functions
function loadUtilityFunctions() {
  // This function is called from app.js to ensure utilities are loaded
  console.log('Utility functions loaded');
}

// Show an alert message
function showAlert(type, message) {
  // Create alert element
  const alertEl = document.createElement('div');
  alertEl.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  alertEl.style.zIndex = 9999;
  alertEl.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Add to document
  document.body.appendChild(alertEl);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const bsAlert = new bootstrap.Alert(alertEl);
    bsAlert.close();
  }, 5000);
}

// Format currency
function formatCurrency(amount) {
  return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// API Functions

// Start discovery process
async function handleStartDiscovery(event) {
  event.preventDefault();
  
  if (!state.currentProject) {
    showAlert('warning', 'Please select or create a project first.');
    return;
  }
  
  // Get agent IDs
  const agentIdsText = elements.agentIds.value.trim();
  if (!agentIdsText) {
    showAlert('warning', 'Please enter at least one agent ID.');
    return;
  }
  
  // Parse agent IDs (one per line)
  const agentIds = agentIdsText.split('\n')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  if (agentIds.length === 0) {
    showAlert('warning', 'Please enter at least one valid agent ID.');
    return;
  }
  
  try {
    const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.START_DISCOVERY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: state.currentProject.id,
        projectName: state.currentProject.name,
        agentIds
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to start discovery');
    }
    
    // Update project status
    state.currentProject.status = 'DISCOVERY_STARTED';
    saveProjects();
    updateProjectStatus();
    
    showAlert('success', 'Discovery process started successfully!');
  } catch (error) {
    console.error('Error starting discovery:', error);
    showAlert('error', `Error starting discovery: ${error.message}`);
  }
}

// Run migration analysis
async function handleRunAnalysis() {
  if (!state.currentProject) {
    showAlert('warning', 'Please select or create a project first.');
    return;
  }
  
  // Check if discovery has been processed
  if (state.currentProject.status !== 'DISCOVERY_PROCESSED') {
    showAlert('warning', 'Discovery process must be completed before running analysis.');
    return;
  }
  
  try {
    // This would typically call a Lambda function to start the analysis process
    // For this demo, we'll simulate the process by updating the project status
    state.currentProject.status = 'ANALYSIS_COMPLETED';
    saveProjects();
    updateProjectStatus();
    
    // Load analysis data
    await loadAnalysisData(state.currentProject.id);
    updateAnalysisUI();
    
    showAlert('success', 'Migration analysis completed successfully!');
  } catch (error) {
    console.error('Error running analysis:', error);
    showAlert('error', `Error running analysis: ${error.message}`);
  }
}

// Run cost estimation
async function handleRunCostEstimation() {
  if (!state.currentProject) {
    showAlert('warning', 'Please select or create a project first.');
    return;
  }
  
  // Check if analysis has been completed
  if (state.currentProject.status !== 'ANALYSIS_COMPLETED' && 
      state.currentProject.status !== 'COST_ESTIMATION_COMPLETED' && 
      state.currentProject.status !== 'ROADMAP_GENERATED') {
    showAlert('warning', 'Migration analysis must be completed before running cost estimation.');
    return;
  }
  
  try {
    // This would typically call a Lambda function to start the cost estimation process
    // For this demo, we'll simulate the process by updating the project status
    state.currentProject.status = 'COST_ESTIMATION_COMPLETED';
    saveProjects();
    updateProjectStatus();
    
    // Load cost data
    await loadCostData(state.currentProject.id);
    updateCostsUI();
    
    showAlert('success', 'Cost estimation completed successfully!');
  } catch (error) {
    console.error('Error running cost estimation:', error);
    showAlert('error', `Error running cost estimation: ${error.message}`);
  }
}

// Generate roadmap
async function handleGenerateRoadmap() {
  if (!state.currentProject) {
    showAlert('warning', 'Please select or create a project first.');
    return;
  }
  
  // Check if cost estimation has been completed
  if (state.currentProject.status !== 'COST_ESTIMATION_COMPLETED' && 
      state.currentProject.status !== 'ROADMAP_GENERATED') {
    showAlert('warning', 'Cost estimation must be completed before generating roadmap.');
    return;
  }
  
  try {
    // This would typically call a Lambda function to start the roadmap generation process
    // For this demo, we'll simulate the process by updating the project status
    state.currentProject.status = 'ROADMAP_GENERATED';
    saveProjects();
    updateProjectStatus();
    
    // Load roadmap data
    await loadRoadmapData(state.currentProject.id);
    updateRoadmapUI();
    
    showAlert('success', 'Migration roadmap generated successfully!');
  } catch (error) {
    console.error('Error generating roadmap:', error);
    showAlert('error', `Error generating roadmap: ${error.message}`);
  }
}

// Load analysis data
async function loadAnalysisData(projectId) {
  try {
    // In a real implementation, this would call the API
    // For this demo, we'll simulate the API response with mock data
    const endpoint = CONFIG.API.ENDPOINTS.GET_ANALYSIS.replace(':projectId', projectId);
    
    // For demo purposes, simulate an API call
    // const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`);
    // const data = await response.json();
    
    // Mock data for demo
    const data = getMockAnalysisData(projectId);
    
    // Update state
    state.servers = data.servers || [];
    state.recommendations = data.recommendations || [];
    
    return data;
  } catch (error) {
    console.error('Error loading analysis data:', error);
    throw error;
  }
}

// Load cost data
async function loadCostData(projectId) {
  try {
    // In a real implementation, this would call the API
    // For this demo, we'll simulate the API response with mock data
    const endpoint = CONFIG.API.ENDPOINTS.GET_COSTS.replace(':projectId', projectId);
    
    // For demo purposes, simulate an API call
    // const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`);
    // const data = await response.json();
    
    // Mock data for demo
    const data = getMockCostData(projectId);
    
    // Update state
    state.costEstimates = data.costEstimates || [];
    state.costSummary = data.summary || {};
    
    return data;
  } catch (error) {
    console.error('Error loading cost data:', error);
    throw error;
  }
}

// Load roadmap data
async function loadRoadmapData(projectId) {
  try {
    // In a real implementation, this would call the API
    // For this demo, we'll simulate the API response with mock data
    const endpoint = CONFIG.API.ENDPOINTS.GET_ROADMAP.replace(':projectId', projectId);
    
    // For demo purposes, simulate an API call
    // const response = await fetch(`${CONFIG.API.BASE_URL}${endpoint}`);
    // const data = await response.json();
    
    // Mock data for demo
    const data = getMockRoadmapData(projectId);
    
    // Update state
    state.roadmap = data;
    
    return data;
  } catch (error) {
    console.error('Error loading roadmap data:', error);
    throw error;
  }
}

// Update Analysis UI
function updateAnalysisUI() {
  // Update total servers count
  elements.totalServers.textContent = state.servers.length || '-';
  
  // Update strategies chart
  updateStrategiesChart();
  
  // Update recommendations table
  updateRecommendationsTable();
}

// Update Costs UI
function updateCostsUI() {
  // Update cost summary
  if (state.costSummary) {
    elements.monthlyCost.textContent = formatCurrency(state.costSummary.totalMonthlyCost || 0);
    elements.yearlyCost.textContent = formatCurrency(state.costSummary.totalYearlyCost || 0);
    elements.upfrontCost.textContent = formatCurrency(state.costSummary.totalUpfrontCost || 0);
  } else {
    elements.monthlyCost.textContent = '-';
    elements.yearlyCost.textContent = '-';
    elements.upfrontCost.textContent = '-';
  }
  
  // Update costs table
  updateCostsTable();
}

// Update Roadmap UI
function updateRoadmapUI() {
  if (!state.roadmap || !state.roadmap.summary) {
    elements.roadmapStartDate.textContent = '-';
    elements.roadmapEndDate.textContent = '-';
    elements.roadmapDuration.textContent = '-';
    elements.roadmapPhases.textContent = '-';
    elements.roadmapTimeline.innerHTML = '';
    elements.roadmapPhasesList.innerHTML = '';
    return;
  }
  
  // Update roadmap summary
  elements.roadmapStartDate.textContent = formatDate(state.roadmap.summary.startDate);
  elements.roadmapEndDate.textContent = formatDate(state.roadmap.summary.endDate);
  elements.roadmapDuration.textContent = `${state.roadmap.summary.totalDurationWeeks} weeks`;
  elements.roadmapPhases.textContent = state.roadmap.phases.length;
  
  // Update roadmap timeline
  updateRoadmapTimeline();
  
  // Update roadmap phases
  updateRoadmapPhases();
}

// Get mock data for demonstration
function getMockAnalysisData(projectId) {
  return {
    projectId,
    status: 'ANALYSIS_COMPLETED',
    summary: {
      totalServers: 5,
      strategies: {
        'Rehost (Lift-and-Shift)': 2,
        'Replatform': 2,
        'Rearchitect': 1
      }
    },
    servers: [
      {
        resourceId: 'SERVER#1',
        name: 'Web Server 1',
        operatingSystem: 'Linux',
        numCpus: 2,
        ramSizeGB: 4,
        diskSizeGB: 50
      },
      {
        resourceId: 'SERVER#2',
        name: 'Database Server',
        operatingSystem: 'Linux',
        numCpus: 4,
        ramSizeGB: 8,
        diskSizeGB: 200
      },
      {
        resourceId: 'SERVER#3',
        name: 'Application Server',
        operatingSystem: 'Windows',
        numCpus: 4,
        ramSizeGB: 16,
        diskSizeGB: 100
      },
      {
        resourceId: 'SERVER#4',
        name: 'Web Server 2',
        operatingSystem: 'Linux',
        numCpus: 2,
        ramSizeGB: 4,
        diskSizeGB: 50
      },
      {
        resourceId: 'SERVER#5',
        name: 'Legacy App Server',
        operatingSystem: 'Windows',
        numCpus: 2,
        ramSizeGB: 8,
        diskSizeGB: 80
      }
    ],
    recommendations: [
      {
        serverId: '1',
        serverName: 'Web Server 1',
        migrationStrategy: 'Replatform',
        targetService: 'Amazon ECS/EKS',
        rationale: 'This web server is a good candidate for containerization and migration to Amazon ECS or EKS.'
      },
      {
        serverId: '2',
        serverName: 'Database Server',
        migrationStrategy: 'Replatform',
        targetService: 'Amazon RDS',
        rationale: 'This database server is a good candidate for migration to Amazon RDS.'
      },
      {
        serverId: '3',
        serverName: 'Application Server',
        migrationStrategy: 'Rehost (Lift-and-Shift)',
        targetService: 'Amazon EC2',
        rationale: 'This server is a good candidate for a simple lift-and-shift migration to Amazon EC2.'
      },
      {
        serverId: '4',
        serverName: 'Web Server 2',
        migrationStrategy: 'Rehost (Lift-and-Shift)',
        targetService: 'Amazon EC2',
        rationale: 'This server is a good candidate for a simple lift-and-shift migration to Amazon EC2.'
      },
      {
        serverId: '5',
        serverName: 'Legacy App Server',
        migrationStrategy: 'Rearchitect',
        targetService: 'AWS Lambda / Containers',
        rationale: 'This workload could be re-architected into serverless functions or microservices.'
      }
    ]
  };
}

// Get mock cost data for demonstration
function getMockCostData(projectId) {
  return {
    projectId,
    status: 'COST_ESTIMATION_COMPLETED',
    summary: {
      totalServers: 5,
      totalMonthlyCost: 825.50,
      totalYearlyCost: 9906.00,
      totalUpfrontCost: 12500.00
    },
    costEstimates: [
      {
        serverId: '1',
        serverName: 'Web Server 1',
        migrationStrategy: 'Replatform',
        targetService: 'Amazon ECS/EKS',
        monthlyCost: 125.75,
        yearlyCost: 1509.00,
        upfrontCost: 2100.00
      },
      {
        serverId: '2',
        serverName: 'Database Server',
        migrationStrategy: 'Replatform',
        targetService: 'Amazon RDS',
        monthlyCost: 289.95,
        yearlyCost: 3479.40,
        upfrontCost: 3200.00
      },
      {
        serverId: '3',
        serverName: 'Application Server',
        migrationStrategy: 'Rehost (Lift-and-Shift)',
        targetService: 'Amazon EC2',
        monthlyCost: 192.60,
        yearlyCost: 2311.20,
        upfrontCost: 1800.00
      },
      {
        serverId: '4',
        serverName: 'Web Server 2',
        migrationStrategy: 'Rehost (Lift-and-Shift)',
        targetService: 'Amazon EC2',
        monthlyCost: 97.20,
        yearlyCost: 1166.40,
        upfrontCost: 1400.00
      },
      {
        serverId: '5',
        serverName: 'Legacy App Server',
        migrationStrategy: 'Rearchitect',
        targetService: 'AWS Lambda / Containers',
        monthlyCost: 120.00,
        yearlyCost: 1440.00,
        upfrontCost: 4000.00
      }
    ]
  };
}

// Get mock roadmap data for demonstration
function getMockRoadmapData(projectId) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 180); // 6 months
  
  return {
    projectId,
    status: 'ROADMAP_GENERATED',
    summary: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDurationWeeks: 26,
      totalDurationMonths: 6
    },
    phases: [
      {
        phaseNumber: 1,
        name: 'Assessment and Planning',
        description: 'Assess current infrastructure, finalize migration strategy, and create detailed plans',
        duration: 4,
        timeline: {
          startWeek: 0,
          endWeek: 4,
          startDate: new Date(startDate.getTime() + (0 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          endDate: new Date(startDate.getTime() + (4 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        tasks: [
          { name: 'Finalize migration goals and success criteria', durationWeeks: 1 },
          { name: 'Review and validate infrastructure assessment data', durationWeeks: 1 },
          { name: 'Confirm migration strategy recommendations', durationWeeks: 1 },
          { name: 'Develop detailed migration plan and timeline', durationWeeks: 2 }
        ],
        serverIds: []
      },
      {
        phaseNumber: 2,
        name: 'Foundation Setup',
        description: 'Set up AWS foundation components required for the migration',
        duration: 3,
        timeline: {
          startWeek: 4,
          endWeek: 7,
          startDate: new Date(startDate.getTime() + (4 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          endDate: new Date(startDate.getTime() + (7 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        tasks: [
          { name: 'Set up AWS accounts and IAM policies', durationWeeks: 1 },
          { name: 'Configure networking (VPC, subnets, security groups)', durationWeeks: 2 },
          { name: 'Set up monitoring and logging infrastructure', durationWeeks: 1 }
        ],
        serverIds: []
      },
      {
        phaseNumber: 3,
        name: 'Initial Migration',
        description: 'Migrate first batch of servers with minimal dependencies',
        duration: 4,
        timeline: {
          startWeek: 7,
          endWeek: 11,
          startDate: new Date(startDate.getTime() + (7 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          endDate: new Date(startDate.getTime() + (11 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        tasks: [
          { name: 'Prepare initial migration batch', durationWeeks: 1 },
          { name: 'Migrate development and test environments', durationWeeks: 2 },
          { name: 'Perform initial migration testing', durationWeeks: 1 }
        ],
        serverIds: ['1', '4']
      },
      {
        phaseNumber: 4,
        name: 'Core Infrastructure Migration',
        description: 'Migrate core infrastructure components',
        duration: 6,
        timeline: {
          startWeek: 11,
          endWeek: 17,
          startDate: new Date(startDate.getTime() + (11 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          endDate: new Date(startDate.getTime() + (17 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        tasks: [
          { name: 'Migrate database servers', durationWeeks: 3 },
          { name: 'Configure high availability and scalability', durationWeeks: 2 },
          { name: 'Perform integration testing', durationWeeks: 2 }
        ],
        serverIds: ['2']
      },
      {
        phaseNumber: 5,
        name: 'Main Application Migration',
        description: 'Migrate main business applications',
        duration: 6,
        timeline: {
          startWeek: 17,
          endWeek: 23,
          startDate: new Date(startDate.getTime() + (17 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          endDate: new Date(startDate.getTime() + (23 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        tasks: [
          { name: 'Migrate application servers', durationWeeks: 3 },
          { name: 'Perform comprehensive application testing', durationWeeks: 2 },
          { name: 'User acceptance testing', durationWeeks: 2 }
        ],
        serverIds: ['3']
      },
      {
        phaseNumber: 6,
        name: 'Rearchitecting and Optimization',
        description: 'Rearchitect and optimize applications for cloud-native operation',
        duration: 8,
        timeline: {
          startWeek: 17,
          endWeek: 25,
          startDate: new Date(startDate.getTime() + (17 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          endDate: new Date(startDate.getTime() + (25 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        tasks: [
          { name: 'Refactor applications for cloud-native architecture', durationWeeks: 6 },
          { name: 'Implement serverless components', durationWeeks: 4 }
        ],
        serverIds: ['5']
      },
      {
        phaseNumber: 7,
        name: 'Final Cutover and Decommission',
        description: 'Complete migration, cutover to AWS, and decommission on-premises infrastructure',
        duration: 3,
        timeline: {
          startWeek: 23,
          endWeek: 26,
          startDate: new Date(startDate.getTime() + (23 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          endDate: new Date(startDate.getTime() + (26 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        },
        tasks: [
          { name: 'Perform final cutover activities', durationWeeks: 1 },
          { name: 'Verify all services are operational in AWS', durationWeeks: 1 },
          { name: 'Decommission on-premises infrastructure', durationWeeks: 1 }
        ],
        serverIds: []
      }
    ],
    milestones: [
      {
        name: 'Project Kickoff',
        week: 0,
        date: startDate.toISOString().split('T')[0]
      },
      {
        name: 'AWS Foundation Ready',
        week: 7,
        date: new Date(startDate.getTime() + (7 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      },
      {
        name: 'Initial Migration Complete',
        week: 11,
        date: new Date(startDate.getTime() + (11 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      },
      {
        name: 'Core Infrastructure Migrated',
        week: 17,
        date: new Date(startDate.getTime() + (17 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      },
      {
        name: 'Main Applications Migrated',
        week: 23,
        date: new Date(startDate.getTime() + (23 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      },
      {
        name: 'Project Complete',
        week: 26,
        date: endDate.toISOString().split('T')[0]
      }
    ]
  };
}