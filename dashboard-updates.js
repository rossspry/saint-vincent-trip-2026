const STATUS_DRAFT_KEY = "svgTripStatusDraftV1";
const STATUS_SECRET_KEY = "svgTripStatusSecretV1";
const STATUS_WORKER_ENDPOINT = "https://inconceivable-status-update.rossspry.workers.dev/";

function dashboardEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadStatusDraft() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_DRAFT_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStatusDraft(data) {
  localStorage.setItem(STATUS_DRAFT_KEY, JSON.stringify(data));
}

function mealChoiceText(choice, custom) {
  const customText = String(custom || "").trim();
  if (customText) return customText;
  return String(choice || "Not set yet").trim();
}

function formMealPayload(form) {
  return {
    breakfast: {
      choice: form.breakfastChoice.value,
      custom: form.breakfastCustom.value.trim()
    },
    lunch: {
      choice: form.lunchChoice.value,
      custom: form.lunchCustom.value.trim()
    },
    dinner: {
      choice: form.dinnerChoice.value,
      custom: form.dinnerCustom.value.trim()
    }
  };
}

function addCaptainStatusForm() {
  const mealsSection = document.getElementById("meals");
  if (!mealsSection || document.getElementById("captainStatusForm")) return;

  const panel = document.createElement("div");
  panel.className = "captain-status-editor";
  panel.innerHTML = `
    <div class="section-heading compact-heading">
      <p class="eyebrow">Family status editor</p>
      <h2>Update meals and crew message</h2>
      <p>This publishes to the protected update worker, then GitHub updates the family page data.</p>
    </div>
    <form id="captainStatusForm" class="status-editor-form">
      <label>
        Update password
        <input name="updateSecret" type="password" placeholder="Enter the UPDATE_SECRET from Cloudflare" autocomplete="current-password" />
      </label>

      <label>
        Message from the crew
        <textarea name="captainMessage" rows="3" placeholder="We are anchored off Bequia, everyone is happy, and the sunset is ridiculous."></textarea>
      </label>

      <div class="meal-editor-grid">
        <fieldset>
          <legend>Breakfast</legend>
          <label>
            Plan
            <select name="breakfastChoice">
              <option>Regular breakfast onboard</option>
              <option>Breakfast onshore</option>
              <option>Custom</option>
            </select>
          </label>
          <label>
            Custom breakfast note
            <input name="breakfastCustom" type="text" placeholder="Skipping breakfast today / local delivery / etc." />
          </label>
        </fieldset>

        <fieldset>
          <legend>Lunch</legend>
          <label>
            Plan
            <select name="lunchChoice">
              <option>Lunch onboard</option>
              <option>Lunch onshore</option>
              <option>Custom</option>
            </select>
          </label>
          <label>
            Custom lunch note
            <input name="lunchCustom" type="text" placeholder="Beach picnic / lunch ashore / etc." />
          </label>
        </fieldset>

        <fieldset>
          <legend>Dinner</legend>
          <label>
            Plan
            <select name="dinnerChoice">
              <option>Dinner onboard</option>
              <option>Dinner ashore</option>
              <option>Dinner custom</option>
            </select>
          </label>
          <label>
            Custom dinner note
            <input name="dinnerCustom" type="text" placeholder="Dinner at shore restaurant / local delivery / etc." />
          </label>
        </fieldset>
      </div>

      <label>
        Tonight / anchorage note
        <input name="tonight" type="text" placeholder="Tonight we are anchored in Admiralty Bay, Bequia." />
      </label>

      <label>
        What we are doing today
        <textarea name="activities" rows="3" placeholder="Snorkeling, beach time, fishing report, dinner ashore, etc."></textarea>
      </label>

      <label>
        Fun note / family snapshot headline
        <input name="funnyNote" type="text" placeholder="Crew morale is high and Grayson is hunting fish." />
      </label>

      <div class="button-row">
        <button class="button primary" type="submit">Publish Family Status</button>
        <button class="button secondary" type="button" id="copyStatusJson">Copy JSON</button>
        <button class="button secondary" type="button" id="downloadStatusJson">Download manual-status.json</button>
      </div>
      <p class="tiny" id="statusEditorNote">Ready to publish through the Cloudflare status worker.</p>
    </form>
    <div class="status-preview" id="statusPreview"></div>
  `;

  mealsSection.appendChild(panel);

  const form = panel.querySelector("#captainStatusForm");
  const preview = panel.querySelector("#statusPreview");
  const note = panel.querySelector("#statusEditorNote");
  const saved = loadStatusDraft();
  form.updateSecret.value = localStorage.getItem(STATUS_SECRET_KEY) || "";

  for (const [key, value] of Object.entries(saved)) {
    if (key === "meals") continue;
    if (form.elements[key]) form.elements[key].value = value || "";
  }
  if (saved.meals) {
    form.breakfastChoice.value = saved.meals.breakfast?.choice || "Regular breakfast onboard";
    form.breakfastCustom.value = saved.meals.breakfast?.custom || "";
    form.lunchChoice.value = saved.meals.lunch?.choice || "Lunch onboard";
    form.lunchCustom.value = saved.meals.lunch?.custom || "";
    form.dinnerChoice.value = saved.meals.dinner?.choice || "Dinner onboard";
    form.dinnerCustom.value = saved.meals.dinner?.custom || "";
  }

  function buildPayload() {
    const meals = formMealPayload(form);
    return {
      status: "manual fallback",
      date: new Date().toISOString().slice(0, 10),
      captainMessage: form.captainMessage.value.trim(),
      tonight: form.tonight.value.trim(),
      activities: form.activities.value.trim(),
      funnyNote: form.funnyNote.value.trim(),
      meals,
      dinner: mealChoiceText(meals.dinner.choice, meals.dinner.custom)
    };
  }

  function renderPreview(payload) {
    preview.innerHTML = `
      <h3>Family page preview</h3>
      <p><strong>Message:</strong> ${dashboardEscape(payload.captainMessage || "Not set yet")}</p>
      <p><strong>Breakfast:</strong> ${dashboardEscape(mealChoiceText(payload.meals.breakfast.choice, payload.meals.breakfast.custom))}</p>
      <p><strong>Lunch:</strong> ${dashboardEscape(mealChoiceText(payload.meals.lunch.choice, payload.meals.lunch.custom))}</p>
      <p><strong>Dinner:</strong> ${dashboardEscape(mealChoiceText(payload.meals.dinner.choice, payload.meals.dinner.custom))}</p>
      <p><strong>Tonight:</strong> ${dashboardEscape(payload.tonight || "Not set yet")}</p>
      <p><strong>Activities:</strong> ${dashboardEscape(payload.activities || "Not set yet")}</p>
    `;
  }

  function saveAndPreview() {
    const payload = buildPayload();
    saveStatusDraft(payload);
    renderPreview(payload);
    return payload;
  }

  form.addEventListener("input", () => {
    localStorage.setItem(STATUS_SECRET_KEY, form.updateSecret.value);
    saveAndPreview();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = saveAndPreview();
    const updateSecret = form.updateSecret.value.trim();

    if (!updateSecret) {
      note.textContent = "Enter the UPDATE_SECRET password first.";
      return;
    }

    try {
      note.textContent = "Publishing status update...";
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
      note.textContent = `Published to family status. Commit: ${result.commit || "done"}`;
    } catch (error) {
      note.textContent = `Publish failed: ${error.message}`;
    }
  });

  panel.querySelector("#copyStatusJson").addEventListener("click", async () => {
    const payload = saveAndPreview();
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    note.textContent = "Status JSON copied.";
  });

  panel.querySelector("#downloadStatusJson").addEventListener("click", () => {
    const payload = saveAndPreview();
    const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manual-status.json";
    a.click();
    URL.revokeObjectURL(url);
    note.textContent = "manual-status.json downloaded.";
  });

  saveAndPreview();
}

addCaptainStatusForm();
