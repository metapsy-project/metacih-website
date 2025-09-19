collapseRegistration = function(id) {
  var el = document.getElementById(id);
  var registrationCard = el.querySelector('.registration-card');
  var btn = el.querySelector('.registration-toggle-btn');
  var btnText = btn.querySelector('.btn-text');
  var btnIcon = btn.querySelector('.btn-icon');
  var collapseText = el.querySelector('.collapseText');

  if (collapseText.classList.contains('el-hidden')) {
    collapseText.classList.remove('el-hidden');
    collapseText.classList.add('el-visible');
    btnText.textContent = 'Show Less Details';
    btnIcon.className = 'fa-solid fa-chevron-up ms-2 btn-icon';
    btn.classList.remove('btn-outline-primary');
    btn.classList.add('btn-primary');
    // Add smooth scroll to the expanded content
    setTimeout(() => {
      collapseText.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  } else {
    collapseText.classList.add('el-hidden');
    collapseText.classList.remove('el-visible');
    btnText.textContent = 'Show More Details';
    btnIcon.className = 'fa-solid fa-chevron-down ms-2 btn-icon';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline-primary');
  }
} 


// Global variables for search and filter
let allRegistrations = [];
let filteredRegistrations = [];

// Function to highlight search terms in text
function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return text;
  }
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// Function to create registration HTML
function createRegistrationHTML(registration, searchTerm = '') {
  const statusClass = registration.status.toLowerCase().replace(/\s+/g, '-');
  const highlightedTitle = highlightSearchTerm(registration.title, searchTerm);
  const highlightedAuthors = highlightSearchTerm(registration.authors, searchTerm);
  const highlightedSummary = highlightSearchTerm(registration.summary, searchTerm);
  const highlightedExternalId = highlightSearchTerm(registration.externalId, searchTerm);
  
  return `
    <div class="container" style="position: relative; max-width: 1000px;">
      <div id="${registration.id}" class="row">
        <div class="col border-boreal my-3 fade-in-super-short registration-card"
            style="padding: 2rem; position: relative; z-index: 2; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease;">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div class="flex-grow-1">
                <h2 class="fw-semibold mb-2 signika no-select registration-title" style="font-size: 1.5rem; line-height: 1.3; color: var(--dgps-boreal-dark);">${highlightedTitle}</h2>
                <p class="text-muted mb-3 registration-authors" style="font-size: 0.95rem; line-height: 1.4;">${highlightedAuthors}</p>
              </div>
              <div class="ms-3">
                <span class="badge status-badge status-${statusClass} px-3 py-2" style="font-size: 0.8rem; font-weight: 500;">
                  <i class="fa-solid fa-circle me-1" style="font-size: 0.6rem;"></i>${registration.status}
                </span>
              </div>
            </div>
            
            <div class="d-flex align-items-center mb-3">
              <div class="feature-sm bg-boreal-fade bg-gradient text-white me-2" style="border-radius: 6px;">
                <i class="fa-solid fa-fingerprint boreal"></i>
              </div>
              <a href="${registration.link}" target="_blank" class="registration-link text-decoration-none fw-semibold" 
                 style="color: var(--dgps-boreal); font-size: 0.9rem;">
                ${highlightedExternalId} <i class="fa-solid fa-external-link-alt ms-1" style="font-size: 0.7rem;"></i>
              </a>
            </div>

            <div class="collapseText mt-4 el-hidden fade-in-super-short registration-summary" 
                 style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; padding: 1.5rem; border-left: 4px solid var(--dgps-boreal);">
              <h5 class="signika mb-3" style="color: var(--dgps-boreal-dark); font-size: 1.1rem;">
                <i class="fa-solid fa-file-text me-2"></i>Project Summary
              </h5>
              <p class="mb-0 registration-summary-text" style="line-height: 1.6; color: #495057;">${highlightedSummary}</p>
            </div>

            <div class="text-center mt-3">
              <button class="btn btn-outline-primary btn-sm registration-toggle-btn" 
                      onclick="collapseRegistration('${registration.id}')" 
                      style="border-radius: 20px; padding: 0.5rem 1.5rem; font-weight: 500; transition: all 0.3s ease;">
                <span class="btn-text">Show More Details</span> 
                <i class="fa-solid fa-chevron-down ms-2 btn-icon"></i>
              </button>
            </div>
          </div>
      </div>
    </div>
    `;
}

// Debounce function to limit search frequency
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Function to filter registrations
function filterRegistrations() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value.toLowerCase();
  
  filteredRegistrations = allRegistrations.filter(registration => {
    const matchesSearch = !searchTerm || 
      registration.title.toLowerCase().includes(searchTerm) ||
      registration.authors.toLowerCase().includes(searchTerm) ||
      registration.externalId.toLowerCase().includes(searchTerm) ||
      registration.summary.toLowerCase().includes(searchTerm);
    
    const matchesStatus = !statusFilter || 
      registration.status.toLowerCase().replace(/\s+/g, '-') === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  displayRegistrations();
  updateResultCount();
  toggleClearButton();
}

// Create debounced version of filterRegistrations
const debouncedFilterRegistrations = debounce(filterRegistrations, 300);

// Function to display filtered registrations
function displayRegistrations() {
  const registrationDiv = document.getElementById('registrations');
  const searchTerm = document.getElementById('searchInput').value;
  let htmlContent = '';
  
  if (filteredRegistrations.length === 0) {
    htmlContent = `
      <div class="container" style="position: relative; max-width: 1000px;">
        <div class="row">
          <div class="col text-center py-5">
            <i class="fa-solid fa-search text-muted mb-3" style="font-size: 3rem;"></i>
            <h4 class="text-muted">No registrations found</h4>
            <p class="text-muted">Try adjusting your search terms or filters</p>
          </div>
        </div>
      </div>
    `;
  } else {
    filteredRegistrations.forEach(registration => {
      htmlContent += createRegistrationHTML(registration, searchTerm);
    });
  }
  
  registrationDiv.innerHTML = htmlContent;
}

// Function to update result count
function updateResultCount() {
  const resultCount = document.getElementById('resultCount');
  const total = allRegistrations.length;
  const filtered = filteredRegistrations.length;
  
  if (filtered === total) {
    resultCount.textContent = `Showing all ${total} registration${total !== 1 ? 's' : ''}`;
  } else {
    resultCount.textContent = `Showing ${filtered} of ${total} registration${total !== 1 ? 's' : ''}`;
  }
}

// Function to toggle clear button visibility
function toggleClearButton() {
  const clearButton = document.getElementById('clearFilters');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  
  if (searchInput.value || statusFilter.value) {
    clearButton.style.display = 'block';
  } else {
    clearButton.style.display = 'none';
  }
}

// Function to clear all filters
function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = '';
  filterRegistrations();
}

// Function to populate the template and add it to #registrations
function populateRegistrations(data) {
  allRegistrations = data;
  filteredRegistrations = [...data];
  displayRegistrations();
  updateResultCount();
  
  // Add event listeners
  document.getElementById('searchInput').addEventListener('input', debouncedFilterRegistrations);
  document.getElementById('statusFilter').addEventListener('change', filterRegistrations);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
};

// Fetch the JSON file and populate the team
fetch('/assets/registrations/registrations.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => populateRegistrations(data))
  .catch(error => console.error('Error loading JSON:', error));



