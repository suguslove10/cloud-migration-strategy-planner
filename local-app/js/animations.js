/**
 * Animation utilities for the Cloud Migration Strategy Planner
 */

// Function to animate elements with a staggered entrance
function animateElements(selector, animation = 'animate-fade-in', staggerDelay = 100) {
  const elements = document.querySelectorAll(selector);
  
  elements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add(animation);
    }, index * staggerDelay);
  });
}

// Function to create and animate a notification
function showNotification(message, type = 'success', duration = 3000) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type} animate-slide-up`;
  
  // Add icon based on type
  let icon;
  switch(type) {
    case 'success':
      icon = 'bi-check-circle-fill';
      break;
    case 'error':
      icon = 'bi-exclamation-circle-fill';
      break;
    case 'warning':
      icon = 'bi-exclamation-triangle-fill';
      break;
    case 'info':
    default:
      icon = 'bi-info-circle-fill';
  }
  
  // Set content
  notification.innerHTML = `
    <i class="bi ${icon}"></i>
    <span>${message}</span>
    <button class="notification-close"><i class="bi bi-x"></i></button>
  `;
  
  // Add to document
  const container = document.querySelector('.notification-container') || createNotificationContainer();
  container.appendChild(notification);
  
  // Add close button functionality
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    notification.classList.add('animate-fade-out');
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('animate-fade-out');
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);
  
  return notification;
}

// Helper function to create notification container
function createNotificationContainer() {
  const container = document.createElement('div');
  container.className = 'notification-container';
  document.body.appendChild(container);
  return container;
}

// Add smooth scrolling to all anchor links
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Initialize animations on page load
  animateElements('.feature-card', 'animate-fade-in', 200);
  animateElements('.stats-card', 'animate-slide-up', 100);
});

// Function to animate value counting (for statistics)
function animateValue(element, start = 0, end = 100, duration = 1000) {
  if (!element) return;
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    
    if (element.tagName === 'INPUT') {
      element.value = value;
    } else {
      element.textContent = value;
    }
    
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  
  window.requestAnimationFrame(step);
}

// Animate progress bars
function animateProgressBars() {
  const progressBars = document.querySelectorAll('.progress-bar');
  
  progressBars.forEach(bar => {
    const targetWidth = bar.getAttribute('aria-valuenow') + '%';
    
    // Reset to 0 first
    bar.style.width = '0%';
    
    // Animate to target width
    setTimeout(() => {
      bar.style.transition = 'width 1s ease-in-out';
      bar.style.width = targetWidth;
    }, 100);
  });
}

// Observe elements and trigger animations when they come into view
function initIntersectionObserver() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        // Apply animations based on data attributes
        if (element.dataset.animation) {
          element.classList.add(element.dataset.animation);
        }
        
        // Handle progress bars
        if (element.classList.contains('progress')) {
          const bar = element.querySelector('.progress-bar');
          if (bar) {
            const targetWidth = bar.getAttribute('aria-valuenow') + '%';
            bar.style.transition = 'width 1s ease-in-out';
            bar.style.width = targetWidth;
          }
        }
        
        // Handle counters
        if (element.dataset.countTo) {
          const countTo = parseInt(element.dataset.countTo);
          animateValue(element, 0, countTo, 1500);
        }
        
        // Stop observing after animation
        observer.unobserve(element);
      }
    });
  }, observerOptions);
  
  // Observe elements with animation data attributes
  document.querySelectorAll('[data-animation], .progress, [data-count-to]').forEach(el => {
    observer.observe(el);
  });
}

// Initialize intersection observer on DOM load
document.addEventListener('DOMContentLoaded', initIntersectionObserver); 