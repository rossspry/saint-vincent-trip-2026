const CUSTOM_CHIME_URL = "https://drive.google.com/uc?export=download&id=1xTRWClbNVpepUkFMZY3M9d-mF4FaQ8QE";

const ANNOUNCEMENT_PRESETS = {
  nonEmergency: [
    {
      label: "Breakfast is ready",
      text: "Good Morning Inconceivable Sailors. Breakfast is being served on the Lido Deck. I repeat, breakfast is now being served on the Lido Deck."
    },
    {
      label: "Lunch is ready",
      text: "Good Afternoon Inconceivable Sailors. Lunch is being served on the Lido Deck. I repeat, lunch is now being served on the Lido Deck."
    },
    {
      label: "Dinner is ready",
      text: "Good Evening Inconceivable Sailors. Dinner is being served on the Lido Deck. I repeat, dinner is now being served on the Lido Deck."
    },
    {
      label: "All hands on deck",
      text: "All hands on deck. I repeat, all hands on deck."
    },
    {
      label: "Salon briefing",
      text: "All hands to the salon for a briefing. I repeat, all hands to the salon for a briefing."
    },
    {
      label: "Pre-sail checklist",
      text: "Good morning. It is time to begin our pre-sail checklist and prepare to sail. Rise and shine."
    },
    {
      label: "Secure loose items",
      text: "Please secure all loose items before we get underway. Check cabins, galley, cockpit, and deck."
    },
    {
      label: "Dinghy crew",
      text: "Dinghy crew, please report to the stern for departure. Bring shoes, water, and anything needed ashore."
    },
    {
      label: "Snorkel gear check",
      text: "Snorkel gear check. Masks, fins, snorkels, towels, sunscreen, and water bottles."
    },
    {
      label: "Anchor watch",
      text: "Anchor watch reminder. Check our position and confirm we are holding."
    },
    {
      label: "Quiet time",
      text: "Quiet time on deck. Please keep voices low and lights down."
    },
    {
      label: "Crew photo",
      text: "Photo time. Everybody up top for a crew picture."
    },
    {
      label: "Hydration check",
      text: "Hydration check. Everybody drink water now."
    },
    {
      label: "Squall watch",
      text: "Squall watch. Secure hatches and loose gear."
    }
  ],
  emergency: [
    {
      label: "Life jackets / dinghy",
      text: "All hands, put your life jackets on and meet at the dinghy. I repeat, all hands put your life jackets on and meet at the dinghy."
    },
    {
      label: "Person in water",
      text: "Person in the water. Person in the water. Person in the water. Ken take the helm. Whitney grab the throwable. Kelli keep eyes on the person in the water. Ava and Riley put on life jackets and point. Grayson stay with your father or the nearest adult."
    },
    {
      label: "Fire aboard",
      text: "Fire aboard. Fire aboard. All hands put on life jackets. Move away from smoke. Await instructions."
    },
    {
      label: "Medical emergency",
      text: "Medical emergency. Medical emergency. Bring the first aid kit. Clear space around the patient. One person prepare to call for help."
    },
    {
      label: "Go forward",
      text: "Emergency instruction. Put on life jackets. Move carefully to the forward deck and hold a secure handhold."
    }
  ]
};

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function playTone(ctx, start, frequency, duration, gainValue = 0.22) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playBuiltInChime() {
  const ctx = createAudioContext();
  if (!ctx) return Promise.resolve();
  const now = ctx.currentTime + 0.05;
  playTone(ctx, now, 784, 0.32, 0.18);
  playTone(ctx, now + 0.28, 784, 0.32, 0.18);
  playTone(ctx, now + 0.58, 523.25, 0.65, 0.22);
  return new Promise((resolve) => setTimeout(resolve, 1500));
}

function playAudioUrl(url, fallback) {
  if (!url) return fallback();
  return new Promise((resolve) => {
    const audio = new Audio(url);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", async () => {
      if (settled) return;
      settled = true;
      await fallback();
      resolve();
    }, { once: true });
    audio.play().catch(async () => {
      if (settled) return;
      settled = true;
      await fallback();
      resolve();
    });
  });
}

function playChime() {
  return playAudioUrl(CUSTOM_CHIME_URL, playBuiltInChime);
}

function playEmergencyAlarm() {
  const ctx = createAudioContext();
  if (!ctx) return Promise.resolve();
  const now = ctx.currentTime + 0.05;
  for (let i = 0; i < 6; i += 1) {
    const start = now + i * 0.33;
    playTone(ctx, start, 880, 0.18, 0.28);
    playTone(ctx, start + 0.16, 440, 0.18, 0.28);
  }
  return new Promise((resolve) => setTimeout(resolve, 2400));
}

function renderPresetButtons() {
  const grid = document.getElementById("announcementPresets");
  const input = document.getElementById("announcementText");
  if (!grid || !input) return;

  const renderGroup = (title, presetType, presets) => `
    <div class="preset-group preset-${presetType}">
      <h3>${title}</h3>
      <div class="preset-button-grid">
        ${presets.map((preset) => `<button class="preset-button" type="button" data-preset-type="${presetType}" data-preset="${encodeURIComponent(preset.text)}">${preset.label}</button>`).join("")}
      </div>
    </div>
  `;

  grid.innerHTML = `
    ${renderGroup("Non-emergency announcements", "nonEmergency", ANNOUNCEMENT_PRESETS.nonEmergency)}
    ${renderGroup("Emergency announcements", "emergency", ANNOUNCEMENT_PRESETS.emergency)}
  `;

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-preset]");
    if (!button) return;
    input.value = decodeURIComponent(button.dataset.preset);
    input.dataset.announcementType = button.dataset.presetType || "nonEmergency";
    input.focus();
  });
}

async function playVoice(text, status) {
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

  return new Promise((resolve) => {
    audio.addEventListener("ended", resolve, { once: true });
    audio.addEventListener("error", resolve, { once: true });
  });
}

async function announceText(text, type, button, status) {
  if (!text.trim()) {
    status.textContent = "Type an announcement or choose a preset first.";
    return;
  }

  const announcementType = type === "emergency" ? "emergency" : "nonEmergency";
  button.disabled = true;
  button.textContent = "Announcing...";

  try {
    if (announcementType === "emergency") {
      status.textContent = "Playing emergency alarm bells.";
      await playEmergencyAlarm();
      status.textContent = "Generating emergency AI voice announcement.";
      await playVoice(text, status);
      status.textContent = "Repeating emergency alarm bells.";
      await playEmergencyAlarm();
      status.textContent = "Emergency announcement complete.";
    } else {
      status.textContent = "Playing custom chime.";
      await playChime();
      status.textContent = "Generating AI voice announcement.";
      await playVoice(text, status);
      status.textContent = "Announcement complete.";
    }
  } catch (error) {
    status.textContent = `Announcement failed: ${error.message}`;
  } finally {
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

  input.dataset.announcementType = "nonEmergency";

  announceButton.addEventListener("click", () => announceText(input.value, input.dataset.announcementType, announceButton, status));

  input.addEventListener("input", () => {
    input.dataset.announcementType = "nonEmergency";
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      input.value = "";
      input.dataset.announcementType = "nonEmergency";
      input.focus();
      status.textContent = "Ready.";
    });
  }
}

renderPresetButtons();
setupAnnouncementConsole();
