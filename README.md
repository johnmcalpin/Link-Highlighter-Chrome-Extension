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

## Usage

1. Click the Link Highlighter icon in your Chrome toolbar
2. Toggle the "Enable Link Highlighting" switch to activate
3. Customize colors using the color pickers:
   - **Regular Links**: Standard `<a href="">` links
   - **JS/onClick Links**: Elements with onClick handlers or javascript: links
4. Visit any website to see the highlighting in action
5. All links will automatically open in new tabs when the extension is enabled