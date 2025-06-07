// background.js - Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Link Highlighter extension installed');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectContentScript') {
    injectContentScript(message.tabId)
      .then(() => sendResponse({success: true}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'sendSettingsToTab') {
    chrome.tabs.sendMessage(message.tabId, {
      action: 'updateSettings',
      settings: message.settings
    }).catch(error => {
      console.log('Content script not ready:', error);
    });
  }
  
  // Handle stats messages from content script to popup
  if (message.action === 'updateStats') {
    // Forward stats to popup
    chrome.runtime.sendMessage({
      action: 'statsUpdated',
      stats: message.stats
    }).catch(() => {
      // Popup might be closed, ignore error
    });
  }
});

async function injectContentScript(tabId) {
  try {
    // First inject the CSS
    await chrome.scripting.insertCSS({
      target: { tabId: tabId },
      files: ['styles.css']
    });
    
    // Then inject the JavaScript
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    console.log('Content script injected successfully');
  } catch (error) {
    console.error('Failed to inject content script:', error);
    throw error;
  }
}

// Check if we can inject on this tab
function canInjectOnTab(url) {
  // Cannot inject on chrome:// pages, extension pages, etc.
  return url && 
         !url.startsWith('chrome://') && 
         !url.startsWith('chrome-extension://') && 
         !url.startsWith('edge://') && 
         !url.startsWith('about:') &&
         !url.startsWith('moz-extension://');
}