const CREW_EMAIL = "NCsailingcrew@gmail.com";
const PHOTO_BOX_URL = "https://drive.google.com/drive/folders/1KYD_44wOEdmn48rLzYyVFDK9enNutFYU";
const PHOTO_FEED_URL = "https://script.google.com/macros/s/AKfycbycwTwnSd6OvhD97xqdfj3-E1BWxRgGRYXWor_AmfKPGVxkqds0tSBZ496i51tzk3K59g/exec";
const STATUS_WORKER_ENDPOINT = "https://inconceivable-status-update.rossspry.workers.dev/";
const STATUS_SECRET_KEY = "svgTripStatusSecretV1";
const MAX_LATEST_PHOTOS = 60;
const DESTINATIONS = [
  {
    name: "Tobago Cays",
    dates: "June 6",
    url: "https://www.google.com/search?tbm=isch&q=Tobago+Cays+Saint+Vincent+and+the+Grenadines"
  },
  {
    name: "Union Island / Frigate Island",
    dates: "June 7",
    url: "https://www.google.com/search?tbm=isch&q=Union+Island+Frigate+Island+Saint+Vincent+and+the+Grenadines"
  },
  {
    name: "Petit St. Vincent",
    dates: "June 8",
    url: "https://www.google.com/search?tbm=isch&q=Petit+St+Vincent+Grenadines"
  },
  {
    name: "Canouan",
    dates: "June 9–10",
    url: "https://www.google.com/search?tbm=isch&q=Canouan+Saint+Vincent+and+the+Grenadines"
  },
  {
    name: "Mayreau",
    dates: "June 11–13 flexible",
    url: "https://www.google.com/search?tbm=isch&q=Mayreau+Saint+Vincent+and+the+Grenadines"
  },
  {
    name: "Bequia",
    dates: "June 14",
    url: "https://www.google.com/search?tbm=isch&q=Bequia+Saint+Vincent+and+the+Grenadines"
  },
  {
    name: "Blue Lagoon, St. Vincent",
    dates: "June 15",
    url: "https://www.google.com/search?tbm=isch&q=Blue+Lagoon+St+Vincent+Marina"
  }
];
let currentTripData = null;

async function fetchJsonNoStore(path) {
  const response = await fetch(`${path}?cacheBust=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} not found`);
  return await response.json();
}

function hasPosition(data) {
  return data && typeof data.latitude === "number" && typeof data.longitude === "number";
}

function isLiveAis(data) {
  const source = String(data?.ais?.source || "").toLowerCase();
  const status = String(data?.status || "").toLowerCase();
  return hasPosition(data) && (status === "live ais" || source.includes("aisstream"));
}

function mergeManualStatus(tripData, manualStatus) {
  if (!hasPosition(manualStatus)) return tripData;
  if (isLiveAis(tripData)) return tripData;
  return {
    ...(tripData || {}),
    ...manualStatus,
    automationStatus: manualStatus.automationStatus || "Manual daily crew update active for this trip.",
    lastUpdated: manualStatus.lastUpdated || manualStatus.updatedAt || new Date().toISOString()
  };
}

async function loadTripData() {
  const [tripResult, manualResult] = await Promise.allSettled([
    fetchJsonNoStore("trip-data.json"),
    fetchJsonNoStore("manual-status.json")
  ]);

  const tripData = tripResult.status === "fulfilled" ? tripResult.value : null;
  const manualStatus = manualResult.status === "fulfilled" ? manualResult.value : null;

  if (tripResult.status === "rejected") console.warn("Could not load trip-data.json", tripResult.reason);
  if (manualResult.status === "rejected") console.warn("Could not load manual-status.json", manualResult.reason);

  return mergeManualStatus(tripData, manualStatus);
}

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `photoFeedCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Photo feed timed out."));
    }, 12000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Photo feed script failed to load."));
    };

    script.src = `${url}${separator}callback=${callbackName}&cacheBust=${Date.now()}`;
    document.body.appendChild(script);
  });
}

async function loadPhotoFeed() {
  try {
    return await loadJsonp(PHOTO_FEED_URL);
  } catch (jsonpError) {
    console.warn("Could not load Apps Script photo feed with JSONP", jsonpError);
    try {
      const response = await fetch("photos.json", { cache: "no-store" });
      if (!response.ok) throw new Error("photos.json not found");
      return await response.json();
    } catch (localError) {
      console.warn("Could not load local photos.json fallback", localError);
      return { mainPhoto: null, photos: [] };
    }
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mealText(meal) {
  if (!meal) return "Not set yet";
  if (meal.custom && String(meal.custom).trim()) return String(meal.custom).trim();
  if (meal.choice && String(meal.choice).trim()) return String(meal.choice).trim();
  return "Not set yet";
}

function updateMap(data) {
  const iframe = document.getElementById("familyMap");
  if (!iframe || !data || typeof data.latitude !== "number" || typeof data.longitude !== "number") return;
  const lat = data.latitude;
  const lon = data.longitude;
  const zoom = data.mapZoom || 11;
  const delta = zoom >= 11 ? 0.08 : 0.35;
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`;
}

function renderTripData(data) {
  if (!data) return;
  currentTripData = data;
  setText('[data-trip="locationName"]', data.locationName);
  setText('[data-trip="weather"]', data.weather);
  setText('[data-trip="funnyNote"]', data.funnyNote);
  setText('[data-trip="activities"]', data.activities);
  setText('[data-trip="captainMessage"]', data.captainMessage);
  setText('[data-trip="lastUpdated"]', `Last updated: ${data.lastUpdated || "not yet"}`);
  setText('[data-trip="automationStatus"]', data.automationStatus);
  setText('[data-trip="locationNote"]', data.locationNote || data.note);
  if (data.meals) {
    setText('[data-meal="breakfast"]', mealText(data.meals.breakfast));
    setText('[data-meal="lunch"]', mealText(data.meals.lunch));
    setText('[data-meal="dinner"]', mealText(data.meals.dinner));
  } else if (data.dinner) {
    setText('[data-meal="dinner"]', data.dinner);
  }
  updateMap(data);
}

function normalizePhotos(feed) {
  if (Array.isArray(feed)) return { mainPhoto: feed[0] || null, photos: feed };
  const photos = Array.isArray(feed?.photos) ? feed.photos : [];
  return { mainPhoto: feed?.mainPhoto || photos[0] || null, photos };
}

function getPhotoImageUrl(photo, size = "w1200") {
  if (!photo) return "";
  if (photo.thumbnailUrl) return photo.thumbnailUrl;
  if (photo.url) return photo.url;
  if (photo.webContentLink) return photo.webContentLink;
  if (photo.id) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(photo.id)}&sz=${size}`;
  return "";
}

function getPhotoLink(photo) {
  if (!photo) return PHOTO_BOX_URL;
  if (photo.viewUrl) return photo.viewUrl;
  if (photo.webViewLink) return photo.webViewLink;
  if (photo.id) return `https://drive.google.com/file/d/${encodeURIComponent(photo.id)}/view`;
  return PHOTO_BOX_URL;
}

function renderMainPhoto(photo) {
  const card = document.getElementById("mainPhotoCard");
  const caption = document.getElementById("mainPhotoCaption");
  if (!card || !photo) return;
  const imageUrl = getPhotoImageUrl(photo, "w1600");
  const link = getPhotoLink(photo);
  const title = photo.title || photo.name || "The crew aboard Inconceivable";
  if (!imageUrl) return;
  card.innerHTML = `
    <a href="${escapeHtml(link)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="eager" /></a>
    <figcaption id="mainPhotoCaption">${escapeHtml(title)}</figcaption>
  `;
  if (caption) caption.textContent = title;
}

function renderPhotos(feed) {
  const grid = document.getElementById("latestPhotoGrid");
  if (!grid) return;
  const { photos } = normalizePhotos(feed);
  const latestPhotos = photos.slice(0, MAX_LATEST_PHOTOS);
  renderMainPhoto(window.FAMILY_MAIN_PHOTO || latestPhotos[0]);

  if (!latestPhotos.length) {
    grid.innerHTML = `
      <figure class="photo-placeholder">
        <span>No latest photos yet</span>
        <figcaption><a href="${PHOTO_BOX_URL}" target="_blank" rel="noreferrer">Open the shared Photo Box</a></figcaption>
      </figure>
    `;
    return;
  }

  grid.innerHTML = latestPhotos.map((photo) => {
    const title = escapeHtml(photo.title || photo.name || "Trip photo");
    const url = getPhotoImageUrl(photo, "w900");
    const link = getPhotoLink(photo);
    if (!url) return `<figure class="photo-placeholder"><span>Photo</span><figcaption><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${title}</a></figcaption></figure>`;
    return `<figure><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(url)}" alt="${title}" loading="lazy" /></a><figcaption>${title}</figcaption></figure>`;
  }).join("");
}

function renderDestinations() {
  const grid = document.getElementById("destinationGrid");
  if (!grid) return;
  grid.innerHTML = DESTINATIONS.map((destination) => `
    <a class="destination-card" href="${escapeHtml(destination.url)}" target="_blank" rel="noreferrer">
      <span>${escapeHtml(destination.dates)}</span>
      <strong>${escapeHtml(destination.name)}</strong>
      <small>See photos and learn about this stop →</small>
    </a>
  `).join("");
}

const messageForm = document.getElementById("familyMessageForm");
if (messageForm) {
  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(messageForm);
    const name = String(formData.get("name") || "Family member").trim();
    const message = String(formData.get("message") || "").trim();
    const subject = encodeURIComponent("Message for Inconceivable crew");
    const body = encodeURIComponent(`${name} sent a message from the family snapshot page:\n\n${message}`);
    window.location.href = `mailto:${CREW_EMAIL}?subject=${subject}&body=${body}`;
  });
}

renderDestinations();
loadTripData().then(renderTripData);
loadPhotoFeed().then(renderPhotos);
