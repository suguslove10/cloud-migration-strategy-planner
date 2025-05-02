/**
 * Configuration for the Cloud Migration Strategy Planner
 */
const CONFIG = {
  // API Endpoints
  API: {
    // Base URL for the API
    // Replace with your actual API Gateway URL after deployment
    BASE_URL: 'https://6s24poxsn3.execute-api.ap-south-1.amazonaws.com/dev/',
    
    // Endpoints
    ENDPOINTS: {
      START_DISCOVERY: '/discovery/start',
      GET_ANALYSIS: '/analysis/:projectId',
      GET_COSTS: '/costs/:projectId',
      GET_ROADMAP: '/roadmap/:projectId'
    }
  },
  
  // Local storage keys
  STORAGE: {
    PROJECTS: 'migration-planner-projects',
    CURRENT_PROJECT: 'migration-planner-current-project'
  },
  
  // Status messages
  STATUS: {
    CREATED: { text: 'Created', color: 'secondary' },
    DISCOVERY_STARTED: { text: 'Discovery Started', color: 'info' },
    DISCOVERY_PROCESSED: { text: 'Discovery Processed', color: 'info' },
    ANALYSIS_COMPLETED: { text: 'Analysis Completed', color: 'primary' },
    COST_ESTIMATION_COMPLETED: { text: 'Cost Estimation Completed', color: 'primary' },
    ROADMAP_GENERATED: { text: 'Roadmap Generated', color: 'success' }
  },
  
  // Migration strategies
  STRATEGIES: {
    'Rehost (Lift-and-Shift)': { shortName: 'Rehost', class: 'strategy-rehost' },
    'Replatform': { shortName: 'Replatform', class: 'strategy-replatform' },
    'Rearchitect': { shortName: 'Rearchitect', class: 'strategy-rearchitect' }
  },
  
  // Chart colors
  CHART_COLORS: {
    'Rehost (Lift-and-Shift)': '#0d6efd',
    'Replatform': '#198754',
    'Rearchitect': '#dc3545',
    background: [
      'rgba(13, 110, 253, 0.7)',
      'rgba(25, 135, 84, 0.7)',
      'rgba(220, 53, 69, 0.7)'
    ],
    border: [
      'rgba(13, 110, 253, 1)',
      'rgba(25, 135, 84, 1)',
      'rgba(220, 53, 69, 1)'
    ]
  }
}; 