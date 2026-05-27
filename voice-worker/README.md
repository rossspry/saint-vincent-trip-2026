# Inconceivable AI Voice Worker

This folder contains a Cloudflare Worker that turns the generated Captain's Update text into an MP3 using OpenAI text-to-speech.

The public GitHub Pages site must not contain the OpenAI API key. The key belongs in the Cloudflare Worker environment.

## Setup

1. Create a Cloudflare account if you do not already have one.
2. Go to Workers & Pages.
3. Create a new Worker.
4. Paste the contents of `openai-tts-worker.js` into the Worker editor.
5. Add a Worker secret named `OPENAI_API_KEY`.
6. Optionally add these environment variables:
   - `OPENAI_VOICE` such as `cedar`
   - `OPENAI_VOICE_INSTRUCTIONS` for the captain voice style
7. Deploy the Worker.
8. Copy the deployed Worker URL.
9. Update `AI_VOICE_ENDPOINT` in `app.js` with that Worker URL.

## Dashboard behavior

Once the Worker URL is added to `app.js`, the dashboard can:

1. Generate the Captain's Update text.
2. Send it to the Worker.
3. Receive an MP3.
4. Play the MP3 in the browser.

## Important

The current browser speech button is only a preview. The Worker is the real AI voice path.
