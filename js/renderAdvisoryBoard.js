// Function to populate the template and add it to #teamDiv
function populateTeam(data) {
    const teamDiv = document.getElementById('teamDiv');
    let htmlContent = '';

    data.forEach(person => {
      const personHTML = `
        <div class="col h-100 mb-3">
          <div class="bg-blue-fade" style="padding: 0rem; min-height: 338px;">
            <div class="mb-3">
              <img src="${person.image}" alt="${person.name}" style="width: 100%; border: 0.5px solid var(--dgps-boreal); background-color: var(--dgps-sand-fade);" class="no-select">
            </div>
            <p class="lead mb-0 signika fw-semibold boreal" style="line-height: 1.5;"><a href="${person.url}">${person.name}</a></p>
            <p class="mb-0" style="font-size: 12px;">${person.affiliation}</p>
          </div>
        </div>
      `;
      htmlContent += personHTML;
    });

    // Set the innerHTML of #teamDiv
    teamDiv.innerHTML = htmlContent;
};

// Fetch the JSON file and populate the team
fetch('/assets/advisory-board/advisory-board.json')
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
})
.then(data => populateTeam(data))
.catch(error => console.error('Error loading JSON:', error));



