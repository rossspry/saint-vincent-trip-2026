const STORAGE_KEY = "svgTripTodayV1";
const CHECK_KEY = "svgTripChecksV1";

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target.tagName === "A") {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const todayForm = document.getElementById("todayForm");
const statusSummary = document.getElementById("statusSummary");
const resetToday = document.getElementById("resetToday");
const generateBroadcast = document.getElementById("generateBroadcast");
const copyBroadcast = document.getElementById("copyBroadcast");
const broadcastOutput = document.getElementById("broadcastOutput");

function formToData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function getTodayData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveTodayData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function fillForm(data) {
  if (!todayForm) return;
  for (const [key, value] of Object.entries(data)) {
    const field = todayForm.elements[key];
    if (field) field.value = value;
  }
}

function textOrFallback(value, fallback = "Not set yet") {
  return value && value.trim() ? value.trim() : fallback;
}

function updateSummary(data) {
  if (!statusSummary) return;
  statusSummary.innerHTML = `
    <div><dt>Location</dt><dd>${escapeHtml(textOrFallback(data.location))}</dd></div>
    <div><dt>Tonight</dt><dd>${escapeHtml(textOrFallback(data.tonight))}</dd></div>
    <div><dt>Tomorrow</dt><dd>${escapeHtml(textOrFallback(data.tomorrow))}</dd></div>
    <div><dt>Weather</dt><dd>${escapeHtml(textOrFallback(data.weather))}</dd></div>
    <div><dt>Dinner</dt><dd>${escapeHtml(textOrFallback(data.dinner))}</dd></div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function generateCaptainScript(data) {
  const date = textOrFallback(data.date, "today");
  const location = textOrFallback(data.location, "our current anchorage");
  const route = textOrFallback(data.route, "the day’s sailing plan");
  const tonight = textOrFallback(data.tonight, "tonight’s anchorage");
  const tomorrow = textOrFallback(data.tomorrow, "tomorrow’s next stop");
  const weather = textOrFallback(data.weather, "warm Caribbean conditions with the latest weather still to be confirmed");
  const wind = textOrFallback(data.wind, "manageable wind and sea state for the plan");
  const dinner = textOrFallback(data.dinner, "a fine shipboard dinner from our heroic galley crew");
  const activities = textOrFallback(data.activities, "swimming snorkeling relaxing and enjoying this ridiculous level of paradise");
  const safety = textOrFallback(data.safety, "hydrate stay clipped into common sense and nobody becomes a dinghy rescue story");
  const fun = textOrFallback(data.fun, "morale remains high and the captain has declared all snacks tax deductible under maritime law");

  return `Buongiorno crew of Inconceivable. This is your Captain’s Noon Update for ${date}.

We are currently at ${location}. Today’s working plan is ${route}. The weather picture is ${weather}, with wind and sea state reported as ${wind}.

This afternoon, the plan is ${activities}. Tonight we are aiming for ${tonight}, and dinner is scheduled as ${dinner}. Tomorrow’s planned destination or operating area is ${tomorrow}.

Safety note from the bridge: ${safety}.

And now, for official crew morale: ${fun}.

This has been your Captain’s Noon Update. Stay salty, stay hydrated, respect the reef, secure the dinghy, and remember: aboard Inconceivable, we do not merely vacation. We conduct elegant maritime operations with snacks.`;
}

if (todayForm) {
  const saved = getTodayData();
  fillForm(saved);
  updateSummary(saved);

  todayForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formToData(todayForm);
    saveTodayData(data);
    updateSummary(data);
    flashButton(todayForm.querySelector("button[type='submit']"), "Saved");
  });

  todayForm.addEventListener("input", () => {
    updateSummary(formToData(todayForm));
  });
}

if (resetToday && todayForm) {
  resetToday.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    todayForm.reset();
    updateSummary({});
    if (broadcastOutput) {
      broadcastOutput.innerHTML = `<h3>Captain’s Noon Update</h3><p class="muted">Your generated script will appear here.</p>`;
    }
  });
}

if (generateBroadcast && todayForm && broadcastOutput) {
  generateBroadcast.addEventListener("click", () => {
    const data = formToData(todayForm);
    saveTodayData(data);
    updateSummary(data);
    const script = generateCaptainScript(data);
    broadcastOutput.innerHTML = `<h3>Captain’s Noon Update</h3><p>${escapeHtml(script)}</p>`;
  });
}

if (copyBroadcast && broadcastOutput) {
  copyBroadcast.addEventListener("click", async () => {
    const text = broadcastOutput.innerText.trim();
    if (!text || text.includes("Your generated script will appear here")) return;
    try {
      await navigator.clipboard.writeText(text);
      flashButton(copyBroadcast, "Copied");
    } catch {
      flashButton(copyBroadcast, "Select text manually");
    }
  });
}

function flashButton(button, text) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, 1300);
}

function loadChecks() {
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY)) || {};
  } catch {
    return {};
  }
}

function saveChecks(checks) {
  localStorage.setItem(CHECK_KEY, JSON.stringify(checks));
}

const checkboxes = document.querySelectorAll("input[data-check]");
const savedChecks = loadChecks();
checkboxes.forEach((box) => {
  box.checked = Boolean(savedChecks[box.dataset.check]);
  box.addEventListener("change", () => {
    const current = loadChecks();
    current[box.dataset.check] = box.checked;
    saveChecks(current);
  });
});
