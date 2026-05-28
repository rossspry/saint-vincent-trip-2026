const DASHBOARD_STATUS_WORKER_ENDPOINT = "https://inconceivable-status-update.rossspry.workers.dev/";
const DASHBOARD_STATUS_SECRET_KEY = "svgTripStatusSecretV1";

let latestDashboardTripData = null;

function dashboardLocationEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberOrBlank(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

async function loadDashboardTripData() {
  try {
    const response = await fetch("trip-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("trip-data.json not found");
    latestDashboardTripData = await response.json();
  } catch (error) {
    console.warn("Could not load trip-data.json for dashboard location editor", error);
    latestDashboardTripData = null;
  }
  return latestDashboardTripData;
}

function buildMapUrl(data) {
  const lat = typeof data?.latitude === "number" ? data.latitude : 13.16;
  const lon = typeof data?.longitude === "number" ? data.longitude : -61.2248;
  const zoom = data?.mapZoom || 11;
  const delta = zoom >= 11 ? 0.08 : 0.35;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;
}

function ensureDashboardLocationEditor(data) {
  const liveMap = document.getElementById("live-map");
  if (!liveMap || document.getElementById("dashboardManualLocationForm")) return;

  liveMap.classList.add("large-dashboard-map-panel");

  const mapFrame = liveMap.querySelector(".map-card iframe");
  if (mapFrame) {
    mapFrame.src = buildMapUrl(data);
    mapFrame.classList.add("dashboard-large-map");
  }

  const trackerLayout = liveMap.querySelector(".tracker-layout");
  if (trackerLayout) trackerLayout.classList.add("large-tracker-layout");

  const editor = document.createElement("div");
  editor.className = "dashboard-manual-location-card";
  editor.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Manual AIS fallback</p>
      <h3>Update current location if AIS is not working</h3>
      <p>Use this from the crew dashboard only. AIS is still the primary source, but this lets you set the fallback map position when AIS is missing or wrong.</p>
    </div>
    <form id="dashboardManualLocationForm" class="dashboard-location-form">
      <label>
        Update password
        <input name="updateSecret" type="password" placeholder="Same UPDATE_SECRET used on the dashboard" autocomplete="current-password" required />
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
  const status = editor.querySelector("#dashboardManualLocationStatus");
  form.updateSecret.value = localStorage.getItem(DASHBOARD_STATUS_SECRET_KEY) || "";
  form.locationName.value = data?.locationName || "";
  form.latitude.value = numberOrBlank(data?.latitude);
  form.longitude.value = numberOrBlank(data?.longitude);
  form.locationNote.value = data?.locationNote || "";

  form.addEventListener("input", () => {
    localStorage.setItem(DASHBOARD_STATUS_SECRET_KEY, form.updateSecret.value);
  });

  editor.querySelector("#fillCurrentLocation").addEventListener("click", () => {
    form.locationName.value = latestDashboardTripData?.locationName || form.locationName.value;
    form.latitude.value = numberOrBlank(latestDashboardTripData?.latitude) || form.latitude.value;
    form.longitude.value = numberOrBlank(latestDashboardTripData?.longitude) || form.longitude.value;
    form.locationNote.value = latestDashboardTripData?.locationNote || form.locationNote.value;
    status.textContent = "Current map position filled into the form.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const latitude = Number(form.latitude.value);
    const longitude = Number(form.longitude.value);
    const updateSecret = form.updateSecret.value.trim();

    if (!updateSecret || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      status.textContent = "Enter password latitude and longitude first.";
      return;
    }

    const payload = {
      ...(latestDashboardTripData || {}),
      status: "manual fallback",
      date: new Date().toISOString().slice(0, 10),
      locationName: form.locationName.value.trim(),
      latitude,
      longitude,
      mapZoom: 11,
      locationNote: form.locationNote.value.trim() || "Manual fallback location entered by crew because AIS was not updating.",
      captainMessage: latestDashboardTripData?.captainMessage || "",
      activities: latestDashboardTripData?.activities || "",
      funnyNote: latestDashboardTripData?.funnyNote || "",
      meals: latestDashboardTripData?.meals || undefined,
      dinner: latestDashboardTripData?.dinner || undefined
    };

    try {
      status.textContent = "Publishing manual fallback location...";
      const response = await fetch(DASHBOARD_STATUS_WORKER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Update-Secret": updateSecret
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Worker returned ${response.status}`);
      latestDashboardTripData = payload;
      const mapFrame = liveMap.querySelector(".map-card iframe");
      if (mapFrame) mapFrame.src = buildMapUrl(payload);
      const title = liveMap.querySelector(".tracker-card h3");
      if (title) title.textContent = payload.locationName || "Manual location";
      status.textContent = `Manual location published. Commit: ${result.commit || "done"}`;
    } catch (error) {
      status.textContent = `Manual update failed: ${error.message}`;
    }
  });
}

function initDashboardLocationEditor() {
  loadDashboardTripData().then((data) => {
    const tryInstall = () => ensureDashboardLocationEditor(data);
    tryInstall();
    setTimeout(tryInstall, 250);
    setTimeout(tryInstall, 1000);
  });
}

initDashboardLocationEditor();
