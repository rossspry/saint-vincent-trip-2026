const ANNOUNCEMENT_PRESETS = [
  "Breakfast is ready.",
  "Lunch is ready.",
  "Dinner is ready.",
  "All hands on deck.",
  "All hands to the salon for a briefing.",
  "Good morning. It is time to begin our pre-sail checklist and prepare to sail. Rise and shine.",
  "All hands, put your life jackets on and meet at the dinghy.",
  "Man overboard. Man overboard. Man overboard.",
  "Please secure all loose items before we get underway.",
  "Dinghy crew, report to the stern for departure.",
  "Snorkel gear check. Masks, fins, snorkels, towels, sunscreen, and water bottles.",
  "Anchor watch reminder. Check our position and confirm we are holding.",
  "Quiet time on deck. Please keep voices low and lights down.",
  "Photo time. Everybody up top for a crew picture.",
  "Hydration check. Everybody drink water now.",
  "Squall watch. Secure hatches and loose gear."
];

function renderPresetButtons() {
  const grid = document.getElementById("announcementPresets");
  const input = document.getElementById("announcementText");
  if (!grid || !input) return;

  grid.innerHTML = ANNOUNCEMENT_PRESETS.map((text) => {
    const label = text.length > 42 ? `${text.slice(0, 39)}...` : text;
    return `<button class="preset-button" type="button" data-preset="${encodeURIComponent(text)}">${label}</button>`;
  }).join("");

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-preset]");
    if (!button) return;
    input.value = decodeURIComponent(button.dataset.preset);
    input.focus();
  });
}

async function announceText(text, button, status) {
  if (!text.trim()) {
    status.textContent = "Type an announcement or choose a preset first.";
    return;
  }

  button.disabled = true;
  button.textContent = "Announcing...";
  status.textContent = "Generating AI voice announcement.";

  try {
    const response = await fetch(AI_VOICE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: "cedar" })
    });

    if (!response.ok) {
      let message = "AI voice worker failed.";
      try {
        const error = await response.json();
        message = error.error || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const oldPlayer = document.querySelector(".announcement-audio-player");
    if (oldPlayer) oldPlayer.remove();

    const audio = new Audio(url);
    audio.controls = true;
    audio.autoplay = true;
    audio.className = "announcement-audio-player";
    status.insertAdjacentElement("afterend", audio);
    status.textContent = "Announcement generated and playing.";

    audio.addEventListener("ended", () => {
      button.disabled = false;
      button.textContent = "Announce It";
    });
  } catch (error) {
    status.textContent = `Announcement failed: ${error.message}`;
    button.disabled = false;
    button.textContent = "Announce It";
  }
}

function setupAnnouncementConsole() {
  const input = document.getElementById("announcementText");
  const announceButton = document.getElementById("announceIt");
  const clearButton = document.getElementById("clearAnnouncement");
  const status = document.getElementById("announcementStatus");

  if (!input || !announceButton || !status) return;

  announceButton.addEventListener("click", () => announceText(input.value, announceButton, status));

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      input.value = "";
      input.focus();
      status.textContent = "Ready.";
    });
  }
}

renderPresetButtons();
setupAnnouncementConsole();
