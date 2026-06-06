const STORAGE_KEY = "svgTripTodayV1";
const CHECK_KEY = "svgTripChecksV1";
const PHOTO_BOX_URL = "https://drive.google.com/drive/folders/1KYD_44wOEdmn48rLzYyVFDK9enNutFYU";
const AI_VOICE_ENDPOINT = "https://inconceivable-ai-voice.rossspry.workers.dev/";
const FAMILY_PAGE_URL = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, "")}family.html`;

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const quickCards = document.querySelector(".quick-cards");
const todayForm = document.getElementById("todayForm");
const statusSummary = document.getElementById("statusSummary");
const resetToday = document.getElementById("resetToday");
const generateBroadcast = document.getElementById("generateBroadcast");
const copyBroadcast = document.getElementById("copyBroadcast");
const broadcastOutput = document.getElementById("broadcastOutput");

function hideAisTrackerSections() {
  document.querySelectorAll('a[href="#tracker"]').forEach((link) => {
    const card = link.closest(".quick-card");
    if (card) card.remove();
    else link.remove();
  });
  const tracker = document.getElementById("tracker");
  if (tracker) tracker.remove();
}

if (quickCards) {
  quickCards.innerHTML = `
    <a class="quick-card" href="#today"><span>🧭</span><strong>Today</strong><small>Daily plan location weather dinner and notes</small></a>
    <a class="quick-card" href="${PHOTO_BOX_URL}" target="_blank" rel="noreferrer"><span>📸</span><strong>Photo Box</strong><small>Upload trip photos and videos to Google Drive</small></a>
    <a class="quick-card" href="family.html"><span>🌅</span><strong>Family Snapshot</strong><small>Read-only update page for friends and family</small></a>
    <a class="quick-card" href="#route"><span>🗺️</span><strong>Route</strong><small>Planned stops and daily schedule</small></a>
    <a class="quick-card" href="#checklists"><span>✅</span><strong>Checklists</strong><small>Morning underway anchoring evening dinghy snorkel</small></a>
    <a class="quick-card" href="#captain"><span>🎙️</span><strong>Captain Update</strong><small>Generate an AI captain MP3</small></a>
  `;
}

if (navLinks) {
  navLinks.innerHTML = `
    <a href="#today">Today</a>
    <a href="${PHOTO_BOX_URL}" target="_blank" rel="noreferrer">Photo Box</a>
    <a href="family.html">Family Snapshot</a>
    <a href="#route">Route</a>
    <a href="#checklists">Checklists</a>
    <a href="#captain">Captain Update</a>
  `;
}

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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textOrFallback(value, fallback = "Not set yet") {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function loadLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formToData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function loadJsonFile(path, fallback = null) {
  try {
    const response = await fetch(`${path}?cacheBust=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} not found`);
    return await response.json();
  } catch (error) {
    console.warn(`Could not load ${path}`, error);
    return fallback;
  }
}

function isoFromTripDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function getItineraryEntry(itinerary, tripData) {
  if (!Array.isArray(itinerary) || !itinerary.length) return null;
  const fromTripData = isoFromTripDate(tripData?.date);
  const todayIso = new Date().toISOString().slice(0, 10);
  return itinerary.find((item) => item.date === fromTripData) || itinerary.find((item) => item.date === todayIso) || itinerary[0];
}

function sharedToTodayData(data, itineraryEntry) {
  if (!data && !itineraryEntry) return {};
  return {
    date: data?.date || itineraryEntry?.date || "",
    location: data?.locationName || itineraryEntry?.plannedLocation || "",
    tonight: data?.tonight || itineraryEntry?.plannedOvernight || "",
    tomorrow: data?.tomorrow || itineraryEntry?.nextDestination || "",
    weather: data?.weather || "",
    dinner: data?.dinner || "",
    activities: data?.activities || itineraryEntry?.plannedActivity || "",
    fun: data?.funnyNote || "",
    route: data?.route || itineraryEntry?.route || "",
    wind: data?.wind || "",
    safety: data?.safety || "",
    itineraryNote: itineraryEntry?.captainNote || ""
  };
}

function fillForm(data) {
  if (!todayForm) return;
  for (const [key, value] of Object.entries(data || {})) {
    const field = todayForm.elements[key];
    if (field && !field.value) field.value = value || "";
  }
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

function addFamilySharePanel() {
  const main = document.querySelector("main");
  const firstPanel = document.getElementById("today");
  if (!main || !firstPanel || document.getElementById("family-share-panel")) return;

  const section = document.createElement("section");
  section.className = "panel";
  section.id = "family-share-panel";
  section.innerHTML = `
    <div class="section-heading">
      <p class="eyebrow">Share with family</p>
      <h2>Family snapshot page</h2>
      <p>Send this link to anyone who wants the public trip snapshot without editing anything.</p>
    </div>
    <div class="copy-row">
      <a class="button secondary" href="${FAMILY_PAGE_URL}" target="_blank" rel="noreferrer">Open Family Page</a>
      <input class="share-link-input" type="text" value="${FAMILY_PAGE_URL}" readonly aria-label="Family page link" />
      <button class="button primary" type="button" id="copyFamilyLink">Copy Link</button>
    </div>
  `;

  main.insertBefore(section, firstPanel);
  const copyButton = section.querySelector("#copyFamilyLink");
  const linkInput = section.querySelector(".share-link-input");
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(FAMILY_PAGE_URL);
      flashButton(copyButton, "Copied");
    } catch {
      linkInput.select();
      flashButton(copyButton, "Select + copy");
    }
  });
}
addFamilySharePanel();

function addDashboardMap(data) {
  const main = document.querySelector("main");
  const todayPanel = document.getElementById("today");
  if (!main || !todayPanel || document.getElementById("live-map")) return;

  const lat = typeof data?.latitude === "number" ? data.latitude : 13.16;
  const lon = typeof data?.longitude === "number" ? data.longitude : -61.2248;
  const zoom = data?.mapZoom || 11;
  const delta = zoom >= 11 ? 0.08 : 0.35;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;

  const section = document.createElement("section");
  section.className = "panel tracker-panel";
  section.id = "live-map";
  section.innerHTML = `
    <div class="section-heading">
      <p class="eyebrow">Trip map</p>
      <h2>Map and current status</h2>
      <p>${escapeHtml(data?.lastUpdated || "Manual crew updates will appear here after publishing.")}</p>
    </div>
    <div class="tracker-layout">
      <article class="tracker-card">
        <h3>${escapeHtml(data?.locationName || "St. Vincent and the Grenadines")}</h3>
        <p><strong>Weather:</strong> ${escapeHtml(data?.weather || "Waiting on the daily crew update.")}</p>
        <p><strong>Tonight:</strong> ${escapeHtml(data?.tonight || "Not set yet")}</p>
        <p><strong>Tomorrow:</strong> ${escapeHtml(data?.tomorrow || "Not set yet")}</p>
        <p><strong>Dinner:</strong> ${escapeHtml(data?.dinner || "Not set yet")}</p>
        <p class="tracker-note"><strong>Status:</strong> Manual crew updates are active for this trip. The family page uses the latest published daily update.</p>
      </article>
      <div class="tracker-card map-card">
        <iframe title="Inconceivable current map" src="${mapUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>
    </div>
  `;
  main.insertBefore(section, todayPanel);
}

function generateCaptainScript(data) {
  const date = textOrFallback(data.date, "today");
  const location = textOrFallback(data.location, "our current position");
  const route = textOrFallback(data.route, "the day’s sailing plan");
  const tonight = textOrFallback(data.tonight, "tonight’s anchorage");
  const tomorrow = textOrFallback(data.tomorrow, "tomorrow’s planned destination");
  const weather = textOrFallback(data.weather, "warm Caribbean conditions with the latest weather still to be confirmed");
  const wind = textOrFallback(data.wind, "manageable wind and sea state for the plan");
  const dinner = textOrFallback(data.dinner, "a fine shipboard dinner from our heroic galley crew");
  const activities = textOrFallback(data.activities, "swimming snorkeling relaxing and enjoying this ridiculous level of paradise");
  const safety = textOrFallback(data.safety, "hydrate stay clipped into common sense and nobody becomes a dinghy rescue story");
  const fun = textOrFallback(data.fun, "morale remains high and the captain has declared all snacks tax deductible under maritime law");
  const itineraryNote = data.itineraryNote ? `\n\nItinerary note: ${data.itineraryNote}.` : "";

  return `Crew of Inconceivable, this is your Captain’s Noon Update for ${date}.

We are currently at ${location}. Today’s working plan is ${route}. The weather picture is ${weather}, with wind and sea state reported as ${wind}.

This afternoon, the plan is ${activities}. Tonight we are aiming for ${tonight}. Tomorrow’s planned destination is ${tomorrow}, weather and crew comfort permitting.${itineraryNote}

Dinner is scheduled as ${dinner}.

Safety note from the bridge: ${safety}.

And now, for official crew morale: ${fun}.

This has been your Captain’s Noon Update. Stay salty, stay hydrated, respect the reef, secure the dinghy, and remember: aboard Inconceivable, we do not merely vacation. We conduct elegant maritime operations with snacks.`;
}

function currentAnnouncementText() {
  const text = broadcastOutput?.innerText?.trim() || "";
  if (text && !text.includes("Your generated script will appear here")) return text;
  if (!todayForm || !broadcastOutput) return "";
  const data = formToData(todayForm);
  saveLocal(STORAGE_KEY, data);
  updateSummary(data);
  const script = generateCaptainScript(data);
  broadcastOutput.innerHTML = `<h3>Captain’s Noon Update</h3><p>${escapeHtml(script)}</p>`;
  return broadcastOutput.innerText.trim();
}

async function generateAiAudio(text, button, note) {
  button.disabled = true;
  button.textContent = "Generating MP3…";
  note.textContent = "Sending the Captain’s Update to the AI voice worker.";

  try {
    const response = await fetch(AI_VOICE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "cedar" })
    });

    if (!response.ok) {
      let message = "AI voice worker failed.";
      try {
        const error = await response.json();
        message = error.error || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.controls = true;
    audio.autoplay = true;
    audio.className = "captain-audio-player";

    const oldPlayer = document.querySelector(".captain-audio-player");
    if (oldPlayer) oldPlayer.remove();
    note.insertAdjacentElement("afterend", audio);
    note.textContent = "AI voice MP3 generated. Playing now.";
    audio.addEventListener("ended", () => {
      button.textContent = "Generate AI Voice MP3";
      button.disabled = false;
    });
  } catch (error) {
    note.textContent = `AI voice failed: ${error.message}`;
    button.textContent = "Generate AI Voice MP3";
    button.disabled = false;
  }
}

function addAiVoiceButton() {
  if (!copyBroadcast || document.getElementById("aiVoiceBroadcast")) return;
  const button = document.createElement("button");
  button.className = "button primary";
  button.id = "aiVoiceBroadcast";
  button.type = "button";
  button.textContent = "Generate AI Voice MP3";
  copyBroadcast.insertAdjacentElement("afterend", button);

  const note = document.createElement("p");
  note.className = "tiny";
  note.id = "voiceStatus";
  note.textContent = "Ready to generate a real AI voice MP3.";
  button.insertAdjacentElement("afterend", note);

  button.addEventListener("click", async () => {
    const text = currentAnnouncementText();
    if (!text) return;
    await generateAiAudio(text, button, note);
  });
}

function renderChecklists() {
  const checklistSection = document.getElementById("checklists");
  const board = checklistSection?.querySelector(".checklist-board");
  const description = checklistSection?.querySelector(".section-heading p:last-child");
  if (description) {
    description.textContent = "Expanded working checklists for daily catamaran operations. Checks save on this device so each crew tablet or phone can track its own progress.";
  }
  if (!board) return;

  const checklistGroups = [
    ["Morning pre-sail", ["Weather wind squalls radar and sea state checked", "Route hazards alternates bail-out anchorages reviewed", "Crew briefing completed", "Engines fluids belts strainers bilges visually checked", "Batteries solar shore power inverter status checked", "Water tanks fuel levels holding tank plan checked", "Hatches ports lockers fridge freezer and galley secured"]],
    ["Underway / departure", ["Dinghy lifted or secured for the leg", "Dock mooring anchor lines clear and safely handled", "Chartplotter route depth alarms and instruments checked", "VHF on correct channel volume set handheld charged", "Crew seated and briefed before maneuvering", "Reefing plan discussed before sails are raised", "Departure time engine hours and weather noted"]],
    ["Anchoring / mooring arrival", ["Bottom depth swing room current and lee protection assessed", "Anchor set or mooring inspected", "Scope snubber bridle set for conditions", "Visual bearings or range marks identified", "Anchor alarm set", "Reef swim zones park rules no-anchor areas confirmed", "Crew knows swim dinghy and shore plan"]],
    ["Evening secure boat", ["Anchor or mooring rechecked", "Anchor light on and visible", "Dinghy locked tied lifted or secured", "Galley propane trash food and dishes secured", "Hatches ports cockpit cushions and loose gear secured", "Batteries charging phones radios lights and water usage checked", "Tomorrow weather route breakfast and departure time discussed"]],
    ["Dinghy / shore run", ["Fuel oars pump kill cord light and painter checked", "Phone or VHF in dry bag", "Lifejackets or flotation plan appropriate", "Landing spot surf rocks tide and return plan discussed", "Lock cable or security plan used ashore", "Headcount before leaving and before returning"]],
    ["Snorkel / swim", ["Current boat traffic reef conditions and exit point checked", "Buddy pairs assigned", "Dive flag or visible float used if appropriate", "Sunscreen rash guards water and time limit handled", "Reef rule briefed", "Final headcount and gear count complete"]]
  ];

  board.innerHTML = checklistGroups.map(([title, items], groupIndex) => `
    <article>
      <h3>${escapeHtml(title)}</h3>
      ${items.map((label, itemIndex) => `<label><input type="checkbox" data-check="g${groupIndex}-${itemIndex}" /> ${escapeHtml(label)}</label>`).join("")}
    </article>
  `).join("");

  const savedChecks = loadLocal(CHECK_KEY);
  board.querySelectorAll("input[data-check]").forEach((box) => {
    box.checked = Boolean(savedChecks[box.dataset.check]);
    box.addEventListener("change", () => {
      const current = loadLocal(CHECK_KEY);
      current[box.dataset.check] = box.checked;
      saveLocal(CHECK_KEY, current);
    });
  });
}
renderChecklists();

Promise.all([
  loadJsonFile("manual-status.json", null),
  loadJsonFile("itinerary.json", [])
]).then(([shared, itinerary]) => {
  const itineraryEntry = getItineraryEntry(itinerary, shared);
  const sharedToday = sharedToTodayData(shared, itineraryEntry);

  if (todayForm) {
    const saved = loadLocal(STORAGE_KEY);
    const savedHasValues = Object.values(saved).some((value) => value && String(value).trim());
    const startingData = savedHasValues ? { ...sharedToday, ...saved } : sharedToday;
    fillForm(startingData);
    updateSummary(startingData);
  }

  addDashboardMap(shared);
  hideAisTrackerSections();
});

if (todayForm) {
  todayForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formToData(todayForm);
    saveLocal(STORAGE_KEY, data);
    updateSummary(data);
    flashButton(todayForm.querySelector("button[type='submit']"), "Saved");
  });

  todayForm.addEventListener("input", () => updateSummary(formToData(todayForm)));
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
    saveLocal(STORAGE_KEY, data);
    updateSummary(data);
    const script = generateCaptainScript(data);
    broadcastOutput.innerHTML = `<h3>Captain’s Noon Update</h3><p>${escapeHtml(script)}</p>`;
  });
}

if (copyBroadcast && broadcastOutput) {
  copyBroadcast.addEventListener("click", async () => {
    const text = currentAnnouncementText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flashButton(copyBroadcast, "Copied");
    } catch {
      flashButton(copyBroadcast, "Select text manually");
    }
  });
}
addAiVoiceButton();
hideAisTrackerSections();

function flashButton(button, text) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, 1300);
}
