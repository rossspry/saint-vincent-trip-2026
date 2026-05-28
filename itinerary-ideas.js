const ACTIVITY_EXTRA_KEY = "svgTripExtraActivityIdeasV1";

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

function loadExtraIdeas() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_EXTRA_KEY)) || {};
  } catch {
    return {};
  }
}

function saveExtraIdeas(value) {
  localStorage.setItem(ACTIVITY_EXTRA_KEY, JSON.stringify(value));
}

function formatReadableTripDate(value) {
  if (!value) return "Date flexible";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function shortDayDescription(entry) {
  const location = `${entry.plannedLocation || ""} ${entry.plannedOvernight || ""}`.toLowerCase();
  if (location.includes("blue lagoon") && String(entry.dayLabel || "").toLowerCase().includes("return")) return "Final checkout and goodbyes.";
  if (location.includes("blue lagoon")) return "The adventure begins.";
  if (location.includes("bequia")) return "First island magic.";
  if (location.includes("canouan")) return "Scruffy’s and shore exploring.";
  if (location.includes("tobago cays")) return "Fun day in paradise.";
  if (location.includes("union")) return "Happy Island and beach wandering.";
  if (location.includes("mayreau")) return "Slow island day and water time.";
  if (location.includes("southern")) return "Flexible Grenadines exploring.";
  if (String(entry.dayLabel || "").toLowerCase().includes("return")) return "Homeward travel and memories secured.";
  return "A fresh day aboard Inconceivable.";
}

function ideaListHtml(entry, extraIdeas) {
  const ideas = Array.isArray(entry.activityIdeas) ? entry.activityIdeas : [];
  const extras = Array.isArray(extraIdeas?.[entry.date]) ? extraIdeas[entry.date] : [];
  const allIdeas = [...ideas, ...extras];
  if (!allIdeas.length) return `<li>${safeIdeasText(entry.plannedActivity || "Activity ideas not set yet.")}</li>`;
  return allIdeas.map((idea, index) => {
    const extraClass = index >= ideas.length ? " class=\"extra-idea\"" : "";
    return `<li${extraClass}>${safeIdeasText(idea)}</li>`;
  }).join("");
}

function renderItineraryIdeas(itinerary) {
  const routeSection = document.getElementById("route");
  if (!routeSection || document.getElementById("itineraryIdeasPanel")) return;

  const entries = Array.isArray(itinerary) ? itinerary : [];
  const extraIdeas = loadExtraIdeas();
  const section = document.createElement("div");
  section.id = "itineraryIdeasPanel";
  section.className = "postcard-itinerary-panel";

  const cards = entries.map((entry, index) => {
    const dayLabel = entry.dayLabel || `Day ${index + 1}`;
    const readableDate = formatReadableTripDate(entry.date);
    const description = entry.dayDescription || shortDayDescription(entry);
    const ideaList = ideaListHtml(entry, extraIdeas);

    return `
      <article class="itinerary-postcard activity-stop-card" data-date="${safeIdeasText(entry.date || `day-${index + 1}`)}">
        <div class="activity-day-number">${safeIdeasText(dayLabel).toUpperCase()}</div>
        <div class="activity-day-date">${safeIdeasText(readableDate)}</div>
        <h3>${safeIdeasText(entry.plannedLocation || "Planned stop")}</h3>
        <p class="activity-day-description">${safeIdeasText(description)}</p>
        <p class="postcard-overnight"><strong>Overnight:</strong> ${safeIdeasText(entry.plannedOvernight || "Flexible")}</p>
        <p class="postcard-route">${safeIdeasText(entry.route || "Route plan pending.")}</p>
        <div class="postcard-ideas">
          <h4>Activity ideas</h4>
          <ul>${ideaList}</ul>
        </div>
        <form class="extra-activity-form">
          <label>
            Add an activity idea
            <input name="activityIdea" type="text" placeholder="Add another idea for this stop" />
          </label>
          <button class="button secondary" type="submit">Add</button>
        </form>
      </article>
    `;
  }).join("");

  section.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Island day cards</p>
      <h2>Activity ideas by stop</h2>
      <p>Each card gives the day, date, stop, quick mood, and flexible ideas. Weather, crew energy, and charter rules still win.</p>
    </div>
    <div class="itinerary-postcard-grid">${cards}</div>
  `;

  routeSection.appendChild(section);

  section.addEventListener("submit", (event) => {
    const form = event.target.closest(".extra-activity-form");
    if (!form) return;
    event.preventDefault();
    const card = form.closest(".activity-stop-card");
    const date = card?.dataset?.date;
    const input = form.elements.activityIdea;
    const value = String(input.value || "").trim();
    if (!date || !value) return;

    const saved = loadExtraIdeas();
    saved[date] = Array.isArray(saved[date]) ? saved[date] : [];
    saved[date].push(value);
    saveExtraIdeas(saved);

    const list = card.querySelector(".postcard-ideas ul");
    if (list) list.insertAdjacentHTML("beforeend", `<li class="extra-idea">${safeIdeasText(value)}</li>`);
    input.value = "";
  });
}

loadItineraryIdeas().then(renderItineraryIdeas);
