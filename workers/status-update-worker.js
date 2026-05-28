// Cloudflare Worker: secure status update endpoint for Inconceivable trip site
//
// Purpose:
// - Accept captain status updates from the dashboard
// - Update manual-status.json in GitHub
// - Trigger the site to show the updated meal plan and crew message
//
// Required Cloudflare secrets / variables:
// - GITHUB_TOKEN: GitHub fine-grained token with Contents read/write for this repo
// - UPDATE_SECRET: private password/token you type from the dashboard
//
// Optional variables:
// - GITHUB_REPO: defaults to rossspry/saint-vincent-trip-2026
// - GITHUB_BRANCH: defaults to main

const DEFAULT_REPO = "rossspry/saint-vincent-trip-2026";
const DEFAULT_BRANCH = "main";
const FILE_PATH = "manual-status.json";
const ALLOWED_ORIGIN = "https://rossspry.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Update-Secret",
    "Access-Control-Max-Age": "86400"
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function b64EncodeUtf8(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function cleanString(value, fallback = "") {
  return String(value || fallback).trim();
}

function cleanMeal(meal, fallbackChoice) {
  return {
    choice: cleanString(meal?.choice, fallbackChoice),
    custom: cleanString(meal?.custom, "")
  };
}

function normalizePayload(body) {
  const meals = body.meals || {};
  const dinnerMeal = cleanMeal(meals.dinner, "Dinner onboard");
  const dinnerText = dinnerMeal.custom || dinnerMeal.choice;

  return {
    status: "manual fallback",
    date: cleanString(body.date, new Date().toISOString().slice(0, 10)),
    locationName: cleanString(body.locationName),
    latitude: typeof body.latitude === "number" ? body.latitude : undefined,
    longitude: typeof body.longitude === "number" ? body.longitude : undefined,
    mapZoom: typeof body.mapZoom === "number" ? body.mapZoom : undefined,
    weather: cleanString(body.weather),
    tonight: cleanString(body.tonight),
    tomorrow: cleanString(body.tomorrow),
    activities: cleanString(body.activities),
    funnyNote: cleanString(body.funnyNote),
    captainMessage: cleanString(body.captainMessage),
    meals: {
      breakfast: cleanMeal(meals.breakfast, "Regular breakfast onboard"),
      lunch: cleanMeal(meals.lunch, "Lunch onboard"),
      dinner: dinnerMeal
    },
    dinner: dinnerText,
    note: "Updated from protected captain dashboard worker. AIS remains the primary source when available."
  };
}

async function getCurrentFile(repo, branch, token) {
  const url = `https://api.github.com/repos/${repo}/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "inconceivable-status-worker"
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Could not read ${FILE_PATH}: ${response.status} ${details.slice(0, 300)}`);
  }

  return await response.json();
}

async function updateFile(repo, branch, token, sha, content) {
  const url = `https://api.github.com/repos/${repo}/contents/${FILE_PATH}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "inconceivable-status-worker"
    },
    body: JSON.stringify({
      message: "Update manual trip status from captain dashboard",
      content: b64EncodeUtf8(JSON.stringify(content, null, 2) + "\n"),
      sha,
      branch
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Could not update ${FILE_PATH}: ${response.status} ${details.slice(0, 300)}`);
  }

  return await response.json();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Use POST." }, 405);
    }

    if (!env.GITHUB_TOKEN) {
      return jsonResponse({ error: "GITHUB_TOKEN is not configured." }, 500);
    }

    if (!env.UPDATE_SECRET) {
      return jsonResponse({ error: "UPDATE_SECRET is not configured." }, 500);
    }

    const suppliedSecret = request.headers.get("X-Update-Secret") || "";
    if (suppliedSecret !== env.UPDATE_SECRET) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return jsonResponse({ error: "Invalid JSON." }, 400);
    }

    const repo = env.GITHUB_REPO || DEFAULT_REPO;
    const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
    const payload = normalizePayload(body);

    try {
      const current = await getCurrentFile(repo, branch, env.GITHUB_TOKEN);
      const result = await updateFile(repo, branch, env.GITHUB_TOKEN, current.sha, payload);
      return jsonResponse({ ok: true, commit: result.commit?.sha || null, path: FILE_PATH });
    } catch (error) {
      return jsonResponse({ error: error.message }, 502);
    }
  }
};
