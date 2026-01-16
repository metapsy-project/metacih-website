// Function to populate the template and add it to #databases
function populateDatabases(data) {
  const databasesDiv = document.getElementById("databases");
  let htmlContent = "";

  data.forEach((database) => {
    const databaseHTML = `
    <div class="container" style="position: relative; max-width: 1000px;">
    <div id="${database.id}" class="row">
    <div class="col border-boreal my-1 fade-in-super-short mt-3"
        style="padding: 2rem; position: relative; z-index: 2;">
        <div class="row">
            <div class="col-lg-3">
                <img src="${database.image}" alt="Description" class="square-img no-select">
                <a class="btn btn-primary px-4 no-underline btn-start" href="${database.link}">Start
                    Analyzing&nbsp;&nbsp;<i class="fa-solid fa-arrow-right-long"></i></a>
            </div>
            <div class="col">
                <div class="text-center text-xl-start">
                    <h2 class="fw-semibold mb-2 signika no-select" style="font-size: 1.75rem;">
                        ${database.title}
                    </h2>
                    <p class="text-muted" style="max-width: 750px;">${database.subtitle}</p>
                    ${database.hasDisclaimer ? `<div style="background:#d1e7dd;border:1px solid #0f5132;border-radius:4px;padding:10px 15px;margin:10px 0 15px;display:flex;align-items:center;gap:10px;font-size:0.875rem;color:#0f5132;"><i class="fa-solid fa-circle-info" style="font-size:1rem;flex-shrink:0;"></i><span>${database.disclaimerText || 'This database serves as a template database.'}</span></div>` : ''}
                    <hr>
                    <div class="collapseText">
                      ${database.description}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</div>
      `;
    htmlContent += databaseHTML;
  });

  // Set the innerHTML of #teamDiv
  databasesDiv.innerHTML = htmlContent;
}

// Fetch the JSON file and populate the team
fetch("/assets/databases/databases.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => populateDatabases(data))
  .catch((error) => console.error("Error loading JSON:", error));
