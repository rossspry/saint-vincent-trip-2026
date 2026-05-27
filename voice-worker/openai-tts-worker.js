const ALLOWED_ORIGIN = "https://rossspry.github.io";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Use POST." }, 405);
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.text) {
      return jsonResponse({ error: "Missing text." }, 400);
    }

    const text = String(body.text).trim();
    if (!text) {
      return jsonResponse({ error: "Missing text." }, 400);
    }

    if (text.length > 4500) {
      return jsonResponse({ error: "Text is too long." }, 400);
    }

    const voice = String(body.voice || env.OPENAI_VOICE || "cedar");
    const instructions = String(
      body.instructions ||
      env.OPENAI_VOICE_INSTRUCTIONS ||
      "Speak like a warm confident sailing captain making a fun but clear shipboard announcement. Calm Caribbean vacation energy. Natural pacing."
    );

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
        instructions,
        response_format: "mp3"
      })
    });

    if (!response.ok) {
      const details = await response.text();
      return jsonResponse({ error: "Speech request failed.", status: response.status, details: details.slice(0, 700) }, 502);
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  }
};
