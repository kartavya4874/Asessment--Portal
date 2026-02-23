/**
 * Converts a plain-text description (often stored as one long string)
 * into well-structured, readable HTML.
 *
 * Handles:
 *   **Section Headings** at the start of sentences → <h4> headings
 *   - bullet items  → <ul><li> lists
 *   1. numbered items → <ol><li> lists
 *   `code` → styled <code>
 *   **bold** inline → <strong>
 *   *italic* inline → <em>
 *   URLs → clickable <a> links
 *   Sentence separation with proper spacing
 */
export function formatDescription(text) {
    if (!text) return '';

    // Escape HTML entities to prevent XSS
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // ── Step 1: Normalize line breaks ──
    // If the text has real newlines, keep them; otherwise, we'll insert breaks
    // at logical points.

    // Insert line breaks BEFORE **Section Headings** (bold text that starts
    // a new thought — usually preceded by a period/space or is at the start)
    escaped = escaped.replace(/\s+\*\*([^*]{3,}?)\*\*/g, '\n\n**$1**');

    // Insert line breaks before list-style items: " - item"
    escaped = escaped.replace(/\s+- /g, '\n- ');

    // Insert line breaks before numbered items: " 1. item"
    escaped = escaped.replace(/\s+(\d+)\.\s/g, '\n$1. ');

    // ── Step 2: Split into lines and process ──
    const lines = escaped.split(/\n/).map(l => l.trim()).filter(l => l !== '' || true);

    let html = '';
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
        if (inUl) { html += '</ul>'; inUl = false; }
        if (inOl) { html += '</ol>'; inOl = false; }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            closeLists();
            continue;
        }

        // ── Check for section heading: entire line is **Heading** ──
        const headingMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
        if (headingMatch) {
            closeLists();
            html += `<h4 style="font-size:15px;font-weight:700;margin:18px 0 8px 0;color:var(--text-primary);">${inlineFormat(headingMatch[1])}</h4>`;
            continue;
        }

        // ── Check for heading followed by text: **Heading** some text... ──
        const headingTextMatch = line.match(/^\*\*(.+?)\*\*\s+(.+)/);
        if (headingTextMatch) {
            closeLists();
            html += `<h4 style="font-size:15px;font-weight:700;margin:18px 0 8px 0;color:var(--text-primary);">${inlineFormat(headingTextMatch[1])}</h4>`;
            html += `<p style="margin:6px 0;line-height:1.7;">${inlineFormat(headingTextMatch[2])}</p>`;
            continue;
        }

        // ── Unordered list item: - text ──
        const ulMatch = line.match(/^[-•]\s+(.*)/);
        if (ulMatch) {
            if (inOl) { html += '</ol>'; inOl = false; }
            if (!inUl) { html += '<ul style="margin:8px 0 8px 4px;padding-left:20px;">'; inUl = true; }
            html += `<li style="margin-bottom:5px;line-height:1.6;">${inlineFormat(ulMatch[1])}</li>`;
            continue;
        }

        // ── Ordered list item: 1. text ──
        const olMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (olMatch) {
            if (inUl) { html += '</ul>'; inUl = false; }
            if (!inOl) { html += '<ol style="margin:8px 0 8px 4px;padding-left:20px;">'; inOl = true; }
            html += `<li style="margin-bottom:5px;line-height:1.6;">${inlineFormat(olMatch[2])}</li>`;
            continue;
        }

        // ── Regular paragraph ──
        closeLists();
        html += `<p style="margin:6px 0;line-height:1.7;">${inlineFormat(line)}</p>`;
    }

    closeLists();
    return html;
}

/** Apply inline formatting: code, bold, italic, URLs */
function inlineFormat(text) {
    return text
        // Inline code: `code`
        .replace(
            /`([^`]+)`/g,
            '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:0.9em;font-family:monospace;">$1</code>'
        )
        // Bold: **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic: *text* (not preceded/followed by *)
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
        // URLs: https://... or http://...
        .replace(
            /(https?:\/\/[^\s,'"&]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--accent-primary);text-decoration:underline;word-break:break-all;">$1</a>'
        );
}

export default formatDescription;
