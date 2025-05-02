/**
 * Theme management utilities for the Cloud Migration Strategy Planner
 */

// Function to set the theme (light or dark)
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Update toggle state
  updateToggleState(theme);
}

// Function to update toggle button state
function updateToggleState(theme) {
  const toggles = document.querySelectorAll('.dark-mode-toggle');
  
  toggles.forEach(toggle => {
    const moonIcon = toggle.querySelector('.moon-icon');
    const sunIcon = toggle.querySelector('.sun-icon');
    
    if (theme === 'dark') {
      moonIcon?.classList.add('d-none');
      sunIcon?.classList.remove('d-none');
      toggle.setAttribute('title', 'Switch to Light Mode');
    } else {
      moonIcon?.classList.remove('d-none');
      sunIcon?.classList.add('d-none');
      toggle.setAttribute('title', 'Switch to Dark Mode');
    }
  });
}

// Function to toggle between light and dark modes
function toggleTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

// Initialize theme based on user preference or system preference
function initTheme() {
  // Check if user has previously set a theme preference
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    // Use saved theme
    setTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Use system preference if available
    setTheme('dark');
  } else {
    // Default to light mode
    setTheme('light');
  }
  
  // Add event listeners to all toggle buttons
  document.querySelectorAll('.dark-mode-toggle').forEach(toggle => {
    toggle.addEventListener('click', toggleTheme);
  });
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', initTheme); 