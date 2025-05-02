/**
 * Cloud Migration Strategy Planner - Main Application JavaScript
 */

// DOM Elements
const elements = {
  // Navigation
  navDashboard: document.getElementById('nav-dashboard'),
  navDiscovery: document.getElementById('nav-discovery'),
  navAnalysis: document.getElementById('nav-analysis'),
  navCosts: document.getElementById('nav-costs'),
  navRoadmap: document.getElementById('nav-roadmap'),
  
  // Views
  dashboardView: document.getElementById('dashboard-view'),
  discoveryView: document.getElementById('discovery-view'),
  analysisView: document.getElementById('analysis-view'),
  costsView: document.getElementById('costs-view'),
  roadmapView: document.getElementById('roadmap-view'),
  
  // Project selection
  projectSelect: document.getElementById('project-select'),
  projectStatus: document.getElementById('project-status'),
  btnNewProject: document.getElementById('btn-new-project'),
  
  // Modals
  newProjectModal: new bootstrap.Modal(document.getElementById('new-project-modal')),
  serverDetailsModal: new bootstrap.Modal(document.getElementById('server-details-modal')),
  
  // New project form
  newProjectForm: document.getElementById('new-project-form'),
  projectName: document.getElementById('project-name'),
  projectId: document.getElementById('project-id'),
  btnCreateProject: document.getElementById('btn-create-project'),
  
  // Discovery
  discoveryForm: document.getElementById('discovery-form'),
  agentIds: document.getElementById('agent-ids'),
  btnStartDiscovery: document.getElementById('btn-start-discovery'),
  
  // Analysis
  totalServers: document.getElementById('total-servers'),
  strategiesChart: document.getElementById('strategies-chart'),
  recommendationsTable: document.getElementById('recommendations-table'),
  btnRunAnalysis: document.getElementById('btn-run-analysis'),
  
  // Costs
  monthlyCost: document.getElementById('monthly-cost'),
  yearlyCost: document.getElementById('yearly-cost'),
  upfrontCost: document.getElementById('upfront-cost'),
  costsTable: document.getElementById('costs-table'),
  btnRunCostEstimation: document.getElementById('btn-run-cost-estimation'),
  
  // Roadmap
  roadmapStartDate: document.getElementById('roadmap-start-date'),
  roadmapEndDate: document.getElementById('roadmap-end-date'),
  roadmapDuration: document.getElementById('roadmap-duration'),
  roadmapPhases: document.getElementById('roadmap-phases'),
  roadmapTimeline: document.getElementById('roadmap-timeline'),
  roadmapPhasesList: document.getElementById('roadmap-phases-list'),
  btnGenerateRoadmap: document.getElementById('btn-generate-roadmap'),
  
  // Server details
  serverDetailsContent: document.getElementById('server-details-content')
};

// App state
const state = {
  currentProject: null,
  projects: [],
  servers: [],
  recommendations: [],
  costEstimates: [],
  roadmap: null,
  strategiesChartInstance: null
};

// Initialize the application
function initApp() {
  // Load projects from local storage
  loadProjects();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load current project if available
  const currentProjectId = localStorage.getItem(CONFIG.STORAGE.CURRENT_PROJECT);
  if (currentProjectId) {
    const project = state.projects.find(p => p.id === currentProjectId);
    if (project) {
      setCurrentProject(project);
    }
  }
}

// Load projects from local storage
function loadProjects() {
  const projectsJson = localStorage.getItem(CONFIG.STORAGE.PROJECTS);
  if (projectsJson) {
    state.projects = JSON.parse(projectsJson);
    updateProjectSelect();
  }
}

// Save projects to local storage
function saveProjects() {
  localStorage.setItem(CONFIG.STORAGE.PROJECTS, JSON.stringify(state.projects));
  updateProjectSelect();
}

// Update project select dropdown
function updateProjectSelect() {
  elements.projectSelect.innerHTML = '<option value="">Select Project</option>';
  
  state.projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    if (state.currentProject && project.id === state.currentProject.id) {
      option.selected = true;
    }
    elements.projectSelect.appendChild(option);
  });
}

// Set up event listeners
function setupEventListeners() {
  // Navigation
  elements.navDashboard.addEventListener('click', () => showView(elements.dashboardView));
  elements.navDiscovery.addEventListener('click', () => showView(elements.discoveryView));
  elements.navAnalysis.addEventListener('click', () => showView(elements.analysisView));
  elements.navCosts.addEventListener('click', () => showView(elements.costsView));
  elements.navRoadmap.addEventListener('click', () => showView(elements.roadmapView));
  
  // Project selection
  elements.projectSelect.addEventListener('change', handleProjectChange);
  elements.btnNewProject.addEventListener('click', () => elements.newProjectModal.show());
  
  // New project form
  elements.btnCreateProject.addEventListener('click', handleCreateProject);
  
  // Discovery
  elements.discoveryForm.addEventListener('submit', handleStartDiscovery);
  
  // Analysis
  elements.btnRunAnalysis.addEventListener('click', handleRunAnalysis);
  
  // Costs
  elements.btnRunCostEstimation.addEventListener('click', handleRunCostEstimation);
  
  // Roadmap
  elements.btnGenerateRoadmap.addEventListener('click', handleGenerateRoadmap);
}

// Add diagnostic console logging for debugging
console.log('App initialized with config:', CONFIG);
console.log('API Base URL:', CONFIG.API.BASE_URL);

// Enhanced API fetch with better error handling
async function fetchWithErrorHandling(url, options = {}) {
  console.log(`Fetching ${url} with options:`, options);
  
  try {
    const response = await fetch(url, options);
    console.log(`Response status: ${response.status} for ${url}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Response data for ${url}:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    
    // Show user-friendly error message
    showToast('API Connection Error', `Failed to connect to the API: ${error.message}`, 'danger');
    
    // For demo purposes, return mock data if API fails
    return getMockData(url);
  }
}

// Show toast message
function showToast(title, message, type = 'info') {
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${title}</strong>: ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  const toastContainer = document.querySelector('.toast-container') || createToastContainer();
  toastContainer.appendChild(toastEl);
  
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
  
  // Automatically remove after it's hidden
  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

// Create toast container if it doesn't exist
function createToastContainer() {
  const container = document.createElement('div');
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  document.body.appendChild(container);
  return container;
}

// Mock data for demo mode
function getMockData(url) {
  console.log('Using mock data for:', url);
  
  // Extract the endpoint from the URL
  const endpoint = url.replace(CONFIG.API.BASE_URL, '');
  
  if (endpoint.startsWith('/discovery/start')) {
    return {
      success: true,
      message: 'Discovery process initiated successfully (DEMO MODE)',
      discoveryId: 'demo-discovery-' + Date.now()
    };
  } else if (endpoint.includes('/analysis/')) {
    return {
      success: true,
      projectId: endpoint.split('/').pop(),
      servers: [
        {
          id: 'srv-001',
          name: 'Application Server',
          type: 'Windows Server 2016',
          cpu: 4,
          memory: 16,
          storage: 500,
          recommended_strategy: 'Rehost (Lift-and-Shift)'
        },
        {
          id: 'srv-002',
          name: 'Database Server',
          type: 'Oracle Linux 7',
          cpu: 8,
          memory: 32,
          storage: 1000,
          recommended_strategy: 'Replatform'
        },
        {
          id: 'srv-003',
          name: 'Web Server',
          type: 'Ubuntu 18.04',
          cpu: 2,
          memory: 8,
          storage: 250,
          recommended_strategy: 'Rehost (Lift-and-Shift)'
        },
        {
          id: 'srv-004',
          name: 'Legacy App Server',
          type: 'Windows Server 2008 R2',
          cpu: 4,
          memory: 16,
          storage: 500,
          recommended_strategy: 'Rearchitect'
        }
      ],
      recommendations: {
        'Rehost (Lift-and-Shift)': 2,
        'Replatform': 1,
        'Rearchitect': 1
      }
    };
  } else if (endpoint.includes('/costs/')) {
    return {
      success: true,
      projectId: endpoint.split('/').pop(),
      monthly_cost: 1250.40,
      yearly_cost: 15004.80,
      upfront_cost: 2500.00,
      detailed_costs: [
        {
          strategy: 'Rehost (Lift-and-Shift)',
          servers: 2,
          monthly_cost: 450.20,
          yearly_cost: 5402.40,
          upfront_cost: 800.00
        },
        {
          strategy: 'Replatform',
          servers: 1,
          monthly_cost: 300.20,
          yearly_cost: 3602.40,
          upfront_cost: 700.00
        },
        {
          strategy: 'Rearchitect',
          servers: 1,
          monthly_cost: 500.00,
          yearly_cost: 6000.00,
          upfront_cost: 1000.00
        }
      ]
    };
  } else if (endpoint.includes('/roadmap/')) {
    return {
      success: true,
      projectId: endpoint.split('/').pop(),
      start_date: '2025-05-15',
      end_date: '2025-08-15',
      duration_weeks: 12,
      phases: [
        {
          name: 'Planning & Assessment',
          start_date: '2025-05-15',
          end_date: '2025-05-29',
          duration_weeks: 2,
          tasks: [
            { name: 'Finalize migration plan', duration_days: 5 },
            { name: 'Resource allocation', duration_days: 3 },
            { name: 'Risk assessment', duration_days: 4 }
          ]
        },
        {
          name: 'Pilot Migration',
          start_date: '2025-05-30',
          end_date: '2025-06-19',
          duration_weeks: 3,
          tasks: [
            { name: 'Migrate non-critical systems', duration_days: 10 },
            { name: 'Testing and validation', duration_days: 5 }
          ]
        },
        {
          name: 'Main Migration',
          start_date: '2025-06-20',
          end_date: '2025-07-24',
          duration_weeks: 5,
          tasks: [
            { name: 'Migrate Application Server', duration_days: 3 },
            { name: 'Migrate Database Server', duration_days: 5 },
            { name: 'Migrate Web Server', duration_days: 2 },
            { name: 'Migrate Legacy App Server', duration_days: 7 },
            { name: 'Integration testing', duration_days: 5 }
          ]
        },
        {
          name: 'Optimization & Closure',
          start_date: '2025-07-25',
          end_date: '2025-08-15',
          duration_weeks: 2,
          tasks: [
            { name: 'Performance optimization', duration_days: 5 },
            { name: 'Documentation finalization', duration_days: 3 },
            { name: 'Project closure', duration_days: 2 }
          ]
        }
      ]
    };
  }
  
  return { success: false, message: 'Endpoint not recognized in demo mode' };
}

// Show a specific view
function showView(view) {
  // Hide all views
  const views = [
    elements.dashboardView,
    elements.discoveryView,
    elements.analysisView,
    elements.costsView,
    elements.roadmapView
  ];
  
  views.forEach(v => v.classList.remove('active'));
  
  // Show the selected view
  view.classList.add('active');
  
  // Update navigation
  const navItems = [
    elements.navDashboard,
    elements.navDiscovery,
    elements.navAnalysis,
    elements.navCosts,
    elements.navRoadmap
  ];
  
  navItems.forEach(item => item.classList.remove('active'));
  
  // Set the corresponding nav item as active
  if (view === elements.dashboardView) {
    elements.navDashboard.classList.add('active');
  } else if (view === elements.discoveryView) {
    elements.navDiscovery.classList.add('active');
  } else if (view === elements.analysisView) {
    elements.navAnalysis.classList.add('active');
  } else if (view === elements.costsView) {
    elements.navCosts.classList.add('active');
  } else if (view === elements.roadmapView) {
    elements.navRoadmap.classList.add('active');
  }
}

// Handle project change
function handleProjectChange() {
  const projectId = elements.projectSelect.value;
  
  if (projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
    }
  } else {
    clearCurrentProject();
  }
}

// Set current project
function setCurrentProject(project) {
  state.currentProject = project;
  localStorage.setItem(CONFIG.STORAGE.CURRENT_PROJECT, project.id);
  
  // Update project status
  updateProjectStatus();
  
  // Load project data based on status
  loadProjectData(project);
}

// Clear current project
function clearCurrentProject() {
  state.currentProject = null;
  localStorage.removeItem(CONFIG.STORAGE.CURRENT_PROJECT);
  
  // Update project status
  elements.projectStatus.innerHTML = '<span class="badge bg-secondary">No Project Selected</span>';
  
  // Clear project data
  state.servers = [];
  state.recommendations = [];
  state.costEstimates = [];
  state.roadmap = null;
  
  // Update UI
  updateAnalysisUI();
  updateCostsUI();
  updateRoadmapUI();
}

// Update project status
function updateProjectStatus() {
  if (!state.currentProject) {
    elements.projectStatus.innerHTML = '<span class="badge bg-secondary">No Project Selected</span>';
    return;
  }
  
  const status = state.currentProject.status || 'CREATED';
  const statusConfig = CONFIG.STATUS[status] || { text: status, color: 'secondary' };
  
  elements.projectStatus.innerHTML = `<span class="badge bg-${statusConfig.color}">${statusConfig.text}</span>`;
}

// Load project data based on status
async function loadProjectData(project) {
  const status = project.status || 'CREATED';
  
  // Clear existing data
  state.servers = [];
  state.recommendations = [];
  state.costEstimates = [];
  state.roadmap = null;
  
  try {
    // Load data based on status
    if (status === 'ANALYSIS_COMPLETED' || status === 'COST_ESTIMATION_COMPLETED' || status === 'ROADMAP_GENERATED') {
      await loadAnalysisData(project.id);
      updateAnalysisUI();
    }
    
    if (status === 'COST_ESTIMATION_COMPLETED' || status === 'ROADMAP_GENERATED') {
      await loadCostData(project.id);
      updateCostsUI();
    }
    
    if (status === 'ROADMAP_GENERATED') {
      await loadRoadmapData(project.id);
      updateRoadmapUI();
    }
  } catch (error) {
    console.error('Error loading project data:', error);
    showAlert('error', 'Error loading project data. Please try again.');
  }
}

// Handle creating a new project
function handleCreateProject() {
  const name = elements.projectName.value.trim();
  const id = elements.projectId.value.trim();
  
  if (!name || !id) {
    showAlert('error', 'Please fill in all fields.');
    return;
  }
  
  // Check if project ID already exists
  if (state.projects.some(p => p.id === id)) {
    showAlert('error', 'Project ID already exists. Please choose a different ID.');
    return;
  }
  
  // Create new project
  const project = {
    id,
    name,
    status: 'CREATED',
    createdAt: new Date().toISOString()
  };
  
  // Add to projects list
  state.projects.push(project);
  
  // Save projects
  saveProjects();
  
  // Set as current project
  setCurrentProject(project);
  
  // Close modal
  elements.newProjectModal.hide();
  
  // Reset form
  elements.newProjectForm.reset();
  
  // Show dashboard
  showView(elements.dashboardView);
  
  showAlert('success', 'Project created successfully!');
}

// Load more functions in utils.js
loadUtilityFunctions();

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Handle start discovery
async function handleStartDiscovery(event) {
  event.preventDefault();
  
  if (!state.currentProject) {
    showToast('Error', 'Please select or create a project first', 'danger');
    return;
  }
  
  const agentIdsValue = elements.agentIds.value.trim();
  
  // Disable the button and show loading
  elements.btnStartDiscovery.disabled = true;
  elements.btnStartDiscovery.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
  
  try {
    // Prepare the request
    const url = CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.START_DISCOVERY;
    const data = {
      projectId: state.currentProject.id,
      agentIds: agentIdsValue.split(',').map(id => id.trim()).filter(id => id)
    };
    
    // Call the API using our enhanced fetch
    const response = await fetchWithErrorHandling(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (response.success) {
      // Update project status
      state.currentProject.status = 'DISCOVERY_STARTED';
      saveProjects();
      updateProjectStatus();
      
      // Show success message
      showToast('Success', 'Discovery process initiated successfully', 'success');
    } else {
      throw new Error(response.message || 'Failed to start discovery');
    }
  } catch (error) {
    // Error is already logged and displayed by fetchWithErrorHandling
    console.error('Discovery error:', error);
  } finally {
    // Re-enable the button
    elements.btnStartDiscovery.disabled = false;
    elements.btnStartDiscovery.textContent = 'Start Discovery';
  }
}

// Handle run analysis
async function handleRunAnalysis() {
  if (!state.currentProject) {
    showToast('Error', 'Please select or create a project first', 'danger');
    return;
  }
  
  // Disable the button and show loading
  elements.btnRunAnalysis.disabled = true;
  elements.btnRunAnalysis.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
  
  try {
    // Prepare the request
    const url = CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.GET_ANALYSIS.replace(':projectId', state.currentProject.id);
    
    // Call the API using our enhanced fetch
    const response = await fetchWithErrorHandling(url);
    
    if (response.success) {
      // Update state with the results
      state.servers = response.servers || [];
      state.recommendations = response.recommendations || {};
      
      // Update project status
      state.currentProject.status = 'ANALYSIS_COMPLETED';
      saveProjects();
      updateProjectStatus();
      
      // Update the UI
      updateAnalysisUI();
      
      // Show success message
      showToast('Success', 'Analysis completed successfully', 'success');
    } else {
      throw new Error(response.message || 'Failed to run analysis');
    }
  } catch (error) {
    // Error is already logged and displayed by fetchWithErrorHandling
    console.error('Analysis error:', error);
  } finally {
    // Re-enable the button
    elements.btnRunAnalysis.disabled = false;
    elements.btnRunAnalysis.textContent = 'Run Analysis';
  }
}

// Handle run cost estimation
async function handleRunCostEstimation() {
  if (!state.currentProject) {
    showToast('Error', 'Please select or create a project first', 'danger');
    return;
  }
  
  if (state.servers.length === 0) {
    showToast('Error', 'Please run analysis first to get server recommendations', 'warning');
    return;
  }
  
  // Disable the button and show loading
  elements.btnRunCostEstimation.disabled = true;
  elements.btnRunCostEstimation.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Estimating...';
  
  try {
    // Prepare the request
    const url = CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.GET_COSTS.replace(':projectId', state.currentProject.id);
    
    // Call the API using our enhanced fetch
    const response = await fetchWithErrorHandling(url);
    
    if (response.success) {
      // Update state with the results
      state.costEstimates = response.detailed_costs || [];
      
      // Update project status
      state.currentProject.status = 'COST_ESTIMATION_COMPLETED';
      saveProjects();
      updateProjectStatus();
      
      // Update the UI
      updateCostsUI(response);
      
      // Show success message
      showToast('Success', 'Cost estimation completed successfully', 'success');
    } else {
      throw new Error(response.message || 'Failed to run cost estimation');
    }
  } catch (error) {
    // Error is already logged and displayed by fetchWithErrorHandling
    console.error('Cost estimation error:', error);
  } finally {
    // Re-enable the button
    elements.btnRunCostEstimation.disabled = false;
    elements.btnRunCostEstimation.textContent = 'Run Cost Estimation';
  }
}

// Handle generate roadmap
async function handleGenerateRoadmap() {
  if (!state.currentProject) {
    showToast('Error', 'Please select or create a project first', 'danger');
    return;
  }
  
  if (state.servers.length === 0) {
    showToast('Error', 'Please run analysis first to get server recommendations', 'warning');
    return;
  }
  
  // Disable the button and show loading
  elements.btnGenerateRoadmap.disabled = true;
  elements.btnGenerateRoadmap.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
  
  try {
    // Prepare the request
    const url = CONFIG.API.BASE_URL + CONFIG.API.ENDPOINTS.GET_ROADMAP.replace(':projectId', state.currentProject.id);
    
    // Call the API using our enhanced fetch
    const response = await fetchWithErrorHandling(url);
    
    if (response.success) {
      // Update state with the results
      state.roadmap = response;
      
      // Update project status
      state.currentProject.status = 'ROADMAP_GENERATED';
      saveProjects();
      updateProjectStatus();
      
      // Update the UI
      updateRoadmapUI();
      
      // Show success message
      showToast('Success', 'Migration roadmap generated successfully', 'success');
    } else {
      throw new Error(response.message || 'Failed to generate roadmap');
    }
  } catch (error) {
    // Error is already logged and displayed by fetchWithErrorHandling
    console.error('Roadmap generation error:', error);
  } finally {
    // Re-enable the button
    elements.btnGenerateRoadmap.disabled = false;
    elements.btnGenerateRoadmap.textContent = 'Generate Roadmap';
  }
}

// Add these functions at the beginning of the file
document.addEventListener('DOMContentLoaded', function() {
  // Initialize app
  initApp();

  // Register event listeners
  registerEventListeners();

  // Initialize UI
  initUI();
});

// Register all event listeners
function registerEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', handleNavigation);
  });

  // Project selection
  document.getElementById('project-select').addEventListener('change', handleProjectSelect);
  document.getElementById('btn-new-project').addEventListener('click', showNewProjectModal);
  document.getElementById('btn-create-project').addEventListener('click', createNewProject);

  // Dashboard feature links
  document.getElementById('feature-discovery-btn').addEventListener('click', () => {
    document.getElementById('nav-discovery').click();
  });
  document.getElementById('feature-analysis-btn').addEventListener('click', () => {
    document.getElementById('nav-analysis').click();
  });
  document.getElementById('feature-roadmap-btn').addEventListener('click', () => {
    document.getElementById('nav-roadmap').click();
  });
  document.getElementById('dashboard-get-started').addEventListener('click', () => {
    document.getElementById('btn-new-project').click();
  });

  // Discovery
  document.getElementById('discovery-form').addEventListener('submit', startDiscovery);
  
  // Analysis
  document.getElementById('btn-run-analysis').addEventListener('click', runAnalysis);
  document.getElementById('recommendations-table').addEventListener('click', handleRecommendationClick);
  
  // Costs
  document.getElementById('btn-run-cost-estimation').addEventListener('click', runCostEstimation);
  
  // Roadmap
  document.getElementById('btn-generate-roadmap').addEventListener('click', generateRoadmap);
}

// Update dashboard statistics
function updateDashboardStats() {
  const currentProject = getCurrentProject();
  
  if (currentProject) {
    // Get stored data from localStorage or generate mock data
    let stats = JSON.parse(localStorage.getItem(`migration-stats-${currentProject.id}`)) || generateMockStats();
    
    // Update UI with values
    document.getElementById('total-servers-stats').textContent = stats.totalServers;
    document.getElementById('migrated-servers-stats').textContent = stats.migratedServers;
    document.getElementById('monthly-cost-stats').textContent = formatCurrency(stats.monthlyCost);
    document.getElementById('completion-stats').textContent = stats.completionRate + '%';
    
    // Update progress bar
    const progressBar = document.getElementById('migration-progress-bar');
    progressBar.style.width = stats.completionRate + '%';
    progressBar.setAttribute('aria-valuenow', stats.completionRate);
    
    // Animate the stats
    animateValue(document.getElementById('total-servers-stats'), 0, stats.totalServers, 1500);
    animateValue(document.getElementById('migrated-servers-stats'), 0, stats.migratedServers, 1500);
    animateValue(document.getElementById('completion-stats'), 0, stats.completionRate, 1500);
  } else {
    // If no project is selected, show zeros
    document.getElementById('total-servers-stats').textContent = '0';
    document.getElementById('migrated-servers-stats').textContent = '0';
    document.getElementById('monthly-cost-stats').textContent = '$0';
    document.getElementById('completion-stats').textContent = '0%';
    
    // Reset progress bar
    const progressBar = document.getElementById('migration-progress-bar');
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', 0);
  }
}

// Generate mock statistics for a project
function generateMockStats() {
  const totalServers = Math.floor(Math.random() * 20) + 5;
  const migratedServers = Math.floor(Math.random() * totalServers);
  const completionRate = Math.floor((migratedServers / totalServers) * 100);
  const monthlyCost = Math.floor(Math.random() * 5000) + 1000;
  
  return {
    totalServers,
    migratedServers,
    completionRate, 
    monthlyCost
  };
}

// Initialize UI elements
function initUI() {
  // Show active view
  const activeNavLink = document.querySelector('.nav-link.active');
  if (activeNavLink) {
    const targetViewId = activeNavLink.id.replace('nav-', '') + '-view';
    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.remove('active');
    });
    document.getElementById(targetViewId)?.classList.add('active');
  }
  
  // Initialize animations for dashboard
  if (document.getElementById('dashboard-view').classList.contains('active')) {
    animateElements('.feature-card', 'animate-fade-in', 200);
    animateElements('.stats-card', 'animate-slide-up', 100);
  }
}

// Handle navigation between views
function handleNavigation(event) {
  event.preventDefault();
  
  // Update active navigation link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  this.classList.add('active');
  
  // Show the corresponding view
  const targetViewId = this.id.replace('nav-', '') + '-view';
  document.querySelectorAll('.content-view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(targetViewId).classList.add('active');
  
  // Initialize animations for the active view
  if (targetViewId === 'dashboard-view') {
    animateElements('.feature-card', 'animate-fade-in', 200);
    animateElements('.stats-card', 'animate-slide-up', 100);
  }
}

// Handle project selection
function handleProjectSelect() {
  const projectId = this.value;
  if (projectId) {
    // Load the selected project
    const project = getProjectById(projectId);
    if (project) {
      setCurrentProject(project);
      updateProjectStatus(project);
      updateDashboardStats();
      showNotification(`Project "${project.name}" loaded successfully`, 'success');
    }
  } else {
    // No project selected
    removeCurrentProject();
    updateProjectStatus();
    updateDashboardStats();
  }
}

// Show new project modal
function showNewProjectModal() {
  // Clear form fields
  document.getElementById('project-name').value = '';
  document.getElementById('project-id').value = '';
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('new-project-modal'));
  modal.show();
}

// Create a new project
function createNewProject() {
  const projectName = document.getElementById('project-name').value.trim();
  const projectId = document.getElementById('project-id').value.trim();
  
  if (!projectName || !projectId) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  if (!/^[a-z0-9-]+$/.test(projectId)) {
    showNotification('Project ID can only contain lowercase letters, numbers, and hyphens', 'error');
    return;
  }
  
  // Check if project ID already exists
  if (getProjectById(projectId)) {
    showNotification('Project ID already exists. Please choose a different one.', 'error');
    return;
  }
  
  // Create project object
  const project = {
    id: projectId,
    name: projectName,
    status: CONFIG.STATUS.CREATED,
    createdAt: new Date().toISOString()
  };
  
  // Save project
  saveProject(project);
  
  // Set as current project
  setCurrentProject(project);
  
  // Update UI
  loadProjects();
  updateProjectStatus(project);
  
  // Close modal
  bootstrap.Modal.getInstance(document.getElementById('new-project-modal')).hide();
  
  // Show success notification
  showNotification(`Project "${projectName}" created successfully`, 'success');
  
  // Generate mock stats for the new project
  const stats = generateMockStats();
  localStorage.setItem(`migration-stats-${projectId}`, JSON.stringify(stats));
  
  // Update dashboard stats
  updateDashboardStats();
}

// Start discovery process
function startDiscovery(event) {
  event.preventDefault();
  
  const currentProject = getCurrentProject();
  if (!currentProject) {
    showNotification('Please select a project first', 'error');
    return;
  }
  
  const agentIds = document.getElementById('agent-ids').value.trim();
  if (!agentIds) {
    showNotification('Please enter at least one Agent ID', 'error');
    return;
  }
  
  // Show progress indicator
  const progressElement = document.getElementById('discovery-progress');
  progressElement.classList.remove('d-none');
  
  // Simulate discovery process
  let progress = 0;
  const progressBar = document.getElementById('discovery-progress-bar');
  const statusText = document.getElementById('discovery-status');
  
  const interval = setInterval(() => {
    progress += 5;
    progressBar.style.width = progress + '%';
    progressBar.setAttribute('aria-valuenow', progress);
    
    if (progress < 30) {
      statusText.textContent = 'Connecting to discovery agents...';
    } else if (progress < 60) {
      statusText.textContent = 'Collecting infrastructure data...';
    } else if (progress < 90) {
      statusText.textContent = 'Processing collected data...';
    } else {
      statusText.textContent = 'Finalizing discovery...';
    }
    
    if (progress >= 100) {
      clearInterval(interval);
      
      // Update project status
      currentProject.status = CONFIG.STATUS.DISCOVERY_PROCESSED;
      saveProject(currentProject);
      updateProjectStatus(currentProject);
      
      // Show success notification
      showNotification('Discovery completed successfully', 'success');
      
      // Update dashboard stats
      updateDashboardStats();
      
      // Hide progress after a delay
      setTimeout(() => {
        progressElement.classList.add('d-none');
      }, 2000);
    }
  }, 200);
}

// Run analysis on the current project
function runAnalysis() {
  const currentProject = getCurrentProject();
  if (!currentProject) {
    showNotification('Please select a project first', 'error');
    return;
  }
  
  if (currentProject.status.text === CONFIG.STATUS.CREATED.text) {
    showNotification('Please run discovery first', 'warning');
    document.getElementById('nav-discovery').click();
    return;
  }
  
  // Show loading indicator
  document.getElementById('btn-run-analysis').disabled = true;
  document.getElementById('btn-run-analysis').innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Running...';
  
  // Simulate API call
  setTimeout(() => {
    // Get or generate analysis data
    const analysisData = getAnalysisData(currentProject.id);
    
    // Update UI
    updateAnalysisUI(analysisData);
    
    // Update project status
    currentProject.status = CONFIG.STATUS.ANALYSIS_COMPLETED;
    saveProject(currentProject);
    updateProjectStatus(currentProject);
    
    // Reset button
    document.getElementById('btn-run-analysis').disabled = false;
    document.getElementById('btn-run-analysis').innerHTML = '<i class="bi bi-arrow-repeat"></i> Run Analysis';
    
    // Show success notification
    showNotification('Analysis completed successfully', 'success');
  }, 2000);
}

// Run cost estimation for the current project
function runCostEstimation() {
  const currentProject = getCurrentProject();
  if (!currentProject) {
    showNotification('Please select a project first', 'error');
    return;
  }
  
  if (currentProject.status.text === CONFIG.STATUS.CREATED.text || 
      currentProject.status.text === CONFIG.STATUS.DISCOVERY_STARTED.text) {
    showNotification('Please run analysis first', 'warning');
    document.getElementById('nav-analysis').click();
    return;
  }
  
  // Show loading indicator
  document.getElementById('btn-run-cost-estimation').disabled = true;
  document.getElementById('btn-run-cost-estimation').innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Running...';
  
  // Simulate API call
  setTimeout(() => {
    // Get or generate cost data
    const costData = getCostData(currentProject.id);
    
    // Update UI
    updateCostsUI(costData);
    
    // Create cost breakdown chart
    createCostBreakdownChart(costData);
    
    // Update project status
    currentProject.status = CONFIG.STATUS.COST_ESTIMATION_COMPLETED;
    saveProject(currentProject);
    updateProjectStatus(currentProject);
    
    // Reset button
    document.getElementById('btn-run-cost-estimation').disabled = false;
    document.getElementById('btn-run-cost-estimation').innerHTML = '<i class="bi bi-arrow-repeat"></i> Run Cost Estimation';
    
    // Show success notification
    showNotification('Cost estimation completed successfully', 'success');
  }, 2000);
}

// Create cost breakdown chart
function createCostBreakdownChart(costData) {
  const ctx = document.getElementById('cost-breakdown-chart').getContext('2d');
  
  // Destroy previous chart if it exists
  if (window.costBreakdownChart) {
    window.costBreakdownChart.destroy();
  }
  
  // Prepare data
  const strategies = Object.keys(costData.strategyCosts);
  const costs = Object.values(costData.strategyCosts);
  
  // Create chart
  window.costBreakdownChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: strategies,
      datasets: [{
        label: 'Monthly Cost ($)',
        data: costs,
        backgroundColor: CONFIG.CHART_COLORS.background,
        borderColor: CONFIG.CHART_COLORS.border,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
}

// Generate roadmap for the current project
function generateRoadmap() {
  const currentProject = getCurrentProject();
  if (!currentProject) {
    showNotification('Please select a project first', 'error');
    return;
  }
  
  if (currentProject.status.text === CONFIG.STATUS.CREATED.text || 
      currentProject.status.text === CONFIG.STATUS.DISCOVERY_STARTED.text) {
    showNotification('Please run analysis first', 'warning');
    document.getElementById('nav-analysis').click();
    return;
  }
  
  // Show loading indicator
  document.getElementById('btn-generate-roadmap').disabled = true;
  document.getElementById('btn-generate-roadmap').innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Generating...';
  
  // Simulate API call
  setTimeout(() => {
    // Get or generate roadmap data
    const roadmapData = getRoadmapData(currentProject.id);
    
    // Update UI
    updateRoadmapUI(roadmapData);
    
    // Update project status
    currentProject.status = CONFIG.STATUS.ROADMAP_GENERATED;
    saveProject(currentProject);
    updateProjectStatus(currentProject);
    
    // Reset button
    document.getElementById('btn-generate-roadmap').disabled = false;
    document.getElementById('btn-generate-roadmap').innerHTML = '<i class="bi bi-arrow-repeat"></i> Generate Roadmap';
    
    // Show success notification
    showNotification('Roadmap generated successfully', 'success');
  }, 2000);
}

// Handle clicking on a recommendation in the table
function handleRecommendationClick(event) {
  const button = event.target.closest('.btn-view-details');
  if (button) {
    const serverId = button.dataset.serverId;
    showServerDetails(serverId);
  }
}

// Show server details modal
function showServerDetails(serverId) {
  const currentProject = getCurrentProject();
  if (!currentProject) return;
  
  // Get server data
  const analysisData = getAnalysisData(currentProject.id);
  const server = analysisData.servers.find(s => s.id === serverId);
  
  if (!server) {
    showNotification('Server details not found', 'error');
    return;
  }
  
  // Populate modal content
  const content = document.getElementById('server-details-content');
  content.innerHTML = `
    <div class="server-details-section">
      <h6>Server Information</h6>
      <div class="detail-item">
        <div class="detail-label">Name:</div>
        <div class="detail-value">${server.name}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Operating System:</div>
        <div class="detail-value">${server.specs.os}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">CPU:</div>
        <div class="detail-value">${server.specs.cpu}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Memory:</div>
        <div class="detail-value">${server.specs.memory}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Storage:</div>
        <div class="detail-value">${server.specs.storage}</div>
      </div>
    </div>
    
    <div class="server-details-section">
      <h6>Migration Recommendation</h6>
      <div class="detail-item">
        <div class="detail-label">Strategy:</div>
        <div class="detail-value">
          <span class="strategy-tag ${CONFIG.STRATEGIES[server.recommendation.strategy].class}">
            ${server.recommendation.strategy}
          </span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Target Service:</div>
        <div class="detail-value">
          <span class="service-tag">${server.recommendation.targetService}</span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Reasoning:</div>
        <div class="detail-value">${server.recommendation.reasoning}</div>
      </div>
    </div>
    
    <div class="server-details-section">
      <h6>Estimated Costs</h6>
      <div class="detail-item">
        <div class="detail-label">Monthly Cost:</div>
        <div class="detail-value">${formatCurrency(server.costs.monthly)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Yearly Cost:</div>
        <div class="detail-value">${formatCurrency(server.costs.yearly)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Upfront Migration Cost:</div>
        <div class="detail-value">${formatCurrency(server.costs.upfront)}</div>
      </div>
    </div>
  `;
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('server-details-modal'));
  modal.show();
}

// Format currency values
function formatCurrency(value) {
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// Update project status in UI
function updateProjectStatus(project) {
  const statusElement = document.getElementById('project-status');
  
  if (project) {
    statusElement.innerHTML = `<span class="badge bg-${project.status.color}">${project.status.text}</span>`;
  } else {
    statusElement.innerHTML = `<span class="badge bg-secondary">No Project Selected</span>`;
  }
}

// Load projects from local storage and populate select dropdown
function loadProjects() {
  // Get projects from localStorage
  const projects = getProjects();
  
  // Get select element
  const select = document.getElementById('project-select');
  
  // Clear options (except the first one)
  while (select.options.length > 1) {
    select.remove(1);
  }
  
  // Add project options
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    select.appendChild(option);
  });
}

// Load current project
function loadCurrentProject() {
  const currentProject = getCurrentProject();
  
  if (currentProject) {
    // Select the current project in the dropdown
    const select = document.getElementById('project-select');
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === currentProject.id) {
        select.selectedIndex = i;
        break;
      }
    }
    
    // Update UI
    updateProjectStatus(currentProject);
  }
}

// Get projects from local storage
function getProjects() {
  const projectsJson = localStorage.getItem(CONFIG.STORAGE.PROJECTS);
  return projectsJson ? JSON.parse(projectsJson) : [];
}

// Get project by ID
function getProjectById(id) {
  const projects = getProjects();
  return projects.find(project => project.id === id);
}

// Save project to local storage
function saveProject(project) {
  const projects = getProjects();
  
  // Update if project exists, otherwise add new
  const index = projects.findIndex(p => p.id === project.id);
  if (index !== -1) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  
  // Save to localStorage
  localStorage.setItem(CONFIG.STORAGE.PROJECTS, JSON.stringify(projects));
}

// Get current project from local storage
function getCurrentProject() {
  const projectId = localStorage.getItem(CONFIG.STORAGE.CURRENT_PROJECT);
  return projectId ? getProjectById(projectId) : null;
}

// Set current project in local storage
function setCurrentProject(project) {
  localStorage.setItem(CONFIG.STORAGE.CURRENT_PROJECT, project.id);
}

// Remove current project selection
function removeCurrentProject() {
  localStorage.removeItem(CONFIG.STORAGE.CURRENT_PROJECT);
}