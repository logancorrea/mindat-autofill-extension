# Mindat Autofill Chrome Extension

This Chrome extension autofills the specimen entry form at [Mindat.org](https://www.mindat.org/catedit.php) using data from your personal Google Sheet via a Google Apps Script.

## Setup

1. Replace `YOUR_SCRIPT_ID` in `content.js` with your deployed Google Apps Script Web App ID.
2. Go to `chrome://extensions` in your browser.
3. Enable Developer Mode.
4. Click "Load unpacked" and select this folder.

## Customize

- Change the `catalogId` variable to the specimen ID you'd like to autofill.
- You can also make it dynamic by prompting the user or adding a popup later.

## Note

Keep your script private and secure. This extension is for personal use only.
