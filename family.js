const CREW_EMAIL = "NCsailingcrew@gmail.com";
const PHOTO_BOX_URL = "https://drive.google.com/drive/folders/1KYD_44wOEdmn48rLzYyVFDK9enNutFYU";
const PHOTO_FEED_URL = "https://script.google.com/macros/s/AKfycbw_gACL9w95kYf1Ex1geRshstRxtXnqdVHhoV8SzPuz/dev";
const STATUS_WORKER_ENDPOINT = "https://inconceivable-status-update.rossspry.workers.dev/";
const STATUS_SECRET_KEY = "svgTripStatusSecretV1";
const MAX_LATEST_PHOTOS = 10;
let currentTripData = null;

async function loadTripData() {
  try {
    const response = await fetch("trip-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error("trip-data.json not found");
    return await response.json();
  } catch (error) {
    console.warn("Could not load trip-data.json", error);
    return null;
  }
}

async function loadPhotoFeed() {
  try {
    const response = await fetch(PHOTO_FEED_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`${PHOTO_FEED_URL} not found`);
    return await response.json();
  } catch (error) {
    console.warn(`Could not load ${PHOTO_FEED_URL}`, error);
    return { mainPhoto: null, photos: [] };
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
  const { mainPhoto, photos } = normalizePhotos(feed);
  const latestPhotos = photos.slice(0, MAX_LATEST_PHOTOS);
  renderMainPhoto(mainPhoto || latestPhotos[0]);

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

const manualLocationForm = document.getElementById("manualLocationForm");
if (manualLocationForm) {
  const note = document.getElementById("manualLocationStatus");
  manualLocationForm.updateSecret.value = localStorage.getItem(STATUS_SECRET_KEY) || "";
  manualLocationForm.addEventListener("input", () => {
    localStorage.setItem(STATUS_SECRET_KEY, manualLocationForm.updateSecret.value);
  });
  manualLocationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const latitude = Number(manualLocationForm.latitude.value);
    const longitude = Number(manualLocationForm.longitude.value);
    const updateSecret = manualLocationForm.updateSecret.value.trim();
    if (!updateSecret || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      if (note) note.textContent = "Enter password latitude and longitude first.";
      return;
    }
    const payload = {
      ...(currentTripData || {}),
      status: "manual fallback",
      date: new Date().toISOString().slice(0, 10),
      locationName: manualLocationForm.locationName.value.trim(),
      latitude,
      longitude,
      mapZoom: 11,
      locationNote: manualLocationForm.locationNote.value.trim() || "Manual fallback location entered by crew because AIS was not updating.",
      captainMessage: currentTripData?.captainMessage || "",
      activities: currentTripData?.activities || "",
      funnyNote: currentTripData?.funnyNote || "",
      meals: currentTripData?.meals || undefined,
      dinner: currentTripData?.dinner || undefined
    };
    try {
      if (note) note.textContent = "Publishing manual fallback location...";
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
      renderTripData({ ...payload, automationStatus: "Manual fallback location published. AIS still has priority when available." });
      if (note) note.textContent = `Manual location published. Commit: ${result.commit || "done"}`;
    } catch (error) {
      if (note) note.textContent = `Manual update failed: ${error.message}`;
    }
  });
}

loadTripData().then(renderTripData);
loadPhotoFeed().then(renderPhotos);
