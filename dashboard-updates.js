const STATUS_DRAFT_KEY = "svgTripStatusDraftV1";
const STATUS_SECRET_KEY = "svgTripStatusSecretV1";
const STATUS_WORKER_ENDPOINT = "https://inconceivable-status-update.rossspry.workers.dev/";
const PHOTO_BOX_URL = "https://drive.google.com/drive/folders/1KYD_44wOEdmn48rLzYyVFDK9enNutFYU";

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

async function fetchJsonNoStore(path) {
  const response = await fetch(`${path}?cacheBust=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} not found`);
  return await response.json();
}

async function loadCurrentTripDataForDashboard() {
  const [tripResult, manualResult] = await Promise.allSettled([
    fetchJsonNoStore("trip-data.json"),
    fetchJsonNoStore("manual-status.json")
  ]);
  const tripData = tripResult.status === "fulfilled" ? tripResult.value : {};
  const manualStatus = manualResult.status === "fulfilled" ? manualResult.value : {};
  return { ...tripData, ...manualStatus };
}

function addDashboardUpdateStyles() {
  if (document.getElementById("daily-family-update-style")) return;
  const style = document.createElement("style");
  style.id = "daily-family-update-style";
  style.textContent = `
    .captain-status-editor {
      margin-top: 24px;
      padding: clamp(18px, 3vw, 28px);
      border: 1px solid rgba(5, 45, 67, .14);
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(245,252,252,.96));
      box-shadow: 0 18px 40px rgba(3, 27, 41, .12);
    }
    .status-editor-form {
      display: grid;
      gap: 16px;
    }
    .status-editor-form label,
    .status-editor-form fieldset {
      display: grid;
      gap: 8px;
      color: #052d43;
      font-weight: 900;
    }
    .status-editor-form input,
    .status-editor-form textarea,
    .status-editor-form select {
      width: 100%;
      border: 1px solid rgba(5, 45, 67, .18);
      border-radius: 16px;
      padding: 12px 14px;
      font: inherit;
      color: #173041;
      background: #fff;
    }
    .status-editor-form textarea {
      resize: vertical;
    }
    .daily-update-grid,
    .meal-editor-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .daily-update-grid.two-col {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .meal-editor-grid fieldset {
      border: 1px solid rgba(5, 45, 67, .14);
      border-radius: 18px;
      padding: 14px;
      background: rgba(255,255,255,.75);
    }
    .meal-editor-grid legend {
      color: var(--blue);
      font-weight: 950;
      padding: 0 6px;
    }
    .status-preview {
      margin-top: 18px;
      padding: 16px;
      border-radius: 18px;
      background: #fff8ea;
      border-left: 5px solid var(--gold);
    }
    .photo-box-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    @media (max-width: 900px) {
      .daily-update-grid,
      .daily-update-grid.two-col,
      .meal-editor-grid {
        grid-template-columns: 1fr;
      }
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

async function addDailyFamilyUpdateForm() {
  const mealsSection = document.getElementById("meals");
  if (!mealsSection || document.getElementById("captainStatusForm")) return;

  addDashboardUpdateStyles();
  const current = await loadCurrentTripDataForDashboard();
  const saved = loadStatusDraft();
  const initial = { ...current, ...saved };

  const panel = document.createElement("div");
  panel.className = "captain-status-editor";
  panel.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Daily family update</p>
      <h2>Update today’s family page</h2>
      <p>Use this once a day while AIS is not updating. It publishes the current location, crew note, plans, meals, and family snapshot text.</p>
    </div>
    <form id="captainStatusForm" class="status-editor-form">
      <label>
        Update password
        <input name="updateSecret" type="password" placeholder="Enter the UPDATE_SECRET from Cloudflare" autocomplete="current-password" required />
      </label>

      <div class="daily-update-grid">
        <label>
          Date
          <input name="date" type="date" required />
        </label>
        <label>
          Current location
          <input name="locationName" type="text" placeholder="Tobago Cays" required />
        </label>
        <label>
          Tonight’s anchorage
          <input name="tonight" type="text" placeholder="Tobago Cays — overnight in paradise" />
        </label>
      </div>

      <div class="daily-update-grid two-col">
        <label>
          Latitude
          <input name="latitude" type="number" step="0.000001" placeholder="12.635817" required />
        </label>
        <label>
          Longitude
          <input name="longitude" type="number" step="0.000001" placeholder="-61.361667" required />
        </label>
      </div>

      <label>
        Note from the crew
        <textarea name="captainMessage" rows="3" placeholder="We are anchored in Tobago Cays and having a great day."></textarea>
      </label>

      <label>
        Today’s plans / what we are doing
        <textarea name="activities" rows="3" placeholder="Snorkeling turtle watching dinghy exploring beach time and dinner onboard."></textarea>
      </label>

      <label>
        Tomorrow’s plans
        <textarea name="tomorrow" rows="2" placeholder="Tomorrow we may head toward Union Island or Mayreau depending on weather."></textarea>
      </label>

      <label>
        Weather / sea note
        <input name="weather" type="text" placeholder="Sunny trade winds and clear water. Check marine forecast before moving." />
      </label>

      <label>
        Crew mood / funny note
        <input name="funnyNote" type="text" placeholder="Crew morale is high. Grayson is still hunting fish." />
      </label>

      <label>
        Location note for family map
        <input name="locationNote" type="text" placeholder="Manual crew update because AIS is not updating." />
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
            <input name="breakfastCustom" type="text" placeholder="Eggs and coffee / fruit / etc." />
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
            <input name="lunchCustom" type="text" placeholder="Sandwiches / beach picnic / etc." />
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
            <input name="dinnerCustom" type="text" placeholder="Dinner onboard / beach BBQ / restaurant ashore" />
          </label>
        </fieldset>
      </div>

      <div class="photo-box-row">
        <a class="button secondary" href="${PHOTO_BOX_URL}" target="_blank" rel="noreferrer">Open Photo Box to add today’s photos</a>
        <span class="tiny">Upload photos there, then the family page photo feed will pick them up.</span>
      </div>

      <div class="button-row">
        <button class="button primary" type="submit">Publish Daily Family Update</button>
        <button class="button secondary" type="button" id="copyStatusJson">Copy JSON</button>
        <button class="button secondary" type="button" id="downloadStatusJson">Download manual-status.json</button>
      </div>
      <p class="tiny" id="statusEditorNote">Ready to publish daily family update.</p>
    </form>
    <div class="status-preview" id="statusPreview"></div>
  `;

  mealsSection.appendChild(panel);

  const form = panel.querySelector("#captainStatusForm");
  const preview = panel.querySelector("#statusPreview");
  const note = panel.querySelector("#statusEditorNote");

  form.updateSecret.value = localStorage.getItem(STATUS_SECRET_KEY) || "";
  form.date.value = initial.date || todayIso();
  form.locationName.value = initial.locationName || "";
  form.tonight.value = initial.tonight || "";
  form.latitude.value = typeof initial.latitude === "number" ? initial.latitude : "";
  form.longitude.value = typeof initial.longitude === "number" ? initial.longitude : "";
  form.captainMessage.value = initial.captainMessage || "";
  form.activities.value = initial.activities || "";
  form.tomorrow.value = initial.tomorrow || "";
  form.weather.value = initial.weather || "";
  form.funnyNote.value = initial.funnyNote || "";
  form.locationNote.value = initial.locationNote || initial.note || "Manual daily crew update because AIS is not updating.";

  if (initial.meals) {
    form.breakfastChoice.value = initial.meals.breakfast?.choice || "Regular breakfast onboard";
    form.breakfastCustom.value = initial.meals.breakfast?.custom || "";
    form.lunchChoice.value = initial.meals.lunch?.choice || "Lunch onboard";
    form.lunchCustom.value = initial.meals.lunch?.custom || "";
    form.dinnerChoice.value = initial.meals.dinner?.choice || "Dinner onboard";
    form.dinnerCustom.value = initial.meals.dinner?.custom || "";
  }

  function buildPayload() {
    const meals = formMealPayload(form);
    const latitude = Number(form.latitude.value);
    const longitude = Number(form.longitude.value);
    return {
      status: "manual fallback",
      date: form.date.value || todayIso(),
      locationName: form.locationName.value.trim(),
      latitude: Number.isNaN(latitude) ? undefined : latitude,
      longitude: Number.isNaN(longitude) ? undefined : longitude,
      mapZoom: 13,
      weather: form.weather.value.trim(),
      tonight: form.tonight.value.trim(),
      tomorrow: form.tomorrow.value.trim(),
      captainMessage: form.captainMessage.value.trim(),
      activities: form.activities.value.trim(),
      funnyNote: form.funnyNote.value.trim(),
      locationNote: form.locationNote.value.trim(),
      meals,
      dinner: mealChoiceText(meals.dinner.choice, meals.dinner.custom),
      photoBoxUrl: PHOTO_BOX_URL,
      lastUpdated: new Date().toISOString()
    };
  }

  function renderPreview(payload) {
    preview.innerHTML = `
      <h3>Family page preview</h3>
      <p><strong>Date:</strong> ${dashboardEscape(payload.date || "Not set")}</p>
      <p><strong>Location:</strong> ${dashboardEscape(payload.locationName || "Not set")} ${payload.latitude && payload.longitude ? `(${payload.latitude}, ${payload.longitude})` : ""}</p>
      <p><strong>Note from crew:</strong> ${dashboardEscape(payload.captainMessage || "Not set yet")}</p>
      <p><strong>Today:</strong> ${dashboardEscape(payload.activities || "Not set yet")}</p>
      <p><strong>Tomorrow:</strong> ${dashboardEscape(payload.tomorrow || "Not set yet")}</p>
      <p><strong>Breakfast:</strong> ${dashboardEscape(mealChoiceText(payload.meals.breakfast.choice, payload.meals.breakfast.custom))}</p>
      <p><strong>Lunch:</strong> ${dashboardEscape(mealChoiceText(payload.meals.lunch.choice, payload.meals.lunch.custom))}</p>
      <p><strong>Dinner:</strong> ${dashboardEscape(mealChoiceText(payload.meals.dinner.choice, payload.meals.dinner.custom))}</p>
      <p><strong>Weather / sea:</strong> ${dashboardEscape(payload.weather || "Not set yet")}</p>
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

    if (!payload.locationName || typeof payload.latitude !== "number" || typeof payload.longitude !== "number") {
      note.textContent = "Enter location name, latitude, and longitude before publishing.";
      return;
    }

    try {
      note.textContent = "Publishing daily family update...";
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
      note.textContent = `Published daily family update. Commit: ${result.commit || "done"}`;
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

addDailyFamilyUpdateForm();
