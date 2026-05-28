const WISHLIST_DRAFT_KEY = "svgTripWishlistDraftV1";

// Paste the deployed Google Apps Script Web App URL here when ready.
// It should support GET for list and POST for add/update/delete actions.
const WISHLIST_API_URL = "";

// Optional direct Google Sheet view link. Paste the Sheet URL here after creating it.
const WISHLIST_SHEET_URL = "";

function escapeWishlist(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadLocalItems() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_DRAFT_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalItems(items) {
  localStorage.setItem(WISHLIST_DRAFT_KEY, JSON.stringify(items));
}

function itemId() {
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderItems(items) {
  const list = document.getElementById("wishlistList");
  if (!list) return;

  if (!Array.isArray(items) || !items.length) {
    list.innerHTML = `<p class="tiny">No wishlist items yet.</p>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const checked = item.acquired ? "checked" : "";
    const deleted = item.deleted ? " wishlist-deleted" : "";
    return `
      <article class="wishlist-item${deleted}" data-id="${escapeWishlist(item.id)}">
        <label class="wishlist-check">
          <input type="checkbox" data-action="toggle" ${checked} />
          <span>
            <strong>${escapeWishlist(item.item)}</strong>
            <small>Requested by ${escapeWishlist(item.requestedBy || "Crew")}</small>
          </span>
        </label>
        <button class="wishlist-delete" type="button" data-action="delete" aria-label="Delete or reject item">×</button>
      </article>
    `;
  }).join("");
}

async function apiCall(action, payload = {}) {
  if (!WISHLIST_API_URL) return null;
  const response = await fetch(WISHLIST_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  if (!response.ok) throw new Error(`Wishlist API returned ${response.status}`);
  return await response.json();
}

async function loadSharedItems() {
  if (!WISHLIST_API_URL) return loadLocalItems();
  const response = await fetch(WISHLIST_API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Wishlist API returned ${response.status}`);
  const data = await response.json();
  return Array.isArray(data.items) ? data.items : [];
}

async function refreshList() {
  const status = document.getElementById("wishlistStatus");
  try {
    const items = await loadSharedItems();
    renderItems(items.filter((item) => !item.deleted));
    if (status) status.textContent = WISHLIST_API_URL ? "Wishlist synced from Google Sheet." : "Local draft mode. Add Google Apps Script URL to make this shared.";
  } catch (error) {
    const items = loadLocalItems();
    renderItems(items.filter((item) => !item.deleted));
    if (status) status.textContent = `Could not load shared list. Showing local draft. ${error.message}`;
  }
}

const sheetButton = document.getElementById("openWishlistSheet");
if (sheetButton) {
  if (WISHLIST_SHEET_URL) {
    sheetButton.href = WISHLIST_SHEET_URL;
  } else {
    sheetButton.href = "#";
    sheetButton.addEventListener("click", (event) => {
      event.preventDefault();
      const status = document.getElementById("wishlistStatus");
      if (status) status.textContent = "Add the Google Sheet URL to wishlist.js after the sheet is created.";
    });
  }
}

const form = document.getElementById("wishlistForm");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.getElementById("wishlistStatus");
    const data = new FormData(form);
    const item = {
      id: itemId(),
      requestedBy: String(data.get("requestedBy") || "Crew"),
      item: String(data.get("item") || "").trim(),
      acquired: false,
      deleted: false,
      createdAt: new Date().toISOString()
    };
    if (!item.item) return;

    if (WISHLIST_API_URL) {
      try {
        await apiCall("add", item);
        form.reset();
        if (status) status.textContent = "Wishlist item added to Google Sheet.";
        await refreshList();
        return;
      } catch (error) {
        if (status) status.textContent = `Shared add failed. Saved locally. ${error.message}`;
      }
    }

    const items = loadLocalItems();
    items.push(item);
    saveLocalItems(items);
    form.reset();
    renderItems(items.filter((entry) => !entry.deleted));
    if (status) status.textContent = "Wishlist item saved locally. Connect Google Apps Script to share it.";
  });
}

const refreshButton = document.getElementById("refreshWishlist");
if (refreshButton) refreshButton.addEventListener("click", refreshList);

const list = document.getElementById("wishlistList");
if (list) {
  list.addEventListener("click", async (event) => {
    const target = event.target;
    const itemCard = target.closest(".wishlist-item");
    if (!itemCard) return;
    const id = itemCard.dataset.id;
    const action = target.dataset.action;
    if (!action) return;

    const items = loadLocalItems();
    const item = items.find((entry) => entry.id === id);

    if (action === "toggle") {
      const acquired = Boolean(target.checked);
      if (WISHLIST_API_URL) {
        await apiCall("toggle", { id, acquired }).catch(console.warn);
        await refreshList();
        return;
      }
      if (item) item.acquired = acquired;
    }

    if (action === "delete") {
      if (WISHLIST_API_URL) {
        await apiCall("delete", { id }).catch(console.warn);
        await refreshList();
        return;
      }
      if (item) item.deleted = true;
    }

    saveLocalItems(items);
    renderItems(items.filter((entry) => !entry.deleted));
  });
}

refreshList();
