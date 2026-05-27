# Saint Vincent Trip 2026 Hub

A mobile-friendly trip dashboard for the June 2026 St. Vincent & The Grenadines catamaran charter aboard **Inconceivable**.

This repo contains a static website intended to be hosted with GitHub Pages. It centralizes the crew-facing trip hub, enhanced itinerary, daily captain updates, route notes, checklists, meal planning, weather resources, ports of call, activities, music/announcements, and reference links.

## Privacy note

This repository is currently public. Do not commit passport numbers, private medical details, personal phone numbers, charter contract details, or other sensitive information. Keep those in private Google Docs/Drive files and link to them only if permissions are restricted.

## Suggested GitHub Pages setup

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/** root.
5. Save.
6. GitHub will provide the live site URL after it deploys.

## Main files

- `index.html` — the complete trip hub interface
- `styles.css` — mobile-first charter dashboard styling
- `app.js` — local dashboard behavior, Today form saving, captain update generator, checklist state
