const CREW_EMAIL = "NCsailingcrew@gmail.com";
const PHOTO_BOX_URL = "https://drive.google.com/drive/folders/1KYD_44wOEdmn48rLzYyVFDK9enNutFYU";

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
    const response = await fetch("photos.json", { cache: "no-store" });
    if (!response.ok) throw new Error("photos.json not found");
    return await response.json();
  } catch (error) {
    console.warn("Could not load photos.json", error);
    return [];
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
  const zoom = data.mapZoom || 9;
  const delta = zoom >= 11 ? 0.08 : 0.35;
  const left = lon - delta;
  const right = lon + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lon}`;
}

function renderTripData(data) {
  if (!data) return;
  setText('[data-trip="locationName"]', data.locationName);
  setText('[data-trip="weather"]', data.weather);
  setText('[data-trip="funnyNote"]', data.funnyNote);
  setText('[data-trip="activities"]', data.activities);
  setText('[data-trip="captainMessage"]', data.captainMessage);
  setText('[data-trip="lastUpdated"]', `Last updated: ${data.lastUpdated || "not yet"}`);

  if (data.meals) {
    setText('[data-meal="breakfast"]', mealText(data.meals.breakfast));
    setText('[data-meal="lunch"]', mealText(data.meals.lunch));
    setText('[data-meal="dinner"]', mealText(data.meals.dinner));
  } else if (data.dinner) {
    setText('[data-meal="dinner"]', data.dinner);
  }

  updateMap(data);
}

function renderPhotos(photos) {
  const grid = document.getElementById("latestPhotoGrid");
  if (!grid) return;

  if (!Array.isArray(photos) || !photos.length) {
    grid.innerHTML = `
      <figure class="photo-placeholder">
        <span>Photo Box</span>
        <figcaption><a href="${PHOTO_BOX_URL}" target="_blank" rel="noreferrer">Open the shared Photo Box</a></figcaption>
      </figure>
    `;
    return;
  }

  grid.innerHTML = photos.slice(0, 10).map((photo) => {
    const title = escapeHtml(photo.title || photo.name || "Trip photo");
    const url = photo.thumbnailUrl || photo.url || photo.webContentLink || "";
    const link = photo.viewUrl || photo.webViewLink || PHOTO_BOX_URL;
    if (!url) {
      return `<figure class="photo-placeholder"><span>Photo</span><figcaption><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${title}</a></figcaption></figure>`;
    }
    return `
      <figure>
        <a href="${escapeHtml(link)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(url)}" alt="${title}" loading="lazy" /></a>
        <figcaption>${title}</figcaption>
      </figure>
    `;
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

loadTripData().then(renderTripData);
loadPhotoFeed().then(renderPhotos);
