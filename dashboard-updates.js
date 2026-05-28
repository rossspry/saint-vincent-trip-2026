const STATUS_DRAFT_KEY = "svgTripStatusDraftV1";
const STATUS_SECRET_KEY = "svgTripStatusSecretV1";
const STATUS_WORKER_ENDPOINT = "https://inconceivable-status-update.rossspry.workers.dev/";

function removeRedundantFamilyPanel() {
  const panel = document.getElementById("family-share-panel");
  if (panel) panel.remove();
}

removeRedundantFamilyPanel();
setTimeout(removeRedundantFamilyPanel, 250);

function dashboardEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadStatusDraft() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_DRAFT_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStatusDraft(data) {
  localStorage.setItem(STATUS_DRAFT_KEY, JSON.stringify(data));
}

function mealChoiceText(choice, custom) {
  const customText = String(custom || "").trim();
  if (customText) return customText;
  return String(choice || "Not set yet").trim();
}

function formMealPayload(form) {
  return {
    breakfast: {
      choice: form.breakfastChoice.value,
      custom: form.breakfastCustom.value.trim()
    },
    lunch: {
      choice: form.lunchChoice.value,
      custom: form.lunchCustom.value.trim()
    },
    dinner: {
      choice: form.dinnerChoice.value,
      custom: form.dinnerCustom.value.trim()
    }
  };
}

async function loadCurrentTripDataForDashboard() {
  try {
    const response = await fetch("trip-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("trip-data.json not found");
    return await response.json();
  } catch (error) {
    console.warn("Could not load trip-data.json for manual location editor", error);
    return null;
  }
}

function addDashboardLocationStyles() {
  if (document.getElementById("dashboard-location-style")) return;
  const style = document.createElement("style");
  style.id = "dashboard-location-style";
  style.textContent = `
    #live-map .tracker-layout.large-tracker-layout {
      display: grid;
      grid-template-columns: minmax(280px, .75fr) minmax(420px, 1.35fr);
      gap: 18px;
      align-items: stretch;
    }
    #live-map .map-card iframe.dashboard-large-map {
      width: 100%;
      min-height: clamp(520px, 62vw, 760px);
      border: 0;
      border-radius: 18px;
    }
    .dashboard-manual-location-card {
      margin-top: 18px;
      padding: clamp(16px, 3vw, 24px);
      border: 1px solid rgba(5, 45, 67, .14);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(255,248,234,.96));
      box-shadow: 0 14px 30px rgba(3, 27, 41, .10);
    }
    .dashboard-location-form {
      display: grid;
      gap: 14px;
    }
    .dashboard-location-form label {
      display: grid;
      gap: 7px;
      font-weight: 900;
      color: #052d43;
    }
    .dashboard-location-form input {
      width: 100%;
      border: 1px solid rgba(5, 45, 67, .18);
      border-radius: 16px;
      padding: 13px 14px;
      font: inherit;
      color: #173041;
      background: white;
    }
    .dashboard-location-two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    @media (max-width: 900px) {
      #live-map .tracker-layout.large-tracker-layout,
      .dashboard-location-two-col { grid-template-columns: 1fr; }
      #live-map .map-card iframe.dashboard-large-map { min-height: 460px; }
    }
  `;
  document.head.appendChild(style);
}

function buildDashboardMapUrl(data) {
  const lat = typeof data?.latitude === "number" ? data.latitude : 13.16;
  const lon = typeof data?.longitude === "number" ? data.longitude : -61.2248;
  const zoom = data?.mapZoom || 11;
  const delta = zoom >= 11 ? 0.08 : 0.35;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;
}

async function addManualLocationEditor() {
  const liveMap = document.getElementById("live-map");
  if (!liveMap || document.getElementById("dashboardManualLocationForm")) return false;

  addDashboardLocationStyles();
  let tripData = await loadCurrentTripDataForDashboard();

  const trackerLayout = liveMap.querySelector(".tracker-layout");
  if (trackerLayout) trackerLayout.classList.add("large-tracker-layout");

  const mapFrame = liveMap.querySelector(".map-card iframe");
  if (mapFrame) {
    mapFrame.classList.add("dashboard-large-map");
    mapFrame.src = buildDashboardMapUrl(tripData);
  }

  const editor = document.createElement("div");
  editor.className = "dashboard-manual-location-card";
  editor.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Manual AIS fallback</p>
      <h3>Update current location if AIS is not working</h3>
      <p>Use this from the crew dashboard only. AIS remains the primary source, but this lets you set the fallback map position when AIS is missing or wrong.</p>
    </div>
    <form id="dashboardManualLocationForm" class="dashboard-location-form">
      <label>
        Update password
        <input name="updateSecret" type="password" placeholder="Enter the UPDATE_SECRET from Cloudflare" autocomplete="current-password" required />
      </label>
      <label>
        Current location name
        <input name="locationName" type="text" placeholder="Example: Admiralty Bay, Bequia" required />
      </label>
      <div class="dashboard-location-two-col">
        <label>
          Latitude
          <input name="latitude" type="number" step="0.000001" placeholder="13.005000" required />
        </label>
        <label>
          Longitude
          <input name="longitude" type="number" step="0.000001" placeholder="-61.235000" required />
        </label>
      </div>
      <label>
        Manual note
        <input name="locationNote" type="text" placeholder="AIS down - manual update from crew" />
      </label>
      <div class="button-row">
        <button class="button primary" type="submit">Publish Manual Location</button>
        <button class="button secondary" type="button" id="fillCurrentLocation">Use current map position</button>
      </div>
      <p class="tiny" id="dashboardManualLocationStatus">Ready. Use only when AIS is not updating.</p>
    </form>
  `;
  liveMap.appendChild(editor);

  const form = editor.querySelector("#dashboardManualLocationForm");
  const note = editor.querySelector("#dashboardManualLocationStatus");
  form.updateSecret.value = localStorage.getItem(STATUS_SECRET_KEY) || "";
  form.locationName.value = tripData?.locationName || "";
  form.latitude.value = typeof tripData?.latitude === "number" ? tripData.latitude : "";
  form.longitude.value = typeof tripData?.longitude === "number" ? tripData.longitude : "";
  form.locationNote.value = tripData?.locationNote || "";

  form.addEventListener("input", () => {
    localStorage.setItem(STATUS_SECRET_KEY, form.updateSecret.value);
  });

  editor.querySelector("#fillCurrentLocation").addEventListener("click", () => {
    form.locationName.value = tripData?.locationName || form.locationName.value;
    form.latitude.value = typeof tripData?.latitude === "number" ? tripData.latitude : form.latitude.value;
    form.longitude.value = typeof tripData?.longitude === "number" ? tripData.longitude : form.longitude.value;
    form.locationNote.value = tripData?.locationNote || form.locationNote.value;
    note.textContent = "Current map position filled into the form.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const latitude = Number(form.latitude.value);
    const longitude = Number(form.longitude.value);
    const updateSecret = form.updateSecret.value.trim();

    if (!updateSecret || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      note.textContent = "Enter password latitude and longitude first.";
      return;
    }

    const payload = {
      ...(tripData || {}),
      status: "manual fallback",
      date: new Date().toISOString().slice(0, 10),
      locationName: form.locationName.value.trim(),
      latitude,
      longitude,
      mapZoom: 11,
      locationNote: form.locationNote.value.trim() || "Manual fallback location entered by crew because AIS was not updating.",
      captainMessage: tripData?.captainMessage || "",
      activities: tripData?.activities || "",
      funnyNote: tripData?.funnyNote || "",
      meals: tripData?.meals || undefined,
      dinner: tripData?.dinner || undefined
    };

    try {
      note.textContent = "Publishing manual fallback location...";
      const response = await fetch(STATUS_WORKER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Update-Secret": updateSecret
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Worker returned ${response.status}`);
      tripData = payload;
      if (mapFrame) mapFrame.src = buildDashboardMapUrl(payload);
      const trackerTitle = liveMap.querySelector(".tracker-card h3");
      if (trackerTitle) trackerTitle.textContent = payload.locationName || "Manual location";
      note.textContent = `Manual location published. Commit: ${result.commit || "done"}`;
    } catch (error) {
      note.textContent = `Manual update failed: ${error.message}`;
    }
  });

  return true;
}

function installManualLocationEditorWhenReady() {
  let attempts = 0;
  const timer = setInterval(async () => {
    attempts += 1;
    const installed = await addManualLocationEditor();
    if (installed || attempts >= 20) clearInterval(timer);
  }, 250);
}

function addCaptainStatusForm() {
  const mealsSection = document.getElementById("meals");
  if (!mealsSection || document.getElementById("captainStatusForm")) return;

  const panel = document.createElement("div");
  panel.className = "captain-status-editor";
  panel.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Family status editor</p>
      <h2>Update meals and crew message</h2>
      <p>This publishes to the protected update worker, then GitHub updates the family page data.</p>
    </div>
    <form id="captainStatusForm" class="status-editor-form">
      <label>
        Update password
        <input name="updateSecret" type="password" placeholder="Enter the UPDATE_SECRET from Cloudflare" autocomplete="current-password" />
      </label>

      <label>
        Message from the crew
        <textarea name="captainMessage" rows="3" placeholder="We are anchored off Bequia, everyone is happy, and the sunset is ridiculous."></textarea>
      </label>

      <div class="meal-editor-grid">
        <fieldset>
          <legend>Breakfast</legend>
          <label>
            Plan
            <select name="breakfastChoice">
              <option>Regular breakfast onboard</option>
              <option>Breakfast onshore</option>
              <option>Custom</option>
            </select>
          </label>
          <label>
            Custom breakfast note
            <input name="breakfastCustom" type="text" placeholder="Skipping breakfast today / local delivery / etc." />
          </label>
        </fieldset>

        <fieldset>
          <legend>Lunch</legend>
          <label>
            Plan
            <select name="lunchChoice">
              <option>Lunch onboard</option>
              <option>Lunch onshore</option>
              <option>Custom</option>
            </select>
          </label>
          <label>
            Custom lunch note
            <input name="lunchCustom" type="text" placeholder="Beach picnic / lunch ashore / etc." />
          </label>
        </fieldset>

        <fieldset>
          <legend>Dinner</legend>
          <label>
            Plan
            <select name="dinnerChoice">
              <option>Dinner onboard</option>
              <option>Dinner ashore</option>
              <option>Dinner custom</option>
            </select>
          </label>
          <label>
            Custom dinner note
            <input name="dinnerCustom" type="text" placeholder="Dinner at shore restaurant / local delivery / etc." />
          </label>
        </fieldset>
      </div>

      <label>
        Tonight / anchorage note
        <input name="tonight" type="text" placeholder="Tonight we are anchored in Admiralty Bay, Bequia." />
      </label>

      <label>
        What we are doing today
        <textarea name="activities" rows="3" placeholder="Snorkeling, beach time, fishing report, dinner ashore, etc."></textarea>
      </label>

      <label>
        Fun note / family snapshot headline
        <input name="funnyNote" type="text" placeholder="Crew morale is high and Grayson is hunting fish." />
      </label>

      <div class="button-row">
        <button class="button primary" type="submit">Publish Family Status</button>
        <button class="button secondary" type="button" id="copyStatusJson">Copy JSON</button>
        <button class="button secondary" type="button" id="downloadStatusJson">Download manual-status.json</button>
      </div>
      <p class="tiny" id="statusEditorNote">Ready to publish through the Cloudflare status worker.</p>
    </form>
    <div class="status-preview" id="statusPreview"></div>
  `;

  mealsSection.appendChild(panel);

  const form = panel.querySelector("#captainStatusForm");
  const preview = panel.querySelector("#statusPreview");
  const note = panel.querySelector("#statusEditorNote");
  const saved = loadStatusDraft();
  form.updateSecret.value = localStorage.getItem(STATUS_SECRET_KEY) || "";

  for (const [key, value] of Object.entries(saved)) {
    if (key === "meals") continue;
    if (form.elements[key]) form.elements[key].value = value || "";
  }
  if (saved.meals) {
    form.breakfastChoice.value = saved.meals.breakfast?.choice || "Regular breakfast onboard";
    form.breakfastCustom.value = saved.meals.breakfast?.custom || "";
    form.lunchChoice.value = saved.meals.lunch?.choice || "Lunch onboard";
    form.lunchCustom.value = saved.meals.lunch?.custom || "";
    form.dinnerChoice.value = saved.meals.dinner?.choice || "Dinner onboard";
    form.dinnerCustom.value = saved.meals.dinner?.custom || "";
  }

  function buildPayload() {
    const meals = formMealPayload(form);
    return {
      status: "manual fallback",
      date: new Date().toISOString().slice(0, 10),
      captainMessage: form.captainMessage.value.trim(),
      tonight: form.tonight.value.trim(),
      activities: form.activities.value.trim(),
      funnyNote: form.funnyNote.value.trim(),
      meals,
      dinner: mealChoiceText(meals.dinner.choice, meals.dinner.custom)
    };
  }

  function renderPreview(payload) {
    preview.innerHTML = `
      <h3>Family page preview</h3>
      <p><strong>Message:</strong> ${dashboardEscape(payload.captainMessage || "Not set yet")}</p>
      <p><strong>Breakfast:</strong> ${dashboardEscape(mealChoiceText(payload.meals.breakfast.choice, payload.meals.breakfast.custom))}</p>
      <p><strong>Lunch:</strong> ${dashboardEscape(mealChoiceText(payload.meals.lunch.choice, payload.meals.lunch.custom))}</p>
      <p><strong>Dinner:</strong> ${dashboardEscape(mealChoiceText(payload.meals.dinner.choice, payload.meals.dinner.custom))}</p>
      <p><strong>Tonight:</strong> ${dashboardEscape(payload.tonight || "Not set yet")}</p>
      <p><strong>Activities:</strong> ${dashboardEscape(payload.activities || "Not set yet")}</p>
    `;
  }

  function saveAndPreview() {
    const payload = buildPayload();
    saveStatusDraft(payload);
    renderPreview(payload);
    return payload;
  }

  form.addEventListener("input", () => {
    localStorage.setItem(STATUS_SECRET_KEY, form.updateSecret.value);
    saveAndPreview();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = saveAndPreview();
    const updateSecret = form.updateSecret.value.trim();

    if (!updateSecret) {
      note.textContent = "Enter the UPDATE_SECRET password first.";
      return;
    }

    try {
      note.textContent = "Publishing status update...";
      const response = await fetch(STATUS_WORKER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Update-Secret": updateSecret
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Worker returned ${response.status}`);
      note.textContent = `Published to family status. Commit: ${result.commit || "done"}`;
    } catch (error) {
      note.textContent = `Publish failed: ${error.message}`;
    }
  });

  panel.querySelector("#copyStatusJson").addEventListener("click", async () => {
    const payload = saveAndPreview();
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    note.textContent = "Status JSON copied.";
  });

  panel.querySelector("#downloadStatusJson").addEventListener("click", () => {
    const payload = saveAndPreview();
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manual-status.json";
    a.click();
    URL.revokeObjectURL(url);
    note.textContent = "manual-status.json downloaded.";
  });

  saveAndPreview();
}

addCaptainStatusForm();
installManualLocationEditorWhenReady();
