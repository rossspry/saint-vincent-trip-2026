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
  section.className = "itinerary-ideas-panel";

  const cards = entries.map((entry) => {
    const ideas = Array.isArray(entry.activityIdeas) ? entry.activityIdeas : [];
    const ideaList = ideas.length
      ? ideas.map((idea) => `<li>${safeIdeasText(idea)}</li>`).join("")
      : `<li>${safeIdeasText(entry.plannedActivity || "Activity ideas not set yet.")}</li>`;

    return `
      <article class="idea-card">
        <div class="idea-card-head">
          <span>${safeIdeasText(entry.dayLabel || "Day")}</span>
          <strong>${safeIdeasText(entry.plannedLocation || "Planned stop")}</strong>
        </div>
        <p>${safeIdeasText(entry.route || "Route plan pending.")}</p>
        <h3>Activity ideas</h3>
        <ul>${ideaList}</ul>
      </article>
    `;
  }).join("");

  section.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Island ideas</p>
      <h2>Route activity ideas</h2>
      <p>These are the fun stop ideas attached to the itinerary. They are planning ideas, not fixed commitments.</p>
    </div>
    <div class="idea-card-grid">${cards}</div>
  `;

  routeSection.appendChild(section);
}

loadItineraryIdeas().then(renderItineraryIdeas);
