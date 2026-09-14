let allStudies = [];
let columns = [];
let columnGroups = [];
let yearBounds = { min: null, max: null };
let defaultYearRange = { min: null, max: null };
let yearCounts = {};
let yearHistogramDrag = null;
let hasSearched = false;
let lastHighlightTerms = [];
let lastSearchResults = [];
let lastSearchQuery = "";
let lastSearchYearRange = null;

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wildcardToRegex(term) {
  const escaped = term.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/\*/g, ".*");
  return new RegExp(pattern, "i");
}

function tokenize(query) {
  const tokens = [];
  let i = 0;

  while (i < query.length) {
    if (/\s/.test(query[i])) {
      i += 1;
      continue;
    }

    if (query[i] === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < query.length && depth > 0) {
        if (query[j] === "(") depth += 1;
        if (query[j] === ")") depth -= 1;
        j += 1;
      }

      const content = query.slice(i + 1, j - 1).trim();
      let field = "__all__";
      if (query[j] === "[") {
        const closeBracket = query.indexOf("]", j);
        if (closeBracket !== -1) {
          field = query.slice(j + 1, closeBracket).trim() || "__all__";
          j = closeBracket + 1;
        }
      }

      tokens.push({ type: "GROUP", content, field });
      i = j;
      continue;
    }

    if (query[i] === ")") {
      tokens.push({ type: "RPAREN" });
      i += 1;
      continue;
    }

    const operatorMatch = query.slice(i).match(/^(AND|OR|NOT)\b/i);
    if (operatorMatch) {
      tokens.push({ type: operatorMatch[1].toUpperCase() });
      i += operatorMatch[0].length;
      continue;
    }

    let term = "";
    let depth = 0;
    while (i < query.length) {
      const rest = query.slice(i);
      if (depth === 0 && rest.match(/^(AND|OR|NOT)\b/i)) break;
      if (depth === 0 && query[i] === "(") break;

      if (query[i] === '"') {
        i += 1;
        while (i < query.length && query[i] !== '"') {
          term += query[i];
          i += 1;
        }
        if (i < query.length) i += 1;
        continue;
      }

      if (query[i] === "(") depth += 1;
      if (query[i] === ")") depth -= 1;

      term += query[i];
      i += 1;
    }

    term = term.trim();
    if (term) tokens.push({ type: "TERM", value: term });
  }

  return tokens;
}

function parseExpression(tokens, pos = { index: 0 }) {
  let node = parseNotExpression(tokens, pos);

  while (pos.index < tokens.length && tokens[pos.index]?.type === "AND") {
    pos.index += 1;
    const right = parseNotExpression(tokens, pos);
    node = { type: "AND", left: node, right };
  }

  return node;
}

function parseNotExpression(tokens, pos) {
  let node = parseOrExpression(tokens, pos);

  while (pos.index < tokens.length && tokens[pos.index]?.type === "NOT") {
    pos.index += 1;
    const right = parseOrExpression(tokens, pos);
    node = { type: "NOT", left: node, right };
  }

  return node;
}

function parseOrExpression(tokens, pos) {
  let node = parsePrimary(tokens, pos);

  while (pos.index < tokens.length && tokens[pos.index]?.type === "OR") {
    pos.index += 1;
    const right = parsePrimary(tokens, pos);
    node = { type: "OR", left: node, right };
  }

  return node;
}

function parsePrimary(tokens, pos) {
  const token = tokens[pos.index];

  if (token?.type === "GROUP") {
    pos.index += 1;
    return {
      type: "GROUP",
      field: token.field,
      ast: parseQuery(token.content),
    };
  }

  if (token?.type === "LPAREN") {
    pos.index += 1;
    const node = parseExpression(tokens, pos);
    if (tokens[pos.index]?.type === "RPAREN") pos.index += 1;
    return node;
  }

  if (token?.type === "TERM") {
    pos.index += 1;
    const fieldMatch = token.value.match(/^(.+?)\[(.+?)\]$/);
    if (fieldMatch) {
      return {
        type: "GROUP",
        field: fieldMatch[2].trim(),
        ast: parseQuery(fieldMatch[1].trim()),
      };
    }
    return { type: "GROUP", field: "__all__", ast: { type: "TERM", value: token.value } };
  }

  return null;
}

function parseQuery(query) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const tokens = tokenize(trimmed);
  if (!tokens.length) return null;

  const hasExplicitOperator = tokens.some(
    (token) => token.type === "AND" || token.type === "OR" || token.type === "NOT"
  );
  if (!hasExplicitOperator && tokens.every((token) => token.type === "TERM" || token.type === "GROUP")) {
    let node = parsePrimary(tokens, { index: 0 });
    let pos = { index: 1 };
    while (pos.index < tokens.length) {
      const right = parsePrimary(tokens, pos);
      node = { type: "AND", left: node, right };
    }
    return node;
  }

  return parseExpression(tokens, { index: 0 });
}

function getSearchFields(fieldName) {
  if (!fieldName || fieldName === "__all__" || fieldName === "All Fields") return columns;
  return columns.includes(fieldName) ? [fieldName] : [fieldName];
}

function termMatches(termNode, study, searchFields) {
  const regex = wildcardToRegex(termNode.value);
  return searchFields.some((field) => regex.test(String(study[field] ?? "")));
}

function evaluateNode(node, study, searchFields = columns) {
  if (!node) return true;

  if (node.type === "GROUP") {
    const fields = getSearchFields(node.field);
    return evaluateNode(node.ast, study, fields);
  }

  if (node.type === "TERM") return termMatches(node, study, searchFields);
  if (node.type === "AND") {
    return evaluateNode(node.left, study, searchFields) && evaluateNode(node.right, study, searchFields);
  }
  if (node.type === "OR") {
    return evaluateNode(node.left, study, searchFields) || evaluateNode(node.right, study, searchFields);
  }
  if (node.type === "NOT") {
    return evaluateNode(node.left, study, searchFields) && !evaluateNode(node.right, study, searchFields);
  }
  return false;
}

function matchesYear(study, yearFrom, yearTo) {
  const yearValue = study.year;
  if (yearValue == null || yearValue === "") return false;
  const year = typeof yearValue === "number" ? yearValue : parseInt(yearValue, 10);
  if (Number.isNaN(year)) return false;
  if (yearFrom != null && year < yearFrom) return false;
  if (yearTo != null && year > yearTo) return false;
  return true;
}

function truncateText(text, maxLength = 320) {
  const value = String(text ?? "");
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}…`;
}

function populateColumnSelect() {
  const select = document.getElementById("columnSelect");
  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "__all__";
  allOption.textContent = "All Fields";
  select.appendChild(allOption);

  if (columnGroups.length) {
    columnGroups.forEach((group) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group.label.replace(/^S1-/, "");
      group.columns.forEach((column) => {
        const option = document.createElement("option");
        option.value = column;
        option.textContent = column;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
    });
    return;
  }

  columns.forEach((column) => {
    const option = document.createElement("option");
    option.value = column;
    option.textContent = column;
    select.appendChild(option);
  });
}

function buildYearCounts() {
  yearCounts = {};
  for (let year = yearBounds.min; year <= yearBounds.max; year += 1) {
    yearCounts[year] = 0;
  }

  allStudies.forEach((study) => {
    const yearValue = typeof study.year === "number" ? study.year : parseInt(study.year, 10);
    if (!Number.isNaN(yearValue) && yearCounts[yearValue] != null) {
      yearCounts[yearValue] += 1;
    }
  });
}

function yearFromHistogramEvent(event) {
  const histogram = document.getElementById("yearHistogram");
  const bar = event.target.closest(".year-histogram-bar");
  if (bar) return parseInt(bar.dataset.year, 10);

  const rect = histogram.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const year = Math.round(yearBounds.min + ratio * (yearBounds.max - yearBounds.min));
  return Math.min(yearBounds.max, Math.max(yearBounds.min, year));
}

function setYearRange(minYear, maxYear) {
  let minValue = Math.min(minYear, maxYear);
  let maxValue = Math.max(minYear, maxYear);
  minValue = Math.max(yearBounds.min, Math.min(yearBounds.max, minValue));
  maxValue = Math.max(yearBounds.min, Math.min(yearBounds.max, maxValue));

  document.getElementById("yearMin").value = minValue;
  document.getElementById("yearMax").value = maxValue;
  updateYearLabels();
}

function initYearSlider() {
  if (yearBounds.min == null || yearBounds.max == null) {
    document.getElementById("yearRangeContainer").style.display = "none";
    return;
  }

  const minSlider = document.getElementById("yearMin");
  const maxSlider = document.getElementById("yearMax");
  minSlider.min = yearBounds.min;
  minSlider.max = yearBounds.max;
  minSlider.value = yearBounds.min;
  maxSlider.min = yearBounds.min;
  maxSlider.max = yearBounds.max;
  maxSlider.value = yearBounds.max;

  defaultYearRange = { min: yearBounds.min, max: yearBounds.max };
  document.getElementById("yearAxisMin").textContent = yearBounds.min;
  document.getElementById("yearAxisMax").textContent = yearBounds.max;
  buildYearCounts();
  renderYearHistogram();
  updateYearLabels();
  bindYearHistogramEvents();
  bindYearSliderEvents();
}

function renderYearHistogram() {
  const histogram = document.getElementById("yearHistogram");
  const maxCount = Math.max(1, ...Object.values(yearCounts));
  const years = [];

  for (let year = yearBounds.min; year <= yearBounds.max; year += 1) {
    years.push(year);
  }

  histogram.innerHTML = years
    .map((year) => {
      const count = yearCounts[year] || 0;
      const height = count ? Math.max(8, (count / maxCount) * 100) : 2;
      const label = count === 1 ? `${year}: 1 study` : `${year}: ${count} studies`;
      return `<button type="button" class="year-histogram-bar${count ? "" : " is-empty"}" data-year="${year}" data-count="${count}" style="height: ${height}%;" title="${label}" aria-label="${label}"></button>`;
    })
    .join("");
}

function updateYearSelectionStyles() {
  const { min: selectedMin, max: selectedMax } = getSelectedYearRange();
  document.querySelectorAll(".year-histogram-bar").forEach((bar) => {
    const year = parseInt(bar.dataset.year, 10);
    const selected = year >= selectedMin && year <= selectedMax;
    bar.classList.toggle("is-selected", selected);
    bar.setAttribute("aria-pressed", selected);
  });
}

function updateYearLabels() {
  const minSlider = document.getElementById("yearMin");
  const maxSlider = document.getElementById("yearMax");
  let minValue = parseInt(minSlider.value, 10);
  let maxValue = parseInt(maxSlider.value, 10);

  if (minValue > maxValue) {
    if (document.activeElement === minSlider) {
      maxValue = minValue;
      maxSlider.value = maxValue;
    } else {
      minValue = maxValue;
      minSlider.value = minValue;
    }
  }

  document.getElementById("yearMinLabel").textContent = minValue;
  document.getElementById("yearMaxLabel").textContent = maxValue;
  updateYearSelectionStyles();

  const range = yearBounds.max - yearBounds.min;
  const minPercent = range ? ((minValue - yearBounds.min) / range) * 100 : 0;
  const maxPercent = range ? ((maxValue - yearBounds.min) / range) * 100 : 100;
  const track = document.getElementById("yearRangeTrack");
  if (track) {
    track.style.left = `${minPercent}%`;
    track.style.width = `${maxPercent - minPercent}%`;
  }
}

function bindYearSliderEvents() {
  const minSlider = document.getElementById("yearMin");
  const maxSlider = document.getElementById("yearMax");
  if (minSlider.dataset.bound === "true") return;
  minSlider.dataset.bound = "true";
  minSlider.addEventListener("input", updateYearLabels);
  maxSlider.addEventListener("input", updateYearLabels);
}

function bindYearHistogramEvents() {
  const histogram = document.getElementById("yearHistogram");
  if (histogram.dataset.bound === "true") return;
  histogram.dataset.bound = "true";

  histogram.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const year = yearFromHistogramEvent(event);
    yearHistogramDrag = { start: year, pointerId: event.pointerId };
    histogram.setPointerCapture(event.pointerId);
    histogram.classList.add("is-dragging");
    setYearRange(year, year);
  });

  histogram.addEventListener("pointermove", (event) => {
    if (!yearHistogramDrag) return;
    const year = yearFromHistogramEvent(event);
    setYearRange(yearHistogramDrag.start, year);
  });

  const endDrag = () => {
    if (!yearHistogramDrag) return;
    yearHistogramDrag = null;
    histogram.classList.remove("is-dragging");
  };

  histogram.addEventListener("pointerup", endDrag);
  histogram.addEventListener("pointercancel", endDrag);
}

function getSelectedYearRange() {
  const minValue = parseInt(document.getElementById("yearMin").value, 10);
  const maxValue = parseInt(document.getElementById("yearMax").value, 10);
  return { min: minValue, max: maxValue };
}

function isYearFilterActive() {
  const { min, max } = getSelectedYearRange();
  return min !== defaultYearRange.min || max !== defaultYearRange.max;
}

function formatClause(term, column) {
  if (column === "__all__") {
    return `(${term})`;
  }
  return `(${term})[${column}]`;
}

function addTermToQueryBox(operator) {
  const term = document.getElementById("queryInput").value.trim();
  const column = document.getElementById("columnSelect").value;
  const queryBox = document.getElementById("queryBox");

  if (!term || !operator) return;

  const fragment = formatClause(term, column);
  const current = queryBox.value.trim();

  if (!current) {
    queryBox.value = fragment;
  } else {
    queryBox.value = `${current} ${operator} ${fragment}`;
  }

  document.getElementById("queryInput").value = "";
  queryBox.focus();
}

function extractHighlightTerms(query) {
  if (!query) return [];

  const terms = [];
  const groupRegex = /\(([^)]+)\)(?:\[[^\]]+\])?/g;
  let match = groupRegex.exec(query);

  while (match) {
    collectTermsFromExpression(match[1], terms);
    match = groupRegex.exec(query);
  }

  if (!terms.length) {
    collectTermsFromExpression(query, terms);
  }

  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))];
}

function collectTermsFromExpression(expression, terms) {
  expression
    .split(/\b(?:AND|OR|NOT)\b/i)
    .forEach((part) => {
      part
        .split(/\s+/)
        .map((token) => token.replace(/^["'(]+|["')]+$/g, ""))
        .filter((token) => token && !/^(AND|OR|NOT)$/i.test(token))
        .forEach((token) => terms.push(token));
    });
}

function highlightSearchTerms(text, terms) {
  const safeText = escapeHtml(text);
  if (!terms.length) return safeText;

  const patterns = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*")
  );

  if (!patterns.length) return safeText;

  const regex = new RegExp(`(${patterns.join("|")})`, "gi");
  return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function createStudyHTML(study, highlightTerms = []) {
  const authors = highlightSearchTerms(study.authors || "Unknown authors", highlightTerms);
  const title = highlightSearchTerms(study.title || "Untitled", highlightTerms);
  const year = study.year ? ` (${study.year})` : "";
  const abstract = highlightSearchTerms(truncateText(study.abstract), highlightTerms);

  return `
    <div class="evidence-result-card fade-in-super-short">
      <p class="text-muted mb-1 evidence-result-authors" style="font-size: 0.9rem;">${authors}${year}</p>
      <h3 class="fw-semibold mb-2 signika evidence-result-title" style="font-size: 1.05rem; color: var(--dgps-boreal-dark);">${title}</h3>
      <p class="mb-0 text-muted evidence-result-abstract" style="font-size: 0.88rem; line-height: 1.5;">${abstract}</p>
    </div>
  `;
}

function formatReportDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function updateReportButton(results) {
  const downloadDropdown = document.getElementById("downloadReportDropdown");
  downloadDropdown.style.display = hasSearched && results.length > 0 ? "block" : "none";
}

function getReportMetadata() {
  return {
    searchDate: formatReportDate(),
    queryDisplay: lastSearchQuery || "(no text query — year filter only)",
    yearInfo: lastSearchYearRange
      ? `${lastSearchYearRange.min} – ${lastSearchYearRange.max}`
      : "Not applied",
    studyCount: lastSearchResults.length,
  };
}

function sanitizePdfText(text) {
  return String(text ?? "")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\u2026/g, "...")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function getDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

let reportLogoPng = null;
let reportGradientPng = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

async function getReportLogoPng() {
  if (reportLogoPng) return reportLogoPng;

  const response = await fetch("/assets/logos/metacih-logo.svg");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const svgText = await response.text();
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = 1700;
    canvas.height = 430;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    reportLogoPng = canvas.toDataURL("image/png");
    return reportLogoPng;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getReportGradientPng() {
  if (reportGradientPng) return reportGradientPng;

  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#6bb8ab");
  gradient.addColorStop(0.55, "#1f6f63");
  gradient.addColorStop(1, "#0c332e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  reportGradientPng = canvas.toDataURL("image/png");
  return reportGradientPng;
}

function drawReportHeader(doc, logoData, gradientData) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const logoWidth = 52;
  const logoHeight = logoWidth * (430 / 1700);
  const logoY = 8;

  doc.addImage(logoData, "PNG", pageWidth - margin - logoWidth, logoY, logoWidth, logoHeight);

  const barY = logoY + logoHeight + 3.5;
  const barHeight = 2;
  doc.addImage(gradientData, "PNG", 0, barY, pageWidth, barHeight);
  return barY + barHeight;
}

async function downloadReportPdf() {
  if (!lastSearchResults.length) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  if (typeof doc.autoTable !== "function") {
    window.alert("PDF export is unavailable. Please try CSV download instead.");
    return;
  }

  let logoData;
  try {
    logoData = await getReportLogoPng();
  } catch (error) {
    console.error("Error loading report logo:", error);
    window.alert("Could not load the MetaCIH logo for the PDF header.");
    return;
  }

  const gradientData = getReportGradientPng();
  const { searchDate, queryDisplay, yearInfo, studyCount } = getReportMetadata();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const headerBottom = drawReportHeader(doc, logoData, gradientData);
  let y = headerBottom + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(13, 134, 112);
  doc.text("MetaCIH Evidence Search Report", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(33, 37, 41);
  y += 10;
  doc.text(`Search date: ${searchDate}`, margin, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Query:", margin, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  const queryLines = doc.splitTextToSize(sanitizePdfText(queryDisplay), contentWidth);
  doc.text(queryLines, margin, y);
  y += queryLines.length * 5 + 4;

  doc.text(`Publication year filter: ${yearInfo}`, margin, y);
  y += 6;
  doc.text(`Studies found: ${studyCount}`, margin, y);
  y += 8;

  doc.autoTable({
    startY: y,
    head: [["#", "Authors", "Title"]],
    body: lastSearchResults.map((study, index) => [
      String(index + 1),
      sanitizePdfText(study.authors || "Unknown authors"),
      sanitizePdfText(study.title || "Untitled"),
    ]),
    margin: { top: headerBottom + 8, left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.5,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [233, 245, 242],
      textColor: [13, 134, 112],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 55 },
      2: { cellWidth: contentWidth - 65 },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawReportHeader(doc, logoData, gradientData);
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(108, 117, 125);
  doc.text("Generated by the MetaCIH Collaboration", margin, finalY);

  doc.save(`MetaCIH_search_report_${getDateStamp()}.pdf`);
}

function downloadReportCsv() {
  if (!lastSearchResults.length) return;

  const { searchDate, queryDisplay, yearInfo, studyCount } = getReportMetadata();

  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const lines = [
    ["Search date", searchDate],
    ["Query", queryDisplay],
    ["Publication year filter", yearInfo],
    ["Studies found", studyCount],
    [],
    ["#", "Authors", "Title"],
    ...lastSearchResults.map((study, index) => [
      index + 1,
      study.authors || "Unknown authors",
      study.title || "Untitled",
    ]),
  ];

  const csv = `\ufeff${lines.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
  downloadBlob(csv, "text/csv;charset=utf-8", `MetaCIH_search_report_${getDateStamp()}.csv`);
}

function closeSearchResultsDropdown() {
  const toggle = document.getElementById("searchResultsToggle");
  if (!toggle || !window.bootstrap) return;
  window.bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
}

function updateSearchResultsDropdown(results) {
  const wrap = document.getElementById("searchResultsDropdownWrap");
  const toggleText = document.getElementById("searchResultsToggleText");

  if (!hasSearched || !results.length) {
    wrap.style.display = "none";
    closeSearchResultsDropdown();
    return;
  }

  wrap.style.display = "block";
  toggleText.textContent =
    results.length === 1
      ? "1 study found — click to view"
      : `${results.length} studies found — click to view`;
}

function renderResults(results) {
  const resultsDiv = document.getElementById("searchResults");
  const resultCount = document.getElementById("resultCount");

  if (!hasSearched) {
    resultCount.textContent = `${allStudies.length} studies loaded. Build a query and click Search.`;
    resultsDiv.innerHTML = "";
    updateSearchResultsDropdown([]);
    updateReportButton([]);
    return;
  }

  resultCount.textContent =
    results.length === 1 ? "1 study found" : `${results.length} studies found`;

  if (!results.length) {
    resultsDiv.innerHTML = "";
    updateSearchResultsDropdown([]);
    updateReportButton([]);
    return;
  }

  resultsDiv.innerHTML =
    results.map((study) => createStudyHTML(study, lastHighlightTerms)).join("") +
    '<div class="evidence-results-footer-stripe" aria-hidden="true"></div>';
  updateSearchResultsDropdown(results);
  updateReportButton(results);
}

function runSearch() {
  const query = document.getElementById("queryBox").value.trim();
  const { min: yearFrom, max: yearTo } = getSelectedYearRange();
  const clearBtn = document.getElementById("clearFilters");

  hasSearched = Boolean(query || isYearFilterActive());
  clearBtn.style.display = hasSearched ? "inline-block" : "none";

  let results = allStudies;

  if (isYearFilterActive()) {
    results = results.filter((study) => matchesYear(study, yearFrom, yearTo));
  }

  if (query) {
    lastHighlightTerms = extractHighlightTerms(query);
    try {
      const ast = parseQuery(query);
      if (ast) {
        results = results.filter((study) => evaluateNode(ast, study));
      }
    } catch (error) {
      lastSearchResults = [];
      lastSearchQuery = query;
      lastSearchYearRange = isYearFilterActive() ? getSelectedYearRange() : null;
      document.getElementById("resultCount").textContent = "Invalid search query.";
      document.getElementById("searchResults").innerHTML = "";
      updateSearchResultsDropdown([]);
      updateReportButton([]);
      return;
    }
  } else {
    lastHighlightTerms = [];
  }

  lastSearchResults = results;
  lastSearchQuery = query;
  lastSearchYearRange = isYearFilterActive() ? getSelectedYearRange() : null;

  renderResults(results);
}

function clearFilters() {
  document.getElementById("queryInput").value = "";
  document.getElementById("queryBox").value = "";
  document.getElementById("columnSelect").value = "__all__";
  setYearRange(defaultYearRange.min, defaultYearRange.max);
  lastHighlightTerms = [];
  lastSearchResults = [];
  lastSearchQuery = "";
  lastSearchYearRange = null;
  hasSearched = false;
  document.getElementById("clearFilters").style.display = "none";
  updateReportButton([]);
  renderResults([]);
}

function initEvidenceSearch() {
  document.getElementById("searchBtn").addEventListener("click", runSearch);
  document.getElementById("clearFilters").addEventListener("click", clearFilters);
  document.getElementById("downloadReportPdfBtn").addEventListener("click", downloadReportPdf);
  document.getElementById("downloadReportCsvBtn").addEventListener("click", downloadReportCsv);

  document.querySelectorAll(".add-query-option").forEach((button) => {
    button.addEventListener("click", () => {
      addTermToQueryBox(button.dataset.operator);
    });
  });

  document.getElementById("clearTermInput").addEventListener("click", () => {
    document.getElementById("queryInput").value = "";
    document.getElementById("queryInput").focus();
  });

  document.getElementById("clearQueryBox").addEventListener("click", () => {
    document.getElementById("queryBox").value = "";
    document.getElementById("queryBox").focus();
  });

  document.getElementById("queryInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTermToQueryBox("AND");
    }
  });

  fetch("/assets/databases/unified.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      columns = data.columns || [];
      columnGroups = data.columnGroups || [];
      allStudies = data.studies || [];
      yearBounds = { min: data.yearMin, max: data.yearMax };
      populateColumnSelect();
      initYearSlider();
      renderResults([]);
    })
    .catch((error) => {
      console.error("Error loading studies:", error);
      document.getElementById("resultCount").textContent = "Could not load study database.";
    });
}

document.addEventListener("DOMContentLoaded", initEvidenceSearch);
