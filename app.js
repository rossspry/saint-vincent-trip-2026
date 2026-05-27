const STORAGE_KEY = "svgTripTodayV1";
const CHECK_KEY = "svgTripChecksV1";
const PHOTO_BOX_URL = "https://drive.google.com/drive/folders/1KYD_44wOEdmn48rLzYyVFDK9enNutFYU";
const AI_VOICE_ENDPOINT = ""; // Paste your deployed Cloudflare Worker URL here after setup.

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

const quickCards = document.querySelector(".quick-cards");
if (quickCards) {
  quickCards.innerHTML = `
    <a class="quick-card" href="#today"><span>🧭</span><strong>Today</strong><small>Daily plan location weather dinner and notes</small></a>
    <a class="quick-card" href="${PHOTO_BOX_URL}" target="_blank" rel="noreferrer"><span>📸</span><strong>Photo Box</strong><small>Upload trip photos and videos to Google Drive</small></a>
    <a class="quick-card" href="family.html"><span>🌅</span><strong>Family Snapshot</strong><small>Read-only update page for friends and family</small></a>
    <a class="quick-card" href="#tracker"><span>📍</span><strong>AIS Tracker</strong><small>MarineTraffic MMSI 368392220</small></a>
    <a class="quick-card" href="#route"><span>🗺️</span><strong>Route</strong><small>Planned legs ports and navigation overview</small></a>
    <a class="quick-card" href="#checklists"><span>✅</span><strong>Checklists</strong><small>Morning underway anchoring evening dinghy snorkel</small></a>
    <a class="quick-card" href="#captain"><span>🎙️</span><strong>Captain Update</strong><small>Generate an AI captain MP3</small></a>
  `;
}

if (navLinks) {
  navLinks.innerHTML = `
    <a href="#today">Today</a>
    <a href="${PHOTO_BOX_URL}" target="_blank" rel="noreferrer">Photo Box</a>
    <a href="family.html">Family Snapshot</a>
    <a href="#tracker">AIS Tracker</a>
    <a href="#route">Route</a>
    <a href="#checklists">Checklists</a>
    <a href="#captain">Captain Update</a>
  `;
}

function expandChecklists() {
  const checklistSection = document.getElementById("checklists");
  const board = checklistSection?.querySelector(".checklist-board");
  const description = checklistSection?.querySelector(".section-heading p:last-child");
  if (description) {
    description.textContent = "Expanded working checklists for daily catamaran operations. Checks save on this device so each crew tablet or phone can track its own progress.";
  }
  if (!board) return;
  board.innerHTML = `
    <article>
      <h3>Morning pre-sail</h3>
      <label><input type="checkbox" data-check="morning-weather" /> Weather wind squalls radar and sea state checked</label>
      <label><input type="checkbox" data-check="morning-route" /> Route hazards alternates bail-out anchorages reviewed</label>
      <label><input type="checkbox" data-check="morning-brief" /> Crew briefing completed: plan roles timing safety</label>
      <label><input type="checkbox" data-check="morning-engine" /> Engines fluids belts strainers bilges visually checked</label>
      <label><input type="checkbox" data-check="morning-power" /> Batteries solar shore power inverter status checked</label>
      <label><input type="checkbox" data-check="morning-water" /> Water tanks fuel levels holding tank plan checked</label>
      <label><input type="checkbox" data-check="morning-hatches" /> Hatches ports lockers fridge/freezer and galley secured</label>
    </article>

    <article>
      <h3>Underway / departure</h3>
      <label><input type="checkbox" data-check="underway-dinghy" /> Dinghy lifted or secured for the leg</label>
      <label><input type="checkbox" data-check="underway-lines" /> Dock/mooring/anchor lines clear and safely handled</label>
      <label><input type="checkbox" data-check="underway-nav" /> Chartplotter route depth alarms and instruments checked</label>
      <label><input type="checkbox" data-check="underway-vhf" /> VHF on correct channel volume set handheld charged</label>
      <label><input type="checkbox" data-check="underway-crew" /> Crew seated/briefed before maneuvering or sail handling</label>
      <label><input type="checkbox" data-check="underway-sails" /> Reefing plan discussed before sails are raised/unfurled</label>
      <label><input type="checkbox" data-check="underway-log" /> Departure time engine hours and weather noted</label>
    </article>

    <article>
      <h3>Anchoring / mooring arrival</h3>
      <label><input type="checkbox" data-check="arrival-bottom" /> Bottom depth swing room current and lee protection assessed</label>
      <label><input type="checkbox" data-check="arrival-anchor" /> Anchor set or mooring inspected before relaxing</label>
      <label><input type="checkbox" data-check="arrival-scope" /> Scope/snubber/bridle set for conditions</label>
      <label><input type="checkbox" data-check="arrival-transits" /> Visual bearings or range marks identified</label>
      <label><input type="checkbox" data-check="arrival-alarm" /> Anchor alarm set on phone/chartplotter</label>
      <label><input type="checkbox" data-check="arrival-clearance" /> Reef swim zones park rules no-anchor areas confirmed</label>
      <label><input type="checkbox" data-check="arrival-brief" /> Crew knows swim dinghy and shore plan</label>
    </article>

    <article>
      <h3>Evening secure boat</h3>
      <label><input type="checkbox" data-check="evening-anchor" /> Anchor/mooring rechecked after settling and wind shift</label>
      <label><input type="checkbox" data-check="evening-light" /> Anchor light on and visible</label>
      <label><input type="checkbox" data-check="evening-dinghy" /> Dinghy locked tied lifted or otherwise secured</label>
      <label><input type="checkbox" data-check="evening-galley" /> Galley propane trash food and dishes secured</label>
      <label><input type="checkbox" data-check="evening-hatches" /> Hatches ports cockpit cushions and loose gear secured</label>
      <label><input type="checkbox" data-check="evening-power" /> Batteries charging phones radios lights and water usage checked</label>
      <label><input type="checkbox" data-check="evening-tomorrow" /> Tomorrow weather route breakfast and departure time discussed</label>
    </article>

    <article>
      <h3>Dinghy / shore run</h3>
      <label><input type="checkbox" data-check="dinghy-fuel" /> Fuel oars pump kill cord light and painter checked</label>
      <label><input type="checkbox" data-check="dinghy-radio" /> Phone/VHF dry bag and emergency contact plan aboard</label>
      <label><input type="checkbox" data-check="dinghy-lifejackets" /> Lifejackets or flotation plan appropriate for passengers</label>
      <label><input type="checkbox" data-check="dinghy-landing" /> Landing spot surf rocks tide and return plan discussed</label>
      <label><input type="checkbox" data-check="dinghy-lock" /> Lock cable or security plan used ashore</label>
      <label><input type="checkbox" data-check="dinghy-count" /> Headcount before leaving and before returning</label>
    </article>

    <article>
      <h3>Snorkel / swim</h3>
      <label><input type="checkbox" data-check="snorkel-current" /> Current boat traffic reef conditions and exit point checked</label>
      <label><input type="checkbox" data-check="snorkel-buddy" /> Buddy pairs assigned and everyone knows boundaries</label>
      <label><input type="checkbox" data-check="snorkel-flag" /> Dive flag / visible float used if appropriate</label>
      <label><input type="checkbox" data-check="snorkel-sun" /> Sunscreen rash guards water and time limit handled</label>
      <label><input type="checkbox" data-check="snorkel-reef" /> Reef rule briefed: do not stand touch chase or collect</label>
      <label><input type="checkbox" data-check="snorkel-count" /> Final headcount and gear count complete</label>
    </article>
  `;
}
expandChecklists();

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

async function loadSharedTripData() {
  try {
    const response = await fetch("trip-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("trip-data.json not found");
    return await response.json();
  } catch (error) {
    console.warn("Could not load trip-data.json", error);
    return null;
  }
}

function sharedToTodayData(data) {
  if (!data) return {};
  return {
    date: data.date || "",
    location: data.locationName || "",
    tonight: data.tonight || "",
    tomorrow: data.tomorrow || "",
    weather: data.weather || "",
    dinner: data.dinner || "",
    activities: data.activities || "",
    fun: data.funnyNote || "",
    route: data.route || "",
    wind: data.wind || "",
    safety: data.safety || ""
  };
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
    if (field && !field.value) field.value = value;
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

function addDashboardMap(data) {
  const main = document.querySelector("main");
  const todayPanel = document.getElementById("today");
  if (!main || !todayPanel || document.getElementById("live-map")) return;

  const lat = typeof data?.latitude === "number" ? data.latitude : 13.16;
  const lon = typeof data?.longitude === "number" ? data.longitude : -61.2248;
  const zoom = data?.mapZoom || 8;
  const delta = zoom >= 11 ? 0.08 : 0.35;
  const left = lon - delta;
  const right = lon + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;

  const section = document.createElement("section");
  section.className = "panel tracker-panel";
  section.id = "live-map";
  section.innerHTML = `
    <div class="section-heading">
      <p class="eyebrow">Live trip snapshot</p>
      <h2>Map and current status</h2>
      <p>${escapeHtml(data?.lastUpdated || "Manual pre-trip placeholder until AIS automation is connected.")}</p>
    </div>
    <div class="tracker-layout">
      <article class="tracker-card">
        <h3>${escapeHtml(data?.locationName || "St. Vincent and the Grenadines")}</h3>
        <p><strong>Vessel:</strong> ${escapeHtml(data?.ais?.vesselName || "Inconceivable")}</p>
        <p><strong>MMSI:</strong> ${escapeHtml(data?.ais?.mmsi || "368392220")}</p>
        <p><strong>Weather:</strong> ${escapeHtml(data?.weather || "Waiting on live weather connection.")}</p>
        <p><strong>Tonight:</strong> ${escapeHtml(data?.tonight || "Not set yet")}</p>
        <p><strong>Tomorrow:</strong> ${escapeHtml(data?.tomorrow || "Not set yet")}</p>
        <p><strong>Dinner:</strong> ${escapeHtml(data?.dinner || "Not set yet")}</p>
        <p class="tracker-note"><strong>Automation note:</strong> This map is fed by trip-data.json now. AIS will update automatically only when an accessible provider sees the vessel.</p>
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

  return `Crew of Inconceivable, this is your Captain’s Noon Update for ${date}.

We are currently at ${location}. Today’s working plan is ${route}. The weather picture is ${weather}, with wind and sea state reported as ${wind}.

This afternoon, the plan is ${activities}. Tonight we are aiming for ${tonight}, and dinner is scheduled as ${dinner}. Tomorrow’s planned destination or operating area is ${tomorrow}.

Safety note from the bridge: ${safety}.

And now, for official crew morale: ${fun}.

This has been your Captain’s Noon Update. Stay salty, stay hydrated, respect the reef, secure the dinghy, and remember: aboard Inconceivable, we do not merely vacation. We conduct elegant maritime operations with snacks.`;
}

function currentAnnouncementText() {
  const text = broadcastOutput?.innerText?.trim() || "";
  if (text && !text.includes("Your generated script will appear here")) return text;
  if (!todayForm || !broadcastOutput) return "";
  const data = formToData(todayForm);
  saveTodayData(data);
  updateSummary(data);
  const script = generateCaptainScript(data);
  broadcastOutput.innerHTML = `<h3>Captain’s Noon Update</h3><p>${escapeHtml(script)}</p>`;
  return broadcastOutput.innerText.trim();
}

async function generateAiAudio(text, button, note) {
  if (!AI_VOICE_ENDPOINT) {
    note.textContent = "AI voice endpoint is not connected yet. Deploy the Cloudflare Worker in voice-worker then paste its URL into AI_VOICE_ENDPOINT in app.js.";
    flashButton(button, "Worker needed");
    return;
  }

  button.disabled = true;
  button.textContent = "Generating MP3…";
  note.textContent = "Sending the Captain’s Update to the AI voice worker.";

  try {
    const response = await fetch(AI_VOICE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: "cedar",
        instructions: "Speak like a warm confident sailing captain making a fun but clear shipboard announcement. Calm Caribbean vacation energy. Natural pacing. No fake accent."
      })
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
  note.textContent = AI_VOICE_ENDPOINT
    ? "Ready to generate a real AI voice MP3."
    : "AI voice Worker not connected yet. Browser robot voice has been removed from this button path.";
  button.insertAdjacentElement("afterend", note);

  button.addEventListener("click", async () => {
    const text = currentAnnouncementText();
    if (!text) return;
    await generateAiAudio(text, button, note);
  });
}

if (todayForm) {
  const saved = getTodayData();
  loadSharedTripData().then((shared) => {
    const sharedToday = sharedToTodayData(shared);
    const startingData = Object.keys(saved).length ? saved : sharedToday;
    fillForm(startingData);
    updateSummary(startingData);
    addDashboardMap(shared);
  });

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
} else {
  loadSharedTripData().then(addDashboardMap);
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
