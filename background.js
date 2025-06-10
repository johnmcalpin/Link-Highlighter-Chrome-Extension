// background.js - Service Worker for Link Highlighter Extension

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
        
        // Update all active tabs
        const tabs = await chrome.tabs.query({});
        const updatePromises = [];
        
        for (const tab of tabs) {
          if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
            const messagePromise = chrome.tabs.sendMessage(tab.id, { 
              action: newState ? 'enableHighlighting' : 'disableHighlighting' 
            }).catch(error => {
              // Tab might not have content script injected yet, ignore error
              console.log(`Could not message tab ${tab.id}:`, error.message);
            });
            updatePromises.push(messagePromise);
          }
        }
        
        // Wait for all tab updates to complete
        await Promise.allSettled(updatePromises);
        
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
        
        // Notify all tabs of settings change
        const tabs = await chrome.tabs.query({});
        const updatePromises = [];
        
        for (const tab of tabs) {
          if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
            const messagePromise = chrome.tabs.sendMessage(tab.id, { 
              action: 'updateSettings',
              settings: request.settings
            }).catch(error => {
              // Tab might not have content script injected yet, ignore error
              console.log(`Could not message tab ${tab.id}:`, error.message);
            });
            updatePromises.push(messagePromise);
          }
        }
        
        await Promise.allSettled(updatePromises);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error updating settings:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
});

// Handle tab updates to inject highlighting if enabled
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    
    try {
      const result = await chrome.storage.sync.get(['enabled']);
      const isEnabled = result.enabled === true;
      
      // Only send enable message if extension is actually enabled
      if (isEnabled) {
        // Add a small delay to ensure content script is loaded
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tabId, { action: 'enableHighlighting' });
          } catch (error) {
            // Content script might not be ready yet, ignore error
            console.log(`Could not message tab ${tabId} on load:`, error.message);
          }
        }, 100);
      }
    } catch (error) {
      console.log(`Error checking state for tab ${tabId}:`, error.message);
    }
  }
});