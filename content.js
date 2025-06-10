// content.js - Content Script for Link Highlighter Extension

class LinkHighlighter {
  constructor() {
    this.isEnabled = false;
    this.settings = {
      regularLinkColor: '#ff0000',
      jsLinkColor: '#ffff00',
      openInNewTab: true
    };
    this.highlightedElements = new Set();
    this.originalClickHandlers = new Map();
    this.observer = null;
    
    this.init();
  }
  
  async init() {
    // Listen for messages from background script FIRST
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
    
    // Get initial settings from storage
    try {
      const stored = await chrome.storage.sync.get([
        'enabled',
        'regularLinkColor', 
        'jsLinkColor',
        'openInNewTab'
      ]);
      
      // Extension starts DISABLED by default - be explicit about this
      this.isEnabled = stored.enabled === true; // Only true if explicitly set to true
      this.settings = {
        regularLinkColor: stored.regularLinkColor || '#ff0000',
        jsLinkColor: stored.jsLinkColor || '#ffff00',
        openInNewTab: stored.openInNewTab !== undefined ? stored.openInNewTab : true
      };
      
      // DO NOT auto-start highlighting - wait for explicit enable message
      console.log('Link Highlighter initialized:', { enabled: this.isEnabled });
      
    } catch (error) {
      console.error('Error loading settings:', error);
      // Ensure disabled on error
      this.isEnabled = false;
    }
  }
  
  handleMessage(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    
    switch (request.action) {
      case 'enableHighlighting':
        console.log('Enabling highlighting...');
        this.isEnabled = true;
        this.startHighlighting();
        sendResponse({ success: true, enabled: true });
        break;
        
      case 'disableHighlighting':
        console.log('Disabling highlighting...');
        this.isEnabled = false;
        this.stopHighlighting();
        sendResponse({ success: true, enabled: false });
        break;
        
      case 'updateSettings':
        console.log('Updating settings:', request.settings);
        this.settings = { ...this.settings, ...request.settings };
        if (this.isEnabled) {
          this.refreshHighlighting();
        }
        sendResponse({ success: true });
        break;
        
      case 'getStatus':
        const status = {
          enabled: this.isEnabled,
          regularLinks: this.countLinks('regular'),
          jsLinks: this.countLinks('js')
        };
        console.log('Sending status:', status);
        sendResponse(status);
        break;
        
      default:
        console.log('Unknown action:', request.action);
        sendResponse({ error: 'Unknown action' });
    }
    
    return true; // Keep message channel open
  }
  
  startHighlighting() {
    if (!this.isEnabled) return;
    
    this.highlightAllLinks();
    this.setupMutationObserver();
    console.log('Link highlighting started');
  }
  
  stopHighlighting() {
    this.removeAllHighlights();
    this.stopMutationObserver();
    console.log('Link highlighting stopped');
  }
  
  refreshHighlighting() {
    if (!this.isEnabled) return;
    
    this.removeAllHighlights();
    this.highlightAllLinks();
  }
  
  highlightAllLinks() {
    if (!this.isEnabled) return;
    
    // Find all regular links
    const regularLinks = document.querySelectorAll('a[href]:not([href^="javascript:"])');
    regularLinks.forEach(link => this.highlightElement(link, 'regular'));
    
    // Find all JavaScript links and elements with click handlers
    const jsLinks = document.querySelectorAll('a[href^="javascript:"], [onclick], [data-href]');
    jsLinks.forEach(link => this.highlightElement(link, 'js'));
    
    // Find elements with addEventListener click handlers (more complex detection)
    this.findElementsWithClickHandlers();
  }
  
  findElementsWithClickHandlers() {
    // This is a heuristic approach - elements that look clickable
    const potentialClickElements = document.querySelectorAll([
      '[role="button"]',
      '[role="link"]',
      '.btn', '.button',
      '.link', '.clickable',
      '[style*="cursor: pointer"]',
      '[style*="cursor:pointer"]'
    ].join(','));
    
    potentialClickElements.forEach(element => {
      if (!element.href && !this.highlightedElements.has(element)) {
        this.highlightElement(element, 'js');
      }
    });
  }
  
  highlightElement(element, type) {
    if (!this.isEnabled || this.highlightedElements.has(element)) return;
    
    const color = type === 'regular' ? this.settings.regularLinkColor : this.settings.jsLinkColor;
    
    // Store original styles
    const originalBorder = element.style.border;
    const originalBoxShadow = element.style.boxShadow;
    
    // Apply highlight
    element.style.border = `2px solid ${color}`;
    element.style.boxShadow = `0 0 5px ${color}`;
    element.dataset.linkHighlighter = type;
    element.dataset.originalBorder = originalBorder;
    element.dataset.originalBoxShadow = originalBoxShadow;
    
    this.highlightedElements.add(element);
    
    // Handle new tab behavior for regular links
    if (type === 'regular' && this.settings.openInNewTab) {
      this.setupNewTabBehavior(element);
    }
  }
  
  setupNewTabBehavior(element) {
    if (element.tagName === 'A' && !element.target) {
      const originalTarget = element.target;
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
      
      // Store original for cleanup
      element.dataset.originalTarget = originalTarget;
    }
  }
  
  removeAllHighlights() {
    this.highlightedElements.forEach(element => {
      this.removeHighlight(element);
    });
    this.highlightedElements.clear();
    this.originalClickHandlers.clear();
  }
  
  removeHighlight(element) {
    if (!element || !element.dataset.linkHighlighter) return;
    
    // Restore original styles
    element.style.border = element.dataset.originalBorder || '';
    element.style.boxShadow = element.dataset.originalBoxShadow || '';
    
    // Restore original target for links
    if (element.tagName === 'A' && element.dataset.originalTarget !== undefined) {
      element.target = element.dataset.originalTarget;
      if (!element.dataset.originalTarget) {
        element.removeAttribute('target');
        element.removeAttribute('rel');
      }
    }
    
    // Clean up data attributes
    delete element.dataset.linkHighlighter;
    delete element.dataset.originalBorder;
    delete element.dataset.originalBoxShadow;
    delete element.dataset.originalTarget;
  }
  
  setupMutationObserver() {
    if (this.observer) return;
    
    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;
      
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldUpdate = true;
            }
          });
        }
      });
      
      if (shouldUpdate) {
        // Debounce updates
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
          this.highlightAllLinks();
        }, 100);
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  stopMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }
  }
  
  countLinks(type) {
    let count = 0;
    this.highlightedElements.forEach(element => {
      if (element.dataset.linkHighlighter === type) {
        count++;
      }
    });
    return count;
  }
}

// Initialize the link highlighter when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Add a small delay to ensure everything is ready
    setTimeout(() => {
      new LinkHighlighter();
    }, 50);
  });
} else {
  // Document already loaded
  setTimeout(() => {
    new LinkHighlighter();
  }, 50);
}