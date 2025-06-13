// popup.js - Popup Script for Link Highlighter Extension

class PopupController {
  constructor() {
    this.elements = {
      enableToggle: document.getElementById('enableToggle'),
      statusText: document.getElementById('statusText'),
      regularCount: document.getElementById('regularCount'),
      jsCount: document.getElementById('jsCount'),
      regularColor: document.getElementById('regularColor'),
      jsColor: document.getElementById('jsColor'),
      newTabCheckbox: document.getElementById('newTabCheckbox'),
      statsSection: document.getElementById('statsSection'),
      settingsSection: document.getElementById('settingsSection')
    };
    
    this.init();
  }
  
  async init() {
    try {
      // Load current settings and state
      await this.loadSettings();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Update stats if extension is enabled
      await this.updateStats();
      
    } catch (error) {
      console.error('Error initializing popup:', error);
      this.showError('Failed to load extension settings');
    }
  }
  
  async loadSettings() {
    try {
      // Get settings from background script
      const response = await this.sendMessage({ action: 'getSettings' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Update UI with actual stored values (defaults to disabled)
      // Be very explicit about the enabled state
      const enabled = response.enabled === true;
      const regularColor = response.regularLinkColor || '#ff0000';
      const jsColor = response.jsLinkColor || '#ffff00';
      const openInNewTab = response.openInNewTab !== undefined ? response.openInNewTab : true;
      
      console.log('Loaded settings:', { enabled, regularColor, jsColor, openInNewTab });
      
      // Update toggle switch to reflect actual state
      this.updateToggleState(enabled);
      
      // Update color pickers
      this.elements.regularColor.value = regularColor;
      this.elements.jsColor.value = jsColor;
      this.elements.newTabCheckbox.checked = openInNewTab;
      
      // Update UI state based on enabled status
      this.updateUIState(enabled);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      // If we can't load settings, ensure we start disabled
      this.updateToggleState(false);
      this.updateUIState(false);
      this.showError(`Failed to load settings: ${error.message}`);
    }
  }
  
  setupEventListeners() {
    // Toggle switch
    this.elements.enableToggle.addEventListener('click', () => {
      this.toggleExtension();
    });
    
    // Color pickers
    this.elements.regularColor.addEventListener('change', () => {
      this.updateSetting('regularLinkColor', this.elements.regularColor.value);
    });
    
    this.elements.jsColor.addEventListener('change', () => {
      this.updateSetting('jsLinkColor', this.elements.jsColor.value);
    });
    
    // New tab checkbox
    this.elements.newTabCheckbox.addEventListener('change', () => {
      this.updateSetting('openInNewTab', this.elements.newTabCheckbox.checked);
    });
  }
  
  async toggleExtension() {
    try {
      const response = await this.sendMessage({ action: 'toggleExtension' });
      
      if (response.error || !response.success) {
        throw new Error(response.error || 'Unknown error occurred');
      }
      
      // Update UI based on new state
      this.updateToggleState(response.enabled);
      this.updateUIState(response.enabled);
      
      console.log('Extension toggled successfully:', response.enabled);
      
      // Update stats after toggle with a longer delay to ensure content script is ready
      setTimeout(() => this.updateStats(), 500);
      
    } catch (error) {
      console.error('Error toggling extension:', error);
      this.showError(`Failed to toggle extension: ${error.message}`);
      
      // Reload settings to ensure UI is in correct state
      setTimeout(() => this.loadSettings(), 1000);
    }
  }
  
  async updateSetting(key, value) {
    try {
      const settings = { [key]: value };
      const response = await this.sendMessage({ 
        action: 'updateSettings', 
        settings 
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('Error updating setting:', error);
      this.showError('Failed to update setting');
    }
  }
  
  updateToggleState(enabled) {
    if (enabled) {
      this.elements.enableToggle.classList.add('active');
      this.elements.statusText.textContent = 'Extension is enabled';
    } else {
      this.elements.enableToggle.classList.remove('active');
      this.elements.statusText.textContent = 'Extension is disabled';
    }
  }
  
  updateUIState(enabled) {
    if (enabled) {
      this.elements.statsSection.classList.remove('disabled-overlay');
      this.elements.settingsSection.classList.remove('disabled-overlay');
    } else {
      this.elements.statsSection.classList.add('disabled-overlay');
      this.elements.settingsSection.classList.add('disabled-overlay');
      // Reset stats when disabled
      this.elements.regularCount.textContent = '0';
      this.elements.jsCount.textContent = '0';
    }
  }
  
  async updateStats() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url.startsWith('http')) {
        this.elements.regularCount.textContent = 'N/A';
        this.elements.jsCount.textContent = 'N/A';
        return;
      }
      
      // Get stats from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
      
      if (response && !response.error) {
        this.elements.regularCount.textContent = response.regularLinks || 0;
        this.elements.jsCount.textContent = response.jsLinks || 0;
      } else {
        this.elements.regularCount.textContent = '0';
        this.elements.jsCount.textContent = '0';
      }
      
    } catch (error) {
      // Content script might not be ready or page might not support it
      this.elements.regularCount.textContent = '0';
      this.elements.jsCount.textContent = '0';
    }
  }
  
  sendMessage(message) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { error: 'No response received' });
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        resolve({ error: error.message });
      }
    });
  }
  
  showError(message) {
    console.error(message);
    this.elements.statusText.textContent = `Error: ${message}`;
    this.elements.statusText.style.color = '#ffcccb';
    
    // Reset error message after 3 seconds
    setTimeout(() => {
      this.elements.statusText.style.color = '';
      this.loadSettings(); // Reload to show correct status
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Get the current date 
document.addEventListener('DOMContentLoaded', function() {
  var currentYear = new Date().getFullYear();
  document.getElementById('currentYear').textContent = currentYear;
});
