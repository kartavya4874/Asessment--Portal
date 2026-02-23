/**
 * Converts a plain-text description with basic markdown-like formatting
 * into sanitized HTML for rendering.
 *
 * Supported syntax:
 *   **text**  → <strong>text</strong>
 *   *text*    → <em>text</em>
 *   - item    → bullet list items
 *   `code`   → <code>code</code>
 *   blank lines separate paragraphs
 *   URLs starting with http(s) → clickable links
 */
export function formatDescription(text) {
    if (!text) return '';

    // Escape HTML entities first to prevent XSS
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // Split into lines
    const lines = escaped.split(/\r?\n/);

    let html = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Check if this is a list item (starts with - or •)
        const listMatch = line.match(/^\s*[-•]\s+(.*)/);

        if (listMatch) {
            if (!inList) {
                html += '<ul style="margin:8px 0;padding-left:20px;">';
                inList = true;
            }
            html += `<li style="margin-bottom:4px;">${inlineFormat(listMatch[1])}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }

            // Empty line → paragraph break
            if (line.trim() === '') {
                html += '<br/>';
            } else {
                html += `<p style="margin:4px 0;">${inlineFormat(line)}</p>`;
            }
        }
    }

    if (inList) {
        html += '</ul>';
    }

    return html;
}

/** Apply inline formatting: bold, italic, code, URLs */
function inlineFormat(text) {
    return text
        // Inline code: `code`
        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-size:0.9em;">$1</code>')
        // Bold: **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic: *text*  (but not if already part of bold)
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
        // URLs: https://... or http://...
        .replace(/(https?:\/\/[^\s,'"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;word-break:break-all;">$1</a>');
}

export default formatDescription;
