# Link Highlighter Chrome Extension

A lightweight Chrome extension that highlights links on web pages and modifies their behavior for better navigation.

## Features

- **Toggle On/Off**: Simple toggle switch to enable or disable the extension
- **Link Highlighting**: Puts colored boxes around all regular links (default: red)
- **JavaScript Link Detection**: Highlights elements with onClick handlers in a different color (default: yellow)
- **Links Discovered**: Notates how many normal links and how many JS links were discovered
- **Customizable Colors**: Change the highlight colors for both regular and JS links
- **New Tab Behavior**: When enabled, all links open in new tabs for better navigation
- **Dynamic Content Support**: Works with dynamically loaded content (AJAX, SPAs)
- **Security Focused**: Follows Chrome extension best practices and security standards

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The Link Highlighter icon should appear in your extensions toolbar

## File Structure

```
link-highlighter/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── content.js             # Main content script
├── styles.css             # Content script styles
├── README.md              # This file
└── icons/                 # Extension icons (add your own)
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Usage

1. Click the Link Highlighter icon in your Chrome toolbar
2. Toggle the "Enable Link Highlighting" switch to activate
3. Customize colors using the color pickers:
   - **Regular Links**: Standard `<a href="">` links
   - **JS/onClick Links**: Elements with onClick handlers or javascript: links
4. Visit any website to see the highlighting in action
5. All links will automatically open in new tabs when the extension is enabled

## Customization

### Update Credit Links
In `popup.js`, replace the placeholder URLs:
```javascript
websiteLink.href = 'https://yourwebsite.com'; // Your website
extensionLink.href = 'https://chrome.google.com/webstore/detail/your-extension-id'; // Extension store page
```

### Add Icons
Add your own icon files to the root directory:
- `icon16.png` (16x16px)
- `icon32.png` (32x32px) 
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

## Security Features

- **Manifest V3**: Uses the latest Chrome extension manifest format
- **Minimal Permissions**: Only requests `storage` and `activeTab` permissions
- **Content Security Policy**: Strict CSP prevents code injection
- **NoOpener/NoReferrer**: Automatically adds security attributes to modified links
- **No External Resources**: All code is self-contained

## Technical Details

### Permissions Used
- `storage`: Save user preferences (colors, enabled state)
- `activeTab`: Interact with the currently active tab

### Storage
- Settings are stored using `chrome.storage.sync` for cross-device synchronization
- No personal data is collected or transmitted

### Content Script Injection
- Automatically injected on all pages (`<all_urls>`)
- Uses MutationObserver for dynamic content detection
- Properly cleans up modifications when disabled

## Browser Compatibility

- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers with extension support

## Development

### Making Changes
1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Link Highlighter extension
4. Test your changes

### Debugging
- Use Chrome DevTools for popup debugging
- Check the Extensions page for error logs
- Use `console.log()` in content scripts (visible in page DevTools)

## Publishing to Chrome Web Store

1. Update the `manifest.json` version number
2. Create a ZIP file of all extension files
3. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
4. Fill out the store listing details
5. Submit for review

## License

This extension is provided as-is for educational and personal use. Modify and distribute according to your needs.

## Support

For issues or feature requests, please visit [your website/support page].

---

**Note**: Remember to replace placeholder URLs and add your own icons before publishing!
