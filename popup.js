// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');
  const linkColorInput = document.getElementById('linkColor');
  const jsLinkColorInput = document.getElementById('jsLinkColor');
  const websiteLink = document.getElementById('websiteLink');
  const extensionLink = document.getElementById('extensionLink');
  const statsSection = document.getElementById('statsSection');
  const regularLinkCount = document.getElementById('regularLinkCount');
  const jsLinkCount = document.getElementById('jsLinkCount');

  let currentTabId = null;

  // Initialize popup with stored settings
  initializePopup();

  // Listen for stats updates from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'statsUpdated') {
      updateLinkStats(message.stats);
    }
  });

  // Toggle switch functionality
  toggleSwitch.addEventListener('click', function() {
    const isActive = toggleSwitch.classList.contains('active');
    const newState = !isActive;
    
    updateToggleState(newState);
    saveSettings();
    if (newState) {
      // Inject content script and apply settings
      injectAndApplySettings();
    } else {
      // Just send settings to disable
      sendSettingsToContentScript();
    }
  });

  // Color picker event listeners
  linkColorInput.addEventListener('change', function() {
    saveSettings();
    sendSettingsToContentScript();
  });

  jsLinkColorInput.addEventListener('change', function() {
    saveSettings();
    sendSettingsToContentScript();
  });

  // Update credit links (you'll need to replace these URLs)
  websiteLink.href = 'https://yourwebsite.com'; // Replace with your website
  extensionLink.href = 'https://chrome.google.com/webstore/detail/your-extension-id'; // Replace with your extension store page

  async function initializePopup() {
    // Get current tab
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0]) {
      currentTabId = tabs[0].id;
      
      // Check if we can inject on this tab
      if (!canInjectOnTab(tabs[0].url)) {
        showUnsupportedPageMessage();
        return;
      }
    }
    
    loadSettings();
  }

  function canInjectOnTab(url) {
    return url && 
           !url.startsWith('chrome://') && 
           !url.startsWith('chrome-extension://') && 
           !url.startsWith('edge://') && 
           !url.startsWith('about:') &&
           !url.startsWith('moz-extension://');
  }

  function showUnsupportedPageMessage() {
    status.textContent = 'Not supported on this page';
    status.className = 'status disabled';
    toggleSwitch.style.opacity = '0.5';
    toggleSwitch.style.pointerEvents = 'none';
  }

  function loadSettings() {
    chrome.storage.sync.get({
      enabled: false,
      linkColor: '#ff0000',
      jsLinkColor: '#ffff00'
    }, function(result) {
      updateToggleState(result.enabled);
      linkColorInput.value = result.linkColor;
      jsLinkColorInput.value = result.jsLinkColor;
    });
  }

  function saveSettings() {
    const settings = {
      enabled: toggleSwitch.classList.contains('active'),
      linkColor: linkColorInput.value,
      jsLinkColor: jsLinkColorInput.value
    };

    chrome.storage.sync.set(settings);
  }

  function updateToggleState(enabled) {
    if (enabled) {
      toggleSwitch.classList.add('active');
      status.textContent = 'Enabled';
      status.className = 'status enabled';
    } else {
      toggleSwitch.classList.remove('active');
      status.textContent = 'Disabled';
      status.className = 'status disabled';
      // Hide stats when disabled
      statsSection.style.display = 'none';
    }
  }

  function updateLinkStats(stats) {
    if (stats && stats.regularLinks !== undefined && stats.jsLinks !== undefined) {
      regularLinkCount.textContent = stats.regularLinks;
      jsLinkCount.textContent = stats.jsLinks;
      statsSection.style.display = 'block';
    } else {
      statsSection.style.display = 'none';
    }
  }

  async function injectAndApplySettings() {
    if (!currentTabId) return;
    
    try {
      // First inject the content script
      const response = await chrome.runtime.sendMessage({
        action: 'injectContentScript',
        tabId: currentTabId
      });
      
      if (response.success) {
        // Wait a bit for the script to initialize, then send settings
        setTimeout(() => {
          sendSettingsToContentScript();
        }, 100);
      } else {
        console.error('Failed to inject content script:', response.error);
        updateToggleState(false);
      }
    } catch (error) {
      console.error('Error injecting content script:', error);
      updateToggleState(false);
    }
  }

  function sendSettingsToContentScript() {
    if (!currentTabId) return;
    
    const settings = {
      enabled: toggleSwitch.classList.contains('active'),
      linkColor: linkColorInput.value,
      jsLinkColor: jsLinkColorInput.value
    };

    // Send message via background script for better reliability
    chrome.runtime.sendMessage({
      action: 'sendSettingsToTab',
      tabId: currentTabId,
      settings: settings
    });
  }
});