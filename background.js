// background.js - Service Worker for Link Highlighter Extension

// Track which tabs have content script injected
const injectedTabs = new Set();

// Initialize extension state on installation - DEFAULTS TO DISABLED
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default state to DISABLED on fresh install
    await chrome.storage.sync.set({
      enabled: false,
      regularLinkColor: '#ff0000',
      jsLinkColor: '#ffff00',
      openInNewTab: true
    });
    console.log('Link Highlighter installed - defaulting to DISABLED');
  }
});

// Inject content script into a tab if not already injected
async function ensureContentScript(tabId) {
  if (injectedTabs.has(tabId)) {
    return true;
  }
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    injectedTabs.add(tabId);
    console.log(`Content script injected into tab ${tabId}`);
    return true;
  } catch (error) {
    console.log(`Failed to inject content script into tab ${tabId}:`, error.message);
    return false;
  }
}

// Send message to tab with content script injection if needed
async function sendMessageToTab(tabId, message) {
  const injected = await ensureContentScript(tabId);
  if (!injected) {
    throw new Error('Could not inject content script');
  }
  
  // Small delay to ensure content script is ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return chrome.tabs.sendMessage(tabId, message);
}

// Handle extension toggle from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleExtension') {
    (async () => {
      try {
        const result = await chrome.storage.sync.get(['enabled']);
        const currentState = result.enabled === true; // Explicit boolean check
        const newState = !currentState;
        
        await chrome.storage.sync.set({ enabled: newState });
        
        console.log('Extension toggled:', { from: currentState, to: newState });
        
        // Update current active tab only (using activeTab permission)
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (activeTab && activeTab.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
          try {
            await sendMessageToTab(activeTab.id, { 
              action: newState ? 'enableHighlighting' : 'disableHighlighting' 
            });
          } catch (error) {
            console.log(`Could not message active tab ${activeTab.id}:`, error.message);
          }
        }
        
        sendResponse({ enabled: newState, success: true });
      } catch (error) {
        console.error('Error toggling extension:', error);
        sendResponse({ error: error.message, success: false });
      }
    })();
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'getSettings') {
    (async () => {
      try {
        const settings = await chrome.storage.sync.get([
          'enabled',
          'regularLinkColor',
          'jsLinkColor',
          'openInNewTab'
        ]);
        
        // Ensure enabled is explicitly boolean
        settings.enabled = settings.enabled === true;
        
        sendResponse(settings);
      } catch (error) {
        console.error('Error getting settings:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'updateSettings') {
    (async () => {
      try {
        await chrome.storage.sync.set(request.settings);
        
        // Update current active tab only
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (activeTab && activeTab.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
          try {
            await sendMessageToTab(activeTab.id, { 
              action: 'updateSettings',
              settings: request.settings
            });
          } catch (error) {
            console.log(`Could not message active tab ${activeTab.id}:`, error.message);
          }
        }
        
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error updating settings:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getStatus') {
    (async () => {
      try {
        // Get current active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!activeTab || !activeTab.url || !(activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
          sendResponse({ error: 'Invalid tab' });
          return;
        }
        
        // Forward the request to the content script
        const response = await sendMessageToTab(activeTab.id, { action: 'getStatus' });
        sendResponse(response);
      } catch (error) {
        console.error('Error getting status:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
});

// Clean up injected tabs tracking when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// Clean up injected tabs tracking when tabs navigate away
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    injectedTabs.delete(tabId);
  }
});