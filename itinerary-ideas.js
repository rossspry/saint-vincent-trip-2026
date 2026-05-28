async function loadItineraryIdeas() {
  try {
    const response = await fetch("itinerary.json", { cache: "no-store" });
    if (!response.ok) throw new Error("itinerary.json not found");
    return await response.json();
  } catch (error) {
    console.warn("Could not load itinerary ideas", error);
    return [];
  }
}

function safeIdeasText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderItineraryIdeas(itinerary) {
  const routeSection = document.getElementById("route");
  if (!routeSection || document.getElementById("itineraryIdeasPanel")) return;

  const entries = Array.isArray(itinerary) ? itinerary : [];
  const section = document.createElement("div");
  section.id = "itineraryIdeasPanel";
  section.className = "postcard-itinerary-panel";

  const cards = entries.map((entry) => {
    const ideas = Array.isArray(entry.activityIdeas) ? entry.activityIdeas : [];
    const ideaList = ideas.length
      ? ideas.map((idea) => `<li>${safeIdeasText(idea)}</li>`).join("")
      : `<li>${safeIdeasText(entry.plannedActivity || "Activity ideas not set yet.")}</li>`;

    return `
      <article class="itinerary-postcard">
        <div class="postcard-stamp">${safeIdeasText(entry.dayLabel || "Day")}</div>
        <div class="postcard-topline">${safeIdeasText(entry.date || "2026")}</div>
        <h3>${safeIdeasText(entry.plannedLocation || "Planned stop")}</h3>
        <p class="postcard-overnight"><strong>Overnight:</strong> ${safeIdeasText(entry.plannedOvernight || "Flexible")}</p>
        <p class="postcard-route">${safeIdeasText(entry.route || "Route plan pending.")}</p>
        <div class="postcard-ideas">
          <h4>Activity ideas</h4>
          <ul>${ideaList}</ul>
        </div>
      </article>
    `;
  }).join("");

  section.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Island postcards</p>
      <h2>Activity ideas by stop</h2>
      <p>Each postcard is a planning snapshot for that stop. Weather, crew energy, and charter rules still win.</p>
    </div>
    <div class="itinerary-postcard-grid">${cards}</div>
  `;

  routeSection.appendChild(section);
}

loadItineraryIdeas().then(renderItineraryIdeas);
