(function() {
  'use strict';

  let isEnabled = false;
  let settings = {
    enabled: false,
    linkColor: '#ff0000',
    jsLinkColor: '#ffff00'
  };

  let originalTargets = new Map(); // Store original target attributes
  let highlightedElements = new Set(); // Track highlighted elements

  // Initialize on page load
  init();

  function init() {
    // Add safety check for document.body
    if (!document.body) {
      setTimeout(init, 100);
      return;
    }

    loadSettings();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === 'updateSettings') {
        settings = request.settings;
        applyHighlighting();
        sendResponse({success: true}); // Send response to confirm receipt
      }
    });

    // Handle dynamic content changes
    const observer = new MutationObserver(function(mutations) {
      if (isEnabled) {
        let shouldReapply = false;
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length > 0) {
            shouldReapply = true;
          }
        });
        if (shouldReapply) {
          setTimeout(applyHighlighting, 100); // Small delay to allow DOM to settle
        }
      }
    });

    // Only observe if body exists
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  function loadSettings() {
    chrome.storage.sync.get({
      enabled: false,
      linkColor: '#ff0000',
      jsLinkColor: '#ffff00'
    }, function(result) {
      settings = result;
      applyHighlighting();
    });
  }

  function applyHighlighting() {
    const wasEnabled = isEnabled;
    isEnabled = settings.enabled;

    if (isEnabled) {
      console.log('Link Highlighter: Applying highlighting with colors:', settings.linkColor, settings.jsLinkColor);
      highlightLinks();
      modifyLinkTargets();
    } else if (wasEnabled) {
      console.log('Link Highlighter: Removing highlighting');
      removeHighlighting();
      restoreLinkTargets();
    }
  }

  function highlightLinks() {
    // Remove existing highlighting first
    removeHighlighting();

    // Find all clickable elements
    const allLinks = document.querySelectorAll('a[href]');
    const allClickableElements = document.querySelectorAll('[onclick]');

    console.log(`Found ${allLinks.length} anchor links and ${allClickableElements.length} onclick elements`);

    let regularLinkCount = 0;
    let jsLinkCount = 0;

    // Process regular anchor links
    allLinks.forEach(function(link) {
      const href = link.getAttribute('href') || '';
      const hasOnClick = link.hasAttribute('onclick');
      const isJsLink = href.startsWith('javascript:') || hasOnClick;

      if (isJsLink) {
        highlightElement(link, settings.jsLinkColor, 'js-link');
        jsLinkCount++;
      } else {
        highlightElement(link, settings.linkColor, 'regular-link');
        regularLinkCount++;
      }
    });

    // Process non-anchor elements with onclick (buttons, divs, etc.)
    allClickableElements.forEach(function(element) {
      // Skip if it's already processed as an anchor link
      if (element.tagName.toLowerCase() === 'a') {
        return;
      }
      highlightElement(element, settings.jsLinkColor, 'js-link');
      jsLinkCount++;
    });

    // Also check for elements with event listeners (more advanced detection)
    try {
      const elementsWithListeners = document.querySelectorAll('*');
      let foundClickableElements = 0;
      
      elementsWithListeners.forEach(function(element) {
        // Skip if already highlighted
        if (element.classList.contains('link-highlighter-regular-link') || 
            element.classList.contains('link-highlighter-js-link')) {
          return;
        }
        
        // Check for common clickable patterns
        if (element.style.cursor === 'pointer' && 
            (element.tagName.toLowerCase() === 'div' || 
             element.tagName.toLowerCase() === 'span' ||
             element.tagName.toLowerCase() === 'button')) {
          // Only highlight if it looks clickable but isn't already highlighted
          const rect = element.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10) { // Ignore tiny elements
            highlightElement(element, settings.jsLinkColor, 'js-link');
            foundClickableElements++;
            jsLinkCount++;
          }
        }
      });
      
      if (foundClickableElements > 0) {
        console.log(`Found ${foundClickableElements} additional clickable elements`);
      }
    } catch (e) {
      // Ignore errors from advanced detection
      console.log('Advanced clickable detection failed:', e);
    }

    // Send stats to popup via background script
    const stats = {
      regularLinks: regularLinkCount,
      jsLinks: jsLinkCount,
      total: regularLinkCount + jsLinkCount
    };
    
    console.log('Link stats:', stats);
    
    chrome.runtime.sendMessage({
      action: 'updateStats',
      stats: stats
    }).catch(() => {
      // Background script might not be ready, ignore error
    });
  }

  function highlightElement(element, color, className) {
    // Add custom class for identification
    element.classList.add('link-highlighter-' + className);
    
    // Store original styles
    const originalBorder = element.style.border || '';
    const originalBoxSizing = element.style.boxSizing || '';
    const originalOutline = element.style.outline || '';
    const originalPosition = element.style.position || '';
    const originalPadding = element.style.padding || '';
    const originalDisplay = element.style.display || '';
    
    if (!element.hasAttribute('data-original-border')) {
      element.setAttribute('data-original-border', originalBorder);
    }
    if (!element.hasAttribute('data-original-box-sizing')) {
      element.setAttribute('data-original-box-sizing', originalBoxSizing);
    }
    if (!element.hasAttribute('data-original-outline')) {
      element.setAttribute('data-original-outline', originalOutline);
    }
    if (!element.hasAttribute('data-original-position')) {
      element.setAttribute('data-original-position', originalPosition);
    }
    if (!element.hasAttribute('data-original-padding')) {
      element.setAttribute('data-original-padding', originalPadding);
    }
    if (!element.hasAttribute('data-original-display')) {
      element.setAttribute('data-original-display', originalDisplay);
    }
    
    // Check if this is an image link for enhanced styling
    const hasImage = element.querySelector('img, figure, picture, svg') !== null;
    
    // Log what we're highlighting for debugging
    console.log(`Highlighting ${className}:`, element.tagName, hasImage ? '(has image)' : '(text)', element);
    
    if (hasImage) {
      // For image links, add padding and multiple visual indicators
      element.style.padding = '10px';
      element.style.border = `3px solid ${color}`;
      element.style.boxShadow = `0 0 0 2px ${color}`;
      element.style.outline = `2px solid ${color}`;
      element.style.outlineOffset = '3px';
      element.style.position = 'relative';
      element.style.display = 'inline-block';
      element.style.boxSizing = 'border-box';
    } else {
      // For text links, use standard border
      element.style.border = `2px solid ${color}`;
      element.style.boxSizing = 'border-box';
    }
    
    highlightedElements.add(element);
  }

  function removeHighlighting() {
    highlightedElements.forEach(function(element) {
      // Remove classes
      element.classList.remove('link-highlighter-regular-link');
      element.classList.remove('link-highlighter-js-link');
      
      // Restore original styles
      const originalBorder = element.getAttribute('data-original-border');
      const originalBoxSizing = element.getAttribute('data-original-box-sizing');
      const originalOutline = element.getAttribute('data-original-outline');
      const originalPosition = element.getAttribute('data-original-position');
      const originalPadding = element.getAttribute('data-original-padding');
      const originalDisplay = element.getAttribute('data-original-display');
      
      if (originalBorder !== null) {
        element.style.border = originalBorder;
        element.removeAttribute('data-original-border');
      }
      
      if (originalBoxSizing !== null) {
        element.style.boxSizing = originalBoxSizing;
        element.removeAttribute('data-original-box-sizing');
      }
      
      if (originalOutline !== null) {
        element.style.outline = originalOutline;
        element.removeAttribute('data-original-outline');
      }
      
      if (originalPosition !== null) {
        element.style.position = originalPosition;
        element.removeAttribute('data-original-position');
      }
      
      if (originalPadding !== null) {
        element.style.padding = originalPadding;
        element.removeAttribute('data-original-padding');
      }
      
      if (originalDisplay !== null) {
        element.style.display = originalDisplay;
        element.removeAttribute('data-original-display');
      }
      
      // Clear any box-shadow we added
      if (element.style.boxShadow && element.style.boxShadow.includes('0 0 0')) {
        element.style.boxShadow = '';
      }
      
      // Clear outline-offset
      if (element.style.outlineOffset) {
        element.style.outlineOffset = '';
      }
    });
    
    highlightedElements.clear();
  }

  function modifyLinkTargets() {
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(function(link) {
      // Skip if already processed or if it's a javascript: link
      if (originalTargets.has(link) || link.getAttribute('href').startsWith('javascript:')) {
        return;
      }
      
      // Store original target
      const originalTarget = link.getAttribute('target') || '';
      originalTargets.set(link, originalTarget);
      
      // Set target to _blank
      link.setAttribute('target', '_blank');
      
      // Add rel="noopener noreferrer" for security
      const existingRel = link.getAttribute('rel') || '';
      const relValues = existingRel.split(' ').filter(val => val.length > 0);
      
      if (!relValues.includes('noopener')) {
        relValues.push('noopener');
      }
      if (!relValues.includes('noreferrer')) {
        relValues.push('noreferrer');
      }
      
      link.setAttribute('rel', relValues.join(' '));
      link.setAttribute('data-link-highlighter-modified', 'true');
    });
  }

  function restoreLinkTargets() {
    const modifiedLinks = document.querySelectorAll('a[data-link-highlighter-modified="true"]');
    
    modifiedLinks.forEach(function(link) {
      if (originalTargets.has(link)) {
        const originalTarget = originalTargets.get(link);
        
        if (originalTarget) {
          link.setAttribute('target', originalTarget);
        } else {
          link.removeAttribute('target');
        }
        
        // Clean up rel attribute (remove our additions)
        const currentRel = link.getAttribute('rel') || '';
        const relValues = currentRel.split(' ').filter(val => 
          val.length > 0 && val !== 'noopener' && val !== 'noreferrer'
        );
        
        if (relValues.length > 0) {
          link.setAttribute('rel', relValues.join(' '));
        } else {
          link.removeAttribute('rel');
        }
        
        originalTargets.delete(link);
      }
      
      link.removeAttribute('data-link-highlighter-modified');
    });
  }
})();