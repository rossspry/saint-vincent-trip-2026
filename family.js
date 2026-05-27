const CREW_EMAIL = "rossspry@gmail.com";

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

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
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
  setText('[data-trip="lastUpdated"]', `Last updated: ${data.lastUpdated || "not yet"}`);
  updateMap(data);
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
