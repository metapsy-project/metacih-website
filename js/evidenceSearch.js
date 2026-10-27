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
let lastSearchSampleRange = null;
let sampleBounds = { min: null, max: null };
let defaultSampleRange = { min: null, max: null };
let sampleHistogramDrag = null;
let countryCounts = new Map();
let countryFeatures = [];
const SAMPLE_BIN_WIDTH = 10;
const COUNTRY_COLOR_LOW = "#8ec9bc";
const COUNTRY_COLOR_HIGH = "#0c332e";
const COUNTRY_COLOR_EMPTY = "#e9ecef";

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

function bibliographicColumns() {
  const group = columnGroups.find((entry) => entry.label.replace(/^S1-/, "") === "Bibliographic");
  const names = group ? group.columns : ["study_id", "authors", "title", "abstract", "year", "journal"];
  return names.filter((column) => !columns.length || columns.includes(column));
}

function getSearchFields(fieldName) {
  const bibliographic = bibliographicColumns();
  if (!fieldName || fieldName === "__all__" || fieldName === "All Fields") {
    return bibliographic.length ? bibliographic : columns;
  }
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

function isNotReportedValue(value) {
  return /^not reported$/i.test(String(value ?? "").trim());
}

function studyYearMissing(study) {
  if (isNotReportedValue(study.year)) return true;
  const yearValue = study.year;
  if (yearValue == null || String(yearValue).trim() === "") return true;
  const year = typeof yearValue === "number" ? yearValue : parseInt(yearValue, 10);
  return Number.isNaN(year);
}

function matchesYear(study, yearFrom, yearTo) {
  if (studyYearMissing(study)) return isNotReportedIncluded("yearNotReported");
  const yearValue = study.year;
  const year = typeof yearValue === "number" ? yearValue : parseInt(yearValue, 10);
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

  bibliographicColumns()
    .filter((column) => column !== "study_id")
    .forEach((column) => {
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
  updateLiveStudyCount();
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
  const histogram = document.getElementById("yearHistogram");
  if (!histogram) return;
  const { min: selectedMin, max: selectedMax } = getSelectedYearRange();
  histogram.querySelectorAll(".year-histogram-bar").forEach((bar) => {
    const year = parseInt(bar.dataset.year, 10);
    const selected = year >= selectedMin && year <= selectedMax;
    bar.classList.toggle("is-selected", selected);
    bar.setAttribute("aria-pressed", selected ? "true" : "false");
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
  const summary = document.getElementById("yearAccordionSummary");
  if (summary) summary.textContent = `${minValue}–${maxValue}`;
  updateYearSelectionStyles();

  const range = yearBounds.max - yearBounds.min;
  const minPercent = range ? ((minValue - yearBounds.min) / range) * 100 : 0;
  const maxPercent = range ? ((maxValue - yearBounds.min) / range) * 100 : 100;
  placeThumbPair(
    document.getElementById("yearMinLabel"),
    document.getElementById("yearMaxLabel"),
    minPercent,
    maxPercent
  );
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

function studiesForReport() {
  return hasSearched ? lastSearchResults : allStudies;
}

function updateReportButton(results) {
  const downloadDropdown = document.getElementById("downloadReportDropdown");
  downloadDropdown.style.display = results.length > 0 ? "block" : "none";
}

function reportQueryValue() {
  const query = document.getElementById("queryBox");
  const text = query ? query.value.trim() : "";
  return text || "Not applied";
}

function describeCheckedMenu(menuId) {
  const boxes = menuOptionInputs(menuId);
  const checked = boxes.filter((box) => box.checked);
  if (!boxes.length || checked.length === boxes.length) return "All";
  if (!checked.length) return "None";
  return checked.map((box) => box.dataset.label || box.value).join(", ");
}

function optionState(checkboxId, includedLabel, excludedLabel) {
  if (!isNotReportedOptionVisible(checkboxId)) return "";
  return isNotReportedIncluded(checkboxId) ? includedLabel : excludedLabel;
}

function joinFilterValue(parts) {
  return parts.filter(Boolean).join("; ");
}

function studyFilterRows() {
  const sample = getSelectedSampleRange();
  const year = getSelectedYearRange();
  const rows = [
    ["Sample size", joinFilterValue([
      sample.min == null || Number.isNaN(sample.min) ? "Not applied" : `${sample.min}–${sample.max}`,
      optionState("sampleNotReported", "not reported included", "not reported excluded"),
    ])],
    ["Publication year", joinFilterValue([
      Number.isNaN(year.min) ? "Not applied" : `${year.min}–${year.max}`,
      optionState("yearNotReported", "not reported included", "not reported excluded"),
    ])],
    ["Country", joinFilterValue([
      describeCheckedMenu("countryMenu"),
      optionState("countryNotReported", "not reported included", "not reported excluded"),
      optionState("countryInferred", "inferred country included", "inferred country excluded"),
    ])],
  ];
  [
    { label: "Age group", menuId: "ageGroupMenu", notReportedId: "ageGroupNotReported" },
    { label: "Vulnerable population", menuId: "vulnerableMenu", notReportedId: "vulnerableNotReported" },
    { label: "Intervention type", menuId: "interventionMenu", notReportedId: "interventionNotReported", includeUnclearId: "interventionUnclear" },
    { label: "Intervention format & delivery", menuId: "deliveryMenu", notReportedId: "deliveryNotReported" },
    { label: "Setting", menuId: "settingMenu", notReportedId: "settingNotReported" },
    { label: "Control group", menuId: "controlMenu", notReportedId: "controlNotReported" },
    { label: "Outcomes", menuId: "outcomesMenu", notReportedId: "outcomesNotReported" },
  ].forEach((filter) => {
    rows.push([filter.label, joinFilterValue([
      describeCheckedMenu(filter.menuId),
      optionState(filter.notReportedId, "not reported included", "not reported excluded"),
      filter.includeUnclearId
        ? optionState(filter.includeUnclearId, "unclear and unnamed included", "unclear and unnamed excluded")
        : "",
    ])]);
  });
  return rows;
}

function getReportMetadata() {
  const studies = studiesForReport();
  return {
    searchDate: formatReportDate(),
    query: reportQueryValue(),
    studyFilters: studyFilterRows(),
    studyCount: studies.length,
  };
}

function sanitizePdfText(text) {
  return String(text ?? "")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "- ")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u0160/g, "S")
    .replace(/\u0161/g, "s")
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function breakPdfLine(doc, line, maxWidth) {
  if (!line) return [""];
  if (doc.getTextWidth(line) <= maxWidth) return [line];
  const lines = [];
  let current = "";
  for (const ch of line) {
    const next = current + ch;
    if (current && doc.getTextWidth(next) > maxWidth) {
      lines.push(current);
      current = ch === " " ? "" : ch;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function wrapPdfCellText(doc, text, maxWidth) {
  const width = Math.max(Number(maxWidth) || 0, 4);
  const source = sanitizePdfText(Array.isArray(text) ? text.join("\n") : text);
  const lines = [];
  source.split(/\r\n|\r|\n/).forEach((paragraph) => {
    const wrapped = paragraph ? doc.splitTextToSize(paragraph, width) : [""];
    const parts = Array.isArray(wrapped) ? wrapped : [String(wrapped)];
    parts.forEach((line) => lines.push(...breakPdfLine(doc, String(line), width)));
  });
  return lines.length ? lines : [""];
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
  const studies = studiesForReport();
  if (!studies.length) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

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
  const { searchDate, query, studyFilters, studyCount } = getReportMetadata();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const headerBottom = drawReportHeader(doc, logoData, gradientData);
  let y = headerBottom + 10;

  const continueReport = () => {
    doc.addPage();
    const nextHeader = drawReportHeader(doc, logoData, gradientData);
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    return nextHeader + 10;
  };
  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 14) y = continueReport();
  };
  const drawSectionTitle = (title) => {
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(13, 134, 112);
    doc.text(title, margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
  };
  const drawLabeledValue = (label, value) => {
    doc.setFont("helvetica", "bold");
    const labelText = `${label}: `;
    const labelWidth = doc.getTextWidth(labelText);
    const valueWidth = Math.max(20, contentWidth - labelWidth);
    const lines = doc.splitTextToSize(sanitizePdfText(value), valueWidth);
    ensureSpace(lines.length * 5 + 2);
    doc.setFont("helvetica", "bold");
    doc.text(labelText, margin, y);
    doc.setFont("helvetica", "normal");
    if (lines.length) doc.text(lines[0], margin + labelWidth, y);
    if (lines.length > 1) doc.text(lines.slice(1), margin, y + 5);
    y += Math.max(1, lines.length) * 5 + 1.5;
  };
  const drawPlainValue = (value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    const lines = doc.splitTextToSize(sanitizePdfText(value), contentWidth);
    ensureSpace(lines.length * 5 + 2);
    doc.text(lines, margin, y);
    y += Math.max(1, lines.length) * 5 + 1.5;
  };

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

  drawSectionTitle("Search query");
  drawPlainValue(query);
  y += 2;
  drawSectionTitle("Study filter");
  studyFilters.forEach(([label, value]) => drawLabeledValue(label, value));
  y += 3;
  ensureSpace(8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 134, 112);
  doc.text(`Identified studies: ${studyCount}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(33, 37, 41);
  y += 8;

  doc.autoTable({
    startY: y,
    head: [["#", "Authors", "Year", "Title", "Abstract", "Journal"]],
    body: studies.map((study, index) => [
      String(index + 1),
      sanitizePdfText(study.authors || "Unknown authors"),
      sanitizePdfText(study.year ? String(study.year) : ""),
      sanitizePdfText(study.title || "Untitled"),
      sanitizePdfText(study.abstract || ""),
      sanitizePdfText(study.journal || ""),
    ]),
    tableWidth: contentWidth,
    margin: { top: headerBottom + 8, left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      overflow: (text, width) => wrapPdfCellText(doc, text, width),
      valign: "top",
    },
    headStyles: {
      fillColor: [233, 245, 242],
      textColor: [13, 134, 112],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 32 },
      2: { cellWidth: 14 },
      3: { cellWidth: 40 },
      4: { cellWidth: contentWidth - 122 },
      5: { cellWidth: 28 },
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
  const studies = studiesForReport();
  if (!studies.length) return;

  const { searchDate, query, studyFilters, studyCount } = getReportMetadata();

  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const lines = [
    ["Search date", searchDate],
    [],
    ["Search query"],
    [query],
    [],
    ["Study filter"],
    ...studyFilters,
    [],
    ["Identified studies", studyCount],
    [],
    ["#", "Authors", "Year", "Title", "Abstract", "Journal"],
    ...studies.map((study, index) => [
      index + 1,
      study.authors || "Unknown authors",
      study.year ? String(study.year) : "",
      study.title || "Untitled",
      study.abstract || "",
      study.journal || "",
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
  const label = document.getElementById("searchResultsLabel");

  if (!results.length) {
    wrap.style.display = "none";
    closeSearchResultsDropdown();
    return;
  }

  wrap.style.display = "block";
  const noun = results.length === 1 ? "1 study" : `${results.length} studies`;
  if (label) label.textContent = hasSearched ? "Search results" : "Studies";
  toggleText.textContent = hasSearched
    ? `${noun} found — click to view`
    : `${noun} — click to view`;
}

function placeYearThumbLabel(label, percent, edge) {
  if (!label) return;
  label.style.left = `${percent}%`;
  label.style.top = "0";
  if (edge === "min" && percent < 14) label.style.transform = "translateX(0)";
  else if (edge === "max" && percent > 86) label.style.transform = "translateX(-100%)";
  else label.style.transform = "translateX(-50%)";
}

function placeThumbPair(minLabel, maxLabel, minPercent, maxPercent) {
  if (!minLabel || !maxLabel) return;
  const container = minLabel.parentElement;
  placeYearThumbLabel(minLabel, minPercent, "min");
  placeYearThumbLabel(maxLabel, maxPercent, "max");
  if (container) container.classList.remove("is-stacked");
  maxLabel.style.top = "0";
  const minBox = minLabel.getBoundingClientRect();
  const maxBox = maxLabel.getBoundingClientRect();
  if (minBox.width && maxBox.width && minBox.right + 4 > maxBox.left) {
    placeYearThumbLabel(minLabel, minPercent, "min");
    placeYearThumbLabel(maxLabel, maxPercent, "max");
    maxLabel.style.top = "0.85rem";
    if (container) container.classList.add("is-stacked");
  }
}

function notReportedOption(checkboxId) {
  const box = document.getElementById(checkboxId);
  return box ? box.closest(".filter-include-option") : null;
}

function setNotReportedVisible(checkboxId, visible) {
  const option = notReportedOption(checkboxId);
  const box = document.getElementById(checkboxId);
  if (!option || !box) return;
  option.hidden = !visible;
  if (!visible) box.checked = true;
}

function isNotReportedOptionVisible(checkboxId) {
  const option = notReportedOption(checkboxId);
  return Boolean(option && !option.hidden);
}

function isNotReportedIncluded(checkboxId) {
  const box = document.getElementById(checkboxId);
  return !box || box.checked;
}

function fieldHasBlankOrNotReported(field) {
  return allStudies.some((study) => {
    const raw = String(study[field] ?? "").trim();
    if (!raw) return true;
    return categoryTokens(study[field]).some((token) => isNotReportedValue(token));
  });
}

function categoryTokens(value) {
  return String(value ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function studySampleSize(study) {
  const match = String(study.total_n ?? "").match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function sampleMissing(study) {
  return studySampleSize(study) == null;
}

function initSampleSlider() {
  const sizes = allStudies.map(studySampleSize).filter((value) => value != null);
  if (!sizes.length) return;
  sampleBounds = { min: Math.min(...sizes), max: Math.max(...sizes) };
  defaultSampleRange = { min: sampleBounds.min, max: sampleBounds.max };
  const minSlider = document.getElementById("sampleMin");
  const maxSlider = document.getElementById("sampleMax");
  if (!minSlider || !maxSlider) return;
  minSlider.min = sampleBounds.min;
  minSlider.max = sampleBounds.max;
  minSlider.value = sampleBounds.min;
  maxSlider.min = sampleBounds.min;
  maxSlider.max = sampleBounds.max;
  maxSlider.value = sampleBounds.max;
  renderSampleHistogram();
  updateSampleLabels();
  bindSampleHistogramEvents();
  if (minSlider.dataset.bound === "true") return;
  minSlider.dataset.bound = "true";
  minSlider.addEventListener("input", updateSampleLabels);
  maxSlider.addEventListener("input", updateSampleLabels);
}

function sampleBins() {
  const bins = [];
  for (let start = sampleBounds.min; start <= sampleBounds.max; start += SAMPLE_BIN_WIDTH) {
    bins.push({
      min: start,
      max: Math.min(sampleBounds.max, start + SAMPLE_BIN_WIDTH - 1),
    });
  }
  return bins;
}

function renderSampleHistogram() {
  const histogram = document.getElementById("sampleHistogram");
  if (!histogram || sampleBounds.min == null) return;
  const bins = sampleBins();
  const counts = bins.map((bin) => allStudies.filter((study) => {
    const size = studySampleSize(study);
    return size != null && size >= bin.min && size <= bin.max;
  }).length);
  const maxCount = Math.max(1, ...counts);
  histogram.innerHTML = bins.map((bin, index) => {
    const count = counts[index];
    const height = count ? Math.max(8, (count / maxCount) * 100) : 2;
    const label = `${bin.min}–${bin.max}: ${count} ${count === 1 ? "study" : "studies"}`;
    return `<button type="button" class="year-histogram-bar${count ? "" : " is-empty"}" data-sample-min="${bin.min}" data-sample-max="${bin.max}" style="height: ${height}%;" title="${label}" aria-label="${label}"></button>`;
  }).join("");
  updateSampleSelectionStyles();
}

function getSelectedSampleRange() {
  const minSlider = document.getElementById("sampleMin");
  const maxSlider = document.getElementById("sampleMax");
  if (!minSlider || !maxSlider) return { min: null, max: null };
  return {
    min: parseInt(minSlider.value, 10),
    max: parseInt(maxSlider.value, 10),
  };
}

function updateSampleSelectionStyles() {
  const histogram = document.getElementById("sampleHistogram");
  if (!histogram) return;
  const { min, max } = getSelectedSampleRange();
  histogram.querySelectorAll(".year-histogram-bar").forEach((bar) => {
    const binMin = parseInt(bar.dataset.sampleMin, 10);
    const binMax = parseInt(bar.dataset.sampleMax, 10);
    const selected = binMax >= min && binMin <= max;
    bar.classList.toggle("is-selected", selected);
    bar.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function updateSampleLabels() {
  const minSlider = document.getElementById("sampleMin");
  const maxSlider = document.getElementById("sampleMax");
  if (!minSlider || !maxSlider || sampleBounds.min == null) return;
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
  document.getElementById("sampleMinLabel").textContent = minValue;
  document.getElementById("sampleMaxLabel").textContent = maxValue;
  const summary = document.getElementById("sampleAccordionSummary");
  if (summary) summary.textContent = `${minValue}–${maxValue}`;
  updateSampleSelectionStyles();
  const range = sampleBounds.max - sampleBounds.min;
  const minPercent = range ? ((minValue - sampleBounds.min) / range) * 100 : 0;
  const maxPercent = range ? ((maxValue - sampleBounds.min) / range) * 100 : 100;
  placeThumbPair(
    document.getElementById("sampleMinLabel"),
    document.getElementById("sampleMaxLabel"),
    minPercent,
    maxPercent
  );
  const track = document.getElementById("sampleRangeTrack");
  if (track) {
    track.style.left = `${minPercent}%`;
    track.style.width = `${Math.max(0, maxPercent - minPercent)}%`;
  }
}

function setSampleRange(minValue, maxValue) {
  const minSlider = document.getElementById("sampleMin");
  const maxSlider = document.getElementById("sampleMax");
  if (!minSlider || !maxSlider) return;
  minSlider.value = Math.max(sampleBounds.min, Math.min(sampleBounds.max, Math.min(minValue, maxValue)));
  maxSlider.value = Math.max(sampleBounds.min, Math.min(sampleBounds.max, Math.max(minValue, maxValue)));
  updateSampleLabels();
  updateLiveStudyCount();
}

function sampleBinFromHistogramEvent(event) {
  const histogram = document.getElementById("sampleHistogram");
  const bar = event.target.closest(".year-histogram-bar");
  if (bar) return { min: parseInt(bar.dataset.sampleMin, 10), max: parseInt(bar.dataset.sampleMax, 10) };
  const bins = sampleBins();
  const rect = histogram.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const index = Math.min(bins.length - 1, Math.floor(ratio * bins.length));
  return bins[index];
}

function bindSampleHistogramEvents() {
  const histogram = document.getElementById("sampleHistogram");
  if (!histogram || histogram.dataset.bound === "true") return;
  histogram.dataset.bound = "true";
  histogram.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const bin = sampleBinFromHistogramEvent(event);
    if (!bin) return;
    sampleHistogramDrag = { start: bin, pointerId: event.pointerId };
    histogram.setPointerCapture(event.pointerId);
    setSampleRange(bin.min, bin.max);
  });
  histogram.addEventListener("pointermove", (event) => {
    if (!sampleHistogramDrag) return;
    const bin = sampleBinFromHistogramEvent(event);
    if (!bin) return;
    setSampleRange(
      Math.min(sampleHistogramDrag.start.min, bin.min),
      Math.max(sampleHistogramDrag.start.max, bin.max)
    );
  });
  const endDrag = () => { sampleHistogramDrag = null; };
  histogram.addEventListener("pointerup", endDrag);
  histogram.addEventListener("pointercancel", endDrag);
}

function matchesSampleSize(study, sampleFrom, sampleTo) {
  const size = studySampleSize(study);
  if (size == null) return isNotReportedIncluded("sampleNotReported");
  if (sampleFrom != null && size < sampleFrom) return false;
  if (sampleTo != null && size > sampleTo) return false;
  return true;
}

function isSampleSizeFilterActive() {
  if (defaultSampleRange.min == null) return false;
  const { min, max } = getSelectedSampleRange();
  const narrowed = min !== defaultSampleRange.min || max !== defaultSampleRange.max;
  const missingOff = isNotReportedOptionVisible("sampleNotReported") && !isNotReportedIncluded("sampleNotReported");
  return narrowed || missingOff;
}

function menuOptionInputs(menuId) {
  return [...document.querySelectorAll(`#${menuId} input[data-option="true"]`)];
}

function checkedOptionValues(menuId) {
  return new Set(menuOptionInputs(menuId).filter((box) => box.checked).map((box) => box.value));
}

function allOptionsChecked(menuId) {
  const boxes = menuOptionInputs(menuId);
  return boxes.length > 0 && boxes.every((box) => box.checked);
}

function updateCheckSummary(menu) {
  const summary = document.getElementById(menu.dataset.summary);
  if (!summary) return;
  const boxes = [...menu.querySelectorAll('input[data-option="true"]')];
  const checked = boxes.filter((box) => box.checked);
  const selectAll = menu.querySelector('input[data-select-all="true"]');
  if (selectAll) {
    selectAll.checked = boxes.length > 0 && checked.length === boxes.length;
    selectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
  }
  menu.querySelectorAll("input[data-group-toggle]").forEach((toggle) => {
    const groupBoxes = [...menu.querySelectorAll(`input[data-option="true"][data-group="${toggle.dataset.groupToggle}"]`)];
    const checkedCount = groupBoxes.filter((box) => box.checked).length;
    toggle.checked = groupBoxes.length > 0 && checkedCount === groupBoxes.length;
    toggle.indeterminate = checkedCount > 0 && checkedCount < groupBoxes.length;
  });
  if (!boxes.length || checked.length === boxes.length) summary.textContent = "All";
  else if (!checked.length) summary.textContent = "None";
  else if (checked.length <= 2) summary.textContent = checked.map((box) => box.dataset.label).join(", ");
  else summary.textContent = `${checked.length} selected`;
}

function appendFilterOption(menu, option) {
  const label = document.createElement("label");
  label.className = "filter-check-option";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = true;
  input.value = option.value;
  input.dataset.option = "true";
  input.dataset.label = option.summaryLabel || option.label;
  if (option.group) input.dataset.group = option.group;
  const text = document.createElement("span");
  text.textContent = `${option.label} (${option.count})`;
  label.appendChild(input);
  label.appendChild(text);
  menu.appendChild(label);
  input.addEventListener("change", () => updateCheckSummary(menu));
}

function appendFilterHeading(menu, text, groupKey) {
  const heading = document.createElement("label");
  heading.className = "filter-check-heading";
  if (groupKey) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    input.dataset.groupToggle = groupKey;
    input.setAttribute("aria-label", `Select all ${text}`);
    const label = document.createElement("span");
    label.textContent = text;
    heading.appendChild(input);
    heading.appendChild(label);
    input.addEventListener("change", () => {
      menu.querySelectorAll(`input[data-option="true"][data-group="${groupKey}"]`).forEach((box) => {
        box.checked = input.checked;
      });
      updateCheckSummary(menu);
    });
  } else {
    heading.textContent = text;
  }
  menu.appendChild(heading);
}

function controlConditionGroups(options) {
  const active = [];
  const passive = [];
  const other = [];
  options.forEach((option) => {
    const activeMatch = option.label.match(/^active-(.+)$/i);
    const passiveMatch = option.label.match(/^passive-(.+)$/i);
    if (activeMatch) active.push({ ...option, label: activeMatch[1], summaryLabel: option.label, group: "active" });
    else if (passiveMatch) passive.push({ ...option, label: passiveMatch[1], summaryLabel: option.label, group: "passive" });
    else other.push(option);
  });
  return [
    ["Active", "active", active],
    ["Passive", "passive", passive],
    ["", "", other],
  ].filter(([, , group]) => group.length);
}

function fillCheckMenu(menuId, options) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.innerHTML = "";
  const selectAllLabel = document.createElement("label");
  selectAllLabel.className = "filter-check-option";
  const selectAll = document.createElement("input");
  selectAll.type = "checkbox";
  selectAll.checked = true;
  selectAll.dataset.selectAll = "true";
  const selectAllText = document.createElement("span");
  selectAllText.textContent = "Select all";
  selectAllLabel.appendChild(selectAll);
  selectAllLabel.appendChild(selectAllText);
  menu.appendChild(selectAllLabel);

  const groups = menuId === "controlMenu" ? controlConditionGroups(options) : [["", "", options]];
  groups.forEach(([heading, groupKey, group]) => {
    if (heading) appendFilterHeading(menu, heading, groupKey);
    group.forEach((option) => appendFilterOption(menu, option));
  });

  selectAll.addEventListener("change", () => {
    menuOptionInputs(menuId).forEach((box) => { box.checked = selectAll.checked; });
    updateCheckSummary(menu);
    if (menuId === "countryMenu") updateCountrySelection();
  });
  updateCheckSummary(menu);
}

function resetCheckMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  menu.querySelectorAll('input[type="checkbox"]').forEach((box) => { box.checked = true; });
  updateCheckSummary(menu);
}

function isUnclearOrUnnamedToken(token) {
  return /^(unclear|unnamed)$/i.test(String(token ?? "").trim());
}

function fieldHasUnclear(field) {
  return allStudies.some((study) => categoryTokens(study[field]).some((token) => isUnclearOrUnnamedToken(token)));
}

const AGE_GROUP_ORDER = [
  "Adolescents (12-19)",
  "Young adults (18-25, such as college students)",
  "Adults general (18+)",
  "Older adults (60+)",
];

function sortCategoryOptions(field, options) {
  const byLabel = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  if (field === "vulnerable_type") {
    options.sort((a, b) => {
      const aOther = /^other vulnerable$/i.test(a.label);
      const bOther = /^other vulnerable$/i.test(b.label);
      if (aOther !== bOther) return aOther ? 1 : -1;
      return byLabel(a, b);
    });
    return;
  }
  if (field !== "age_group") {
    options.sort(byLabel);
    return;
  }
  options.sort((a, b) => {
    const aIndex = AGE_GROUP_ORDER.indexOf(a.label);
    const bIndex = AGE_GROUP_ORDER.indexOf(b.label);
    if (aIndex === -1 && bIndex === -1) return byLabel(a, b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function collectCategoryOptions(field, emptyLabel, omitUnclear) {
  const counts = new Map();
  let emptyCount = 0;
  allStudies.forEach((study) => {
    const raw = String(study[field] ?? "").trim();
    if (!raw) {
      emptyCount += 1;
      return;
    }
    categoryTokens(study[field]).forEach((token) => {
      if (isNotReportedValue(token) || (omitUnclear && isUnclearOrUnnamedToken(token))) return;
      counts.set(token, (counts.get(token) || 0) + 1);
    });
  });
  const options = [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }));
  sortCategoryOptions(field, options);
  if (emptyLabel && emptyCount > 0) options.unshift({ value: "__none__", label: emptyLabel, count: emptyCount });
  return options;
}

function matchesCategorical(study, field, menuId, notReportedId, includeUnclearId) {
  const tokens = categoryTokens(study[field]);
  const reported = tokens.filter((token) => !isNotReportedValue(token) && !(includeUnclearId && isUnclearOrUnnamedToken(token)));
  const missing = !String(study[field] ?? "").trim() || tokens.some((token) => isNotReportedValue(token));
  const unclear = Boolean(includeUnclearId) && tokens.some((token) => isUnclearOrUnnamedToken(token));
  const checked = checkedOptionValues(menuId);
  if (reported.some((token) => checked.has(token))) return true;
  if (reported.length) return false;
  if (unclear) {
    if (!isNotReportedIncluded(includeUnclearId)) return false;
    if (!missing) return true;
  }
  if (!missing) return false;
  if (checked.has("__none__")) return true;
  if (isNotReportedOptionVisible(notReportedId)) return isNotReportedIncluded(notReportedId);
  return allOptionsChecked(menuId);
}

function isCategoricalFilterActive(menuId, notReportedId, includeUnclearId) {
  const missingOff = isNotReportedOptionVisible(notReportedId) && !isNotReportedIncluded(notReportedId);
  const unclearOff = Boolean(includeUnclearId) && isNotReportedOptionVisible(includeUnclearId) && !isNotReportedIncluded(includeUnclearId);
  return !allOptionsChecked(menuId) || missingOff || unclearOff;
}

const CATEGORICAL_FILTERS = [
  { field: "age_group", menuId: "ageGroupMenu", notReportedId: "ageGroupNotReported", label: "Age group" },
  { field: "setting", menuId: "settingMenu", notReportedId: "settingNotReported", label: "Setting" },
  { field: "vulnerable_type", menuId: "vulnerableMenu", notReportedId: "vulnerableNotReported", label: "Vulnerable population", emptyLabel: "None" },
  { field: "protocol_name", menuId: "interventionMenu", notReportedId: "interventionNotReported", includeUnclearId: "interventionUnclear", label: "Intervention type" },
  { field: "delivery_format", menuId: "deliveryMenu", notReportedId: "deliveryNotReported", label: "Intervention delivery" },
  { field: "control_conditions", menuId: "controlMenu", notReportedId: "controlNotReported", label: "Control group" },
  { field: "outcomes_coded", menuId: "outcomesMenu", notReportedId: "outcomesNotReported", label: "Outcomes" },
];

function initCategoricalFilters() {
  CATEGORICAL_FILTERS.forEach((filter) => {
    fillCheckMenu(filter.menuId, collectCategoryOptions(filter.field, filter.emptyLabel, Boolean(filter.includeUnclearId)));
  });
}

function syncNotReportedOptions() {
  setNotReportedVisible("yearNotReported", allStudies.some(studyYearMissing));
  setNotReportedVisible("sampleNotReported", allStudies.some(sampleMissing));
  setNotReportedVisible("countryNotReported", allStudies.some((study) => !String(study.country ?? "").trim() || isNotReportedValue(study.country)));
  CATEGORICAL_FILTERS.forEach((filter) => {
    setNotReportedVisible(filter.notReportedId, !filter.emptyLabel && fieldHasBlankOrNotReported(filter.field));
    if (filter.includeUnclearId) setNotReportedVisible(filter.includeUnclearId, fieldHasUnclear(filter.field));
  });
}

function canonicalCountry(raw) {
  let value = String(raw ?? "").trim().replace(/^inferred\s*:\s*/i, "");
  if (!value || isNotReportedValue(value)) return "";
  const aliases = {
    usa: "United States",
    "united states": "United States",
    "united states of america": "United States",
    uk: "United Kingdom",
    "united kingdom": "United Kingdom",
    "united kingdom of great britain and northern ireland": "United Kingdom",
    "netherlands, kingdom of the": "Netherlands",
    "south korea": "South Korea",
    "korea, republic of": "South Korea",
    "republic of korea": "South Korea",
    "iran, islamic republic of": "Iran",
    "taiwan, province of china": "Taiwan",
  };
  return aliases[value.toLowerCase()] || value;
}

function isInferredCountry(value) {
  return /inferred\s*:/i.test(String(value ?? ""));
}

function buildCountryCounts() {
  countryCounts = new Map();
  allStudies.forEach((study) => {
    const name = canonicalCountry(study.country);
    if (!name) return;
    const current = countryCounts.get(name) || { value: name, label: name, count: 0 };
    current.count += 1;
    countryCounts.set(name, current);
  });
}

function populateCountrySelect() {
  const options = [...countryCounts.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((country) => ({ value: country.value, label: country.label, count: country.count }));
  fillCheckMenu("countryMenu", options);
  menuOptionInputs("countryMenu").forEach((box) => {
    box.addEventListener("change", updateCountrySelection);
  });
}

function isCountryFilterActive() {
  const inferred = document.getElementById("countryInferred");
  const missingOff = isNotReportedOptionVisible("countryNotReported") && !isNotReportedIncluded("countryNotReported");
  return !allOptionsChecked("countryMenu") || missingOff || (inferred && !inferred.checked);
}

function matchesCountry(study) {
  const raw = String(study.country ?? "").trim();
  if (isInferredCountry(raw) && !document.getElementById("countryInferred").checked) return false;
  if (!raw || isNotReportedValue(raw)) {
    if (isNotReportedOptionVisible("countryNotReported")) return isNotReportedIncluded("countryNotReported");
    return allOptionsChecked("countryMenu");
  }
  const name = canonicalCountry(raw);
  if (!name) return allOptionsChecked("countryMenu");
  return checkedOptionValues("countryMenu").has(name);
}

function mixHex(from, to, amount) {
  const channel = (hex, offset) => parseInt(hex.slice(offset, offset + 2), 16);
  const mixed = [1, 3, 5].map((offset) => Math.round(channel(from, offset) + (channel(to, offset) - channel(from, offset)) * amount));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function countryFill(count, maxCount) {
  if (!count) return COUNTRY_COLOR_EMPTY;
  if (maxCount <= 1) return COUNTRY_COLOR_HIGH;
  return mixHex(COUNTRY_COLOR_LOW, COUNTRY_COLOR_HIGH, (count - 1) / (maxCount - 1));
}

function updateCountrySelection() {
  const checked = checkedOptionValues("countryMenu");
  const filtering = !allOptionsChecked("countryMenu");
  countryFeatures.forEach((feature) => {
    const name = feature.properties.canonical;
    const included = !name || !countryCounts.has(name) || !filtering || checked.has(name);
    feature.properties.path.classList.toggle("is-excluded", Boolean(name && countryCounts.has(name) && filtering && !checked.has(name)));
    feature.properties.path.classList.toggle("is-selected", Boolean(name && countryCounts.has(name) && filtering && included));
  });
  updateLiveStudyCount();
}

function initCountryFilter() {
  buildCountryCounts();
  populateCountrySelect();
  const inferred = document.getElementById("countryInferred");
  if (inferred && inferred.dataset.bound !== "true") {
    inferred.dataset.bound = "true";
    inferred.addEventListener("change", updateLiveStudyCount);
  }
  renderCountryMap();
}

async function renderCountryMap() {
  const svgEl = document.getElementById("countryMap");
  const fallback = document.getElementById("countryMapFallback");
  if (!svgEl || !window.d3 || !window.topojson) return;
  const d3 = window.d3;
  try {
    const topology = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json").then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
    const namesResponse = await fetch("https://cdn.jsdelivr.net/gh/lukes/ISO-3166-Countries-with-Regional-Codes@master/all/all.json");
    const nameRows = namesResponse.ok ? await namesResponse.json() : [];
    const names = new Map(nameRows.map((row) => [String(parseInt(row["country-code"], 10)), canonicalCountry(row.name)]));
    const countries = window.topojson.feature(topology, topology.objects.countries);
    const width = 960;
    const height = 460;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const projection = d3.geoEqualEarth().fitExtent([[10, 8], [width - 10, height - 8]], { type: "Sphere" });
    const path = d3.geoPath(projection);
    svg.append("path").attr("class", "country-map-ocean").attr("d", path({ type: "Sphere" }));
    svg.append("path").attr("class", "country-map-graticule").attr("d", path(d3.geoGraticule10()));
    const maxCount = Math.max(1, ...[...countryCounts.values()].map((country) => country.count));
    const legendMax = document.getElementById("countryLegendMax");
    if (legendMax) legendMax.textContent = String(maxCount);
    countryFeatures = countries.features.map((feature) => {
      const name = names.get(String(parseInt(feature.id, 10))) || "";
      const count = name ? (countryCounts.get(name)?.count || 0) : 0;
      const node = svg.append("path")
        .attr("class", `country-map-country${count ? " has-studies" : ""}`)
        .attr("d", path(feature))
        .attr("fill", countryFill(count, maxCount))
        .attr("data-country", name)
        .attr("role", count ? "button" : null)
        .attr("aria-label", name ? `${name}: ${count} ${count === 1 ? "study" : "studies"}` : null);
      if (count) {
        node.on("click", () => {
          const box = menuOptionInputs("countryMenu").find((input) => input.value === name);
          if (!box) return;
          box.checked = !box.checked;
          box.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }
      return { ...feature, properties: { canonical: name, path: node.node() } };
    });
    if (fallback) fallback.hidden = true;
    updateCountrySelection();
  } catch (error) {
    console.error("Error loading world map:", error);
    if (fallback) fallback.hidden = false;
  }
}

function studyPublicationYear(study) {
  if (studyYearMissing(study)) return null;
  const year = typeof study.year === "number" ? study.year : parseInt(study.year, 10);
  return Number.isNaN(year) ? null : year;
}

function hideBeeswarmTooltip() {
  const tip = document.getElementById("beeswarmTooltip");
  if (!tip) return;
  tip.hidden = true;
  tip.textContent = "";
}

function placeBeeswarmTooltip(event, text) {
  const tip = document.getElementById("beeswarmTooltip");
  const panel = document.getElementById("beeswarmPanel");
  if (!tip || !panel) return;
  const bounds = panel.getBoundingClientRect();
  tip.textContent = text;
  tip.hidden = false;
  let x = event.clientX - bounds.left + 14;
  let y = event.clientY - bounds.top + 14;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
  const tipBox = tip.getBoundingClientRect();
  if (tipBox.right > bounds.right - 6) tip.style.left = `${event.clientX - bounds.left - tipBox.width - 14}px`;
  if (tipBox.bottom > window.innerHeight - 8) tip.style.top = `${Math.max(4, event.clientY - bounds.top - tipBox.height - 12)}px`;
}

function renderYearBeeswarm(results) {
  const svgEl = document.getElementById("yearBeeswarm");
  const note = document.getElementById("yearBeeswarmNote");
  if (!svgEl || !window.d3) return;
  const source = hasSearched ? (results || []) : allStudies;
  const plotted = [];
  let missingYear = 0;
  source.forEach((study) => {
    const year = studyPublicationYear(study);
    if (year == null) {
      missingYear += 1;
      return;
    }
    plotted.push({ year, authors: (study.authors || "Unknown authors").trim() || "Unknown authors" });
  });
  const d3 = window.d3;
  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();
  hideBeeswarmTooltip();
  const width = 960;
  const height = 300;
  const margin = { top: 24, right: 28, bottom: 40, left: 28 };
  svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const yearMin = yearBounds.min ?? d3.min(plotted, (d) => d.year);
  const yearMax = yearBounds.max ?? d3.max(plotted, (d) => d.year);
  if (!plotted.length || yearMin == null || yearMax == null) {
    if (note) {
      note.hidden = false;
      note.textContent = hasSearched
        ? "No studies with a publication year match the current search."
        : "No studies with a publication year are available.";
    }
    return;
  }
  const x = d3.scaleLinear().domain([yearMin, yearMax]).range([margin.left, width - margin.right]);
  const radius = 6.5;
  const nodes = plotted.map((point) => ({ ...point, x: x(point.year), y: (margin.top + height - margin.bottom) / 2 }));
  const simulation = d3.forceSimulation(nodes)
    .force("x", d3.forceX((d) => x(d.year)).strength(1))
    .force("y", d3.forceY((margin.top + height - margin.bottom) / 2).strength(0.12))
    .force("collide", d3.forceCollide(radius + 1.4))
    .stop();
  for (let tick = 0; tick < 160; tick += 1) simulation.tick();
  const yMin = margin.top + radius;
  const yMax = height - margin.bottom - radius;
  nodes.forEach((node) => { node.y = Math.max(yMin, Math.min(yMax, node.y)); });
  const span = Math.max(1, yearMax - yearMin);
  const step = span > 30 ? 5 : span > 16 ? 2 : 1;
  const tickValues = [];
  for (let year = yearMin; year <= yearMax; year += 1) {
    if (year === yearMin || year === yearMax || year % step === 0) tickValues.push(year);
  }
  svg.append("g")
    .attr("class", "year-beeswarm-axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(d3.format("d")));
  svg.selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("class", "year-beeswarm-dot")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", radius)
    .attr("tabindex", "0")
    .attr("role", "img")
    .attr("aria-label", (d) => `${d.authors} (${d.year})`)
    .on("mouseenter", function onEnter(event, d) {
      d3.select(this).classed("is-active", true).attr("r", radius + 2);
      placeBeeswarmTooltip(event, `${d.authors} (${d.year})`);
    })
    .on("mousemove", (event, d) => placeBeeswarmTooltip(event, `${d.authors} (${d.year})`))
    .on("mouseleave", function onLeave() {
      d3.select(this).classed("is-active", false).attr("r", radius);
      hideBeeswarmTooltip();
    });
  if (note) {
    if (missingYear > 0) {
      const studyWord = missingYear === 1 ? "study" : "studies";
      const verb = missingYear === 1 ? "is" : "are";
      note.hidden = false;
      note.textContent = `Note: ${missingYear} ${studyWord} with unclear publication year ${verb} omitted.`;
    } else {
      note.hidden = true;
      note.textContent = "";
    }
  }
}

function showEvidenceView(view) {
  const views = ["map", "beeswarm"];
  const panels = { map: "mapPanel", beeswarm: "beeswarmPanel" };
  const tabs = { map: "mapTab", beeswarm: "beeswarmTab" };
  if (!views.includes(view)) return;
  views.forEach((name) => {
    const panel = document.getElementById(panels[name]);
    const tab = document.getElementById(tabs[name]);
    const active = name === view;
    if (panel) panel.hidden = !active;
    if (tab) {
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    }
  });
  if (view !== "beeswarm") hideBeeswarmTooltip();
}

function initEvidenceViews() {
  const mapTab = document.getElementById("mapTab");
  const beeswarmTab = document.getElementById("beeswarmTab");
  if (!mapTab || !beeswarmTab) return;
  const tabs = [
    { button: mapTab, view: "map" },
    { button: beeswarmTab, view: "beeswarm" },
  ];
  tabs.forEach((tab) => tab.button.addEventListener("click", () => showEvidenceView(tab.view)));
  mapTab.parentElement.addEventListener("keydown", (event) => {
    const current = tabs.findIndex((tab) => tab.button.classList.contains("is-active"));
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight"
      ? (current + 1) % tabs.length
      : (current - 1 + tabs.length) % tabs.length;
    showEvidenceView(tabs[next].view);
    tabs[next].button.focus();
  });
}

function initFilterAccordion() {
  document.querySelectorAll(".filter-accordion-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", willOpen ? "true" : "false");
      button.classList.toggle("is-open", willOpen);
      if (panel) panel.hidden = !willOpen;
    });
  });
  const applyButton = document.getElementById("applyFiltersBtn");
  if (applyButton) applyButton.addEventListener("click", () => runSearch({ fromFilters: true }));
}

function isYearFilterActive() {
  const { min, max } = getSelectedYearRange();
  const narrowed = min !== defaultYearRange.min || max !== defaultYearRange.max;
  const missingOff = isNotReportedOptionVisible("yearNotReported") && !isNotReportedIncluded("yearNotReported");
  return narrowed || missingOff;
}

function filterStudies(studies) {
  let results = studies;
  if (isYearFilterActive()) {
    const { min, max } = getSelectedYearRange();
    results = results.filter((study) => matchesYear(study, min, max));
  }
  if (isSampleSizeFilterActive()) {
    const { min, max } = getSelectedSampleRange();
    results = results.filter((study) => matchesSampleSize(study, min, max));
  }
  if (isCountryFilterActive()) results = results.filter((study) => matchesCountry(study));
  CATEGORICAL_FILTERS.forEach((filter) => {
    if (!isCategoricalFilterActive(filter.menuId, filter.notReportedId, filter.includeUnclearId)) return;
    results = results.filter((study) => matchesCategorical(study, filter.field, filter.menuId, filter.notReportedId, filter.includeUnclearId));
  });
  return results;
}

function setResultMessage(message) {
  const countEl = document.getElementById("resultCount");
  if (!countEl) return;
  const text = message || "";
  countEl.textContent = text;
  countEl.hidden = !text;
}

function updateLiveStudyCount() {
  setResultMessage("");
}

function bindLiveStudyCount() {
  const queryBox = document.getElementById("queryBox");
  if (queryBox) queryBox.addEventListener("input", updateLiveStudyCount);
  const rail = document.querySelector(".evidence-filter-rail");
  if (!rail) return;
  rail.addEventListener("input", updateLiveStudyCount);
  rail.addEventListener("change", updateLiveStudyCount);
}

function renderResults(results) {
  const resultsDiv = document.getElementById("searchResults");
  updateLiveStudyCount();
  const visible = hasSearched ? results : allStudies;
  if (!visible.length) {
    resultsDiv.innerHTML = "";
    updateSearchResultsDropdown([]);
    updateReportButton([]);
    renderYearBeeswarm(hasSearched ? [] : allStudies);
    return;
  }
  resultsDiv.innerHTML =
    visible.map((study) => createStudyHTML(study, lastHighlightTerms)).join("") +
    '<div class="evidence-results-footer-stripe" aria-hidden="true"></div>';
  updateSearchResultsDropdown(visible);
  updateReportButton(visible);
  renderYearBeeswarm(hasSearched ? visible : allStudies);
}

function runSearch(options) {
  const fromFilters = Boolean(options && options.fromFilters);
  const query = document.getElementById("queryBox").value.trim();
  const clearBtn = document.getElementById("clearFilters");
  hasSearched = Boolean(query || filtersAreActive() || fromFilters);
  clearBtn.style.display = hasSearched ? "inline-block" : "none";
  let results = filterStudies(allStudies);
  if (query) {
    lastHighlightTerms = extractHighlightTerms(query);
    try {
      const ast = parseQuery(query);
      if (ast) results = results.filter((study) => evaluateNode(ast, study, bibliographicColumns()));
    } catch (error) {
      lastSearchResults = [];
      lastSearchQuery = query;
      setResultMessage("Invalid search query.");
      document.getElementById("searchResults").innerHTML = "";
      updateSearchResultsDropdown([]);
      updateReportButton([]);
      renderYearBeeswarm([]);
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

function filtersAreActive() {
  return isYearFilterActive()
    || isSampleSizeFilterActive()
    || isCountryFilterActive()
    || CATEGORICAL_FILTERS.some((filter) => isCategoricalFilterActive(filter.menuId, filter.notReportedId, filter.includeUnclearId));
}

function clearFilters() {
  document.getElementById("queryInput").value = "";
  document.getElementById("queryBox").value = "";
  document.getElementById("columnSelect").value = "__all__";
  if (defaultYearRange.min != null) setYearRange(defaultYearRange.min, defaultYearRange.max);
  if (defaultSampleRange.min != null) setSampleRange(defaultSampleRange.min, defaultSampleRange.max);
  [
    "yearNotReported",
    "sampleNotReported",
    "countryNotReported",
    "countryInferred",
    "interventionNotReported",
    "interventionUnclear",
    "controlNotReported",
    "deliveryNotReported",
    "settingNotReported",
    "ageGroupNotReported",
    "vulnerableNotReported",
    "outcomesNotReported",
  ].forEach((id) => {
    const box = document.getElementById(id);
    if (box) box.checked = true;
  });
  ["interventionMenu", "controlMenu", "deliveryMenu", "settingMenu", "ageGroupMenu", "countryMenu", "vulnerableMenu", "outcomesMenu"].forEach(resetCheckMenu);
  updateCountrySelection();
  lastHighlightTerms = [];
  lastSearchResults = [];
  lastSearchQuery = "";
  lastSearchYearRange = null;
  hasSearched = false;
  document.getElementById("clearFilters").style.display = "none";
  renderResults([]);
}

function initEvidenceSearch() {
  initEvidenceViews();
  initFilterAccordion();
  bindLiveStudyCount();
  document.getElementById("searchBtn").addEventListener("click", () => runSearch());
  document.getElementById("clearFilters").addEventListener("click", clearFilters);
  document.getElementById("downloadReportPdfBtn").addEventListener("click", downloadReportPdf);
  document.getElementById("downloadReportCsvBtn").addEventListener("click", downloadReportCsv);

  document.querySelectorAll(".add-query-option").forEach((button) => {
    button.addEventListener("click", () => addTermToQueryBox(button.dataset.operator));
  });

  document.getElementById("clearTermInput").addEventListener("click", () => {
    document.getElementById("queryInput").value = "";
    document.getElementById("queryInput").focus();
  });

  document.getElementById("clearQueryBox").addEventListener("click", () => {
    document.getElementById("queryBox").value = "";
    document.getElementById("queryBox").focus();
    updateLiveStudyCount();
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
      syncNotReportedOptions();
      initYearSlider();
      initSampleSlider();
      initCategoricalFilters();
      initCountryFilter();
      renderResults(allStudies);
    })
    .catch((error) => {
      console.error("Error loading studies:", error);
      setResultMessage("Could not load study database.");
    });
}

document.addEventListener("DOMContentLoaded", initEvidenceSearch);
