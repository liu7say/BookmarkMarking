// Background service worker for Chrome Extension MV3
// Enables clicking the extension icon to automatically open the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("Error setting panel behavior:", error));
