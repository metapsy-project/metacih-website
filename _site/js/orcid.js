const orcidId = '0000-0002-4934-4352'; // Updated ORCID ID
const apiUrl = `https://pub.orcid.org/v3.0/${orcidId}/works`;
const publicationsPerPage = 3; // Number of publications to show per page
let allPublications = []; // To store all fetched publications
let currentPage = 1; // Current page

async function fetchPublications() {
  try {
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    allPublications = data['group'];
    displayPublications();
    setupPagination();
  } catch (error) {
    console.error('Error fetching publications:', error);
    document.getElementById('publications').innerHTML = '<p>Failed to load publications.</p>';
  }
}

function displayPublications() {
  const publicationsDiv = document.getElementById('publications');
  publicationsDiv.innerHTML = ''; // Clear existing content
  
  const start = (currentPage - 1) * publicationsPerPage;
  const end = start + publicationsPerPage;
  const pagePublications = allPublications.slice(start, end); // Get publications for the current page

  pagePublications.forEach(group => {
    const work = group['work-summary'][0]; // Get the first work summary from the group
    const title = work['title'] ? work['title']['title'].value : 'No title available';
    const year = work['publication-date'] ? work['publication-date'].year.value : 'No year available';
    const journal = work['journal-title'] ? work['journal-title'].value : 'No journal';
    const link = work['external-ids']['external-id'][0] 
                 ? work['external-ids']['external-id'][0]['external-id-url'].value 
                 : '#';
    const authors = work['contributors'] && work['contributors']['contributor'] 
                    ? work['contributors']['contributor'].map(contributor => contributor['credit-name'].value).join(', ')
                    : 'No authors available';

    const publicationHtml = `
      <div class="publication">
        <a href="${link}" target="_blank" class="title">${title}</a>
        <div class="year">Year: ${year}</div>
        <div class="journal">Journal: ${journal}</div>
      </div>
    `;
    
    publicationsDiv.innerHTML += publicationHtml;
  });
}

function setupPagination() {
  const paginationDiv = document.getElementById('pagination');
  paginationDiv.innerHTML = ''; // Clear existing pagination
  
  const totalPages = Math.ceil(allPublications.length / publicationsPerPage);

  // Previous button
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.innerText = 'Previous';
    prevButton.onclick = () => {
      currentPage--;
      displayPublications();
      setupPagination();
    };
    paginationDiv.appendChild(prevButton);
  }

  // Page number buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement('button');
    pageButton.innerText = i;
    pageButton.disabled = i === currentPage; // Disable the current page button
    pageButton.onclick = () => {
      currentPage = i;
      displayPublications();
      setupPagination();
    };
    paginationDiv.appendChild(pageButton);
  }

  // Next button
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.innerText = 'Next';
    nextButton.onclick = () => {
      currentPage++;
      displayPublications();
      setupPagination();
    };
    paginationDiv.appendChild(nextButton);
  }
}

// Fetch and display publications when the page loads
fetchPublications();