// Google Apps Script for Inconceivable Photo Box feed
// Purpose: publish the latest 10 photos from the shared Google Drive Photo Box as JSON.
//
// Setup:
// 1. Go to https://script.google.com
// 2. New project
// 3. Paste this file
// 4. Set PHOTO_FOLDER_ID to the folder ID below
// 5. Deploy > New deployment > Web app
// 6. Execute as: Me
// 7. Who has access: Anyone with the link
// 8. Use the web app URL as the photo feed source or copy the output into photos.json

const PHOTO_FOLDER_ID = '1KYD_44wOEdmn48rLzYyVFDK9enNutFYU';
const MAX_PHOTOS = 10;

function doGet() {
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

  return ContentService
    .createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
