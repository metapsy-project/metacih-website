collapseRegistration = function(id) {
  var el = document.getElementById(id);
  var btn = el.firstElementChild?.lastElementChild;
  var collapseText = el.firstElementChild?.firstElementChild?.lastElementChild;

  if (collapseText.classList.contains('el-hidden')) {
    collapseText.classList.remove('el-hidden');
    collapseText.classList.add('el-visible');
    btn.innerHTML = 'Collapse <i class="fa-solid fa-chevron-up"></i>';
  } else {
    collapseText.classList.add('el-hidden');
    collapseText.classList.remove('el-visible');
    btn.innerHTML = 'Show More <i class="fa-solid fa-chevron-down"></i>';
  }
} 


// Function to populate the template and add it to #registrations
function populateRegistrations(data) {
  const registrationDiv = document.getElementById('registrations');
  let htmlContent = '';

  data.forEach(registration => {
    const registrationHTML = `
      <div class="container" style="position: relative; max-width: 1000px;">
      <div id="${registration.id}" class="row">
          <div class="col border-boreal my-1 fade-in-super-short mt-5"
              style="padding: 2rem; position: relative; z-index: 2;">
              <div class="text-center text-xl-start">
                  <h2 class="fw-semibold mb-2 signika no-select" style="font-size: 1.75rem;">${registration.title}
                  </h2>
                  <p class="text-muted" style="max-width: 750px;">${registration.authors}</p>
                  <hr>
                  <div class="feature-sm bg-boreal-fade bg-gradient text-white me-1"><i
                          class="fa-solid fa-fingerprint boreal"></i></div> <span class="fw-normal"><a
                          href="${registration.link}"
                          target="_blank">${registration.externalId}
                          &#8599;</a>&nbsp;&nbsp;</span><b>·</b>&nbsp;&nbsp;<span
                      class="text-muted">${registration.status}</span>
                      <div class="collapseText mt-5 el-hidden fade-in-super-short">
                          <h5 class="signika">Summary</h5>
                          <p class="mb-0">${registration.summary}</p>
                      </div>
              </div>
              <a class="btn btn-primary btn-sm no-underline btn-show-more closed"
                  style="position: absolute; bottom: 0; right: 0;"
                  onclick="collapseRegistration('${registration.id}')">Show More <i
                      class="fa-solid fa-chevron-down"></i></a>
          </div>
      </div>
  </div>
      `;
    htmlContent += registrationHTML;
  });

  // Set the innerHTML of #teamDiv
  registrationDiv.innerHTML = htmlContent;
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



