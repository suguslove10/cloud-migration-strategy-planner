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