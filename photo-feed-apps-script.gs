// Google Apps Script for Inconceivable Photo Box feed
// Purpose: publish the latest 10 photos from the shared Google Drive Photo Box.
//
// IMPORTANT FOR GITHUB PAGES:
// GitHub Pages cannot always fetch Google Apps Script JSON directly because of browser CORS rules.
// This script supports both:
//   1. Plain JSON:     .../exec
//   2. JSONP callback: .../exec?callback=someFunctionName
// The family page uses JSONP so the photo feed works from a static website.
//
// Setup:
// 1. Go to https://script.google.com
// 2. New project or open the existing photo feed project
// 3. Paste this entire file
// 4. Deploy > Manage deployments > Edit pencil > New version > Deploy
// 5. Web app settings:
//    - Execute as: Me
//    - Who has access: Anyone with the link
// 6. Use the /exec web app URL on the family page. Avoid /dev for family/public use.

const PHOTO_FOLDER_ID = '1KYD_44wOEdmn48rLzYyVFDK9enNutFYU';
const MAX_PHOTOS = 10;

function safeCallbackName(value) {
  const name = String(value || '').trim();
  return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name) ? name : '';
}

function doGet(e) {
  const folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  const files = folder.getFiles();
  const photos = [];

  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();

    if (!mimeType || !mimeType.startsWith('image/')) {
      continue;
    }

    const id = file.getId();
    photos.push({
      id,
      title: file.getName(),
      created: file.getDateCreated().toISOString(),
      updated: file.getLastUpdated().toISOString(),
      viewUrl: `https://drive.google.com/file/d/${id}/view`,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w1200`
    });
  }

  photos.sort((a, b) => new Date(b.created) - new Date(a.created));

  const payload = {
    generatedAt: new Date().toISOString(),
    mainPhoto: photos[0] || null,
    photos: photos.slice(0, MAX_PHOTOS)
  };

  const callback = safeCallbackName(e && e.parameter && e.parameter.callback);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
