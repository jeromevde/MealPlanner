// Inline formatting patterns for bold, italic, links, images, and code
const inlinePatterns = [
    { regex: /\*\*(.+?)\*\*/g, replacement: '<strong>$1</strong>' }, // **bold**
    { regex: /__(.+?)__/g, replacement: '<strong>$1</strong>' },     // __bold__
    { regex: /\*(.+?)\*/g, replacement: '<em>$1</em>' },            // *italic*
    { regex: /_(.+?)_/g, replacement: '<em>$1</em>' },              // _italic_
    { regex: /!\[(.+?)\]\((.+?)\)/g, replacement: '<img src="$2" alt="$1">' }, // ![alt](URL)
    { regex: /\[(.+?)\]\((.+?)\)/g, replacement: '<a href="$2">$1</a>' }, // [text](URL)
    { regex: /`(.+?)`/g, replacement: '<code>$1</code>' }          // `code`
];

// Function to parse inline Markdown within text
function parseInline(text) {
    let result = text;
    inlinePatterns.forEach(pattern => {
        result = result.replace(pattern.regex, pattern.replacement);
    });
    return result;
}

// Function to split Markdown into blocks separated by blank lines
function splitIntoBlocks(markdown) {
    const lines = markdown.split('\n');
    const blocks = [];
    let currentBlock = [];

    lines.forEach(line => {
        if (line.trim() === '') {
            if (currentBlock.length > 0) {
                blocks.push(currentBlock);
                currentBlock = [];
            }
        } else {
            currentBlock.push(line);
        }
    });

    if (currentBlock.length > 0) {
        blocks.push(currentBlock);
    }

    return blocks;
}

// Function to parse a single block into HTML
function parseBlock(block) {
    const firstLine = block[0].trim();

    // Heading
    if (firstLine.startsWith('#')) {
        const match = firstLine.match(/^#{1,6}\s(.+)/);
        if (match) {
            const level = firstLine.split(' ')[0].length; // Number of '#' characters
            const text = match[1];
            return `<h${level}>${parseInline(text)}</h${level}>`;
        }
    }
    // Unordered List
    else if (firstLine.startsWith('-') || firstLine.startsWith('*') || firstLine.startsWith('+')) {
        let html = '<ul>';
        block.forEach(line => {
            const itemText = line.slice(1).trim(); // Remove list marker
            html += `<li>${parseInline(itemText)}</li>`;
        });
        html += '</ul>';
        return html;
    }
    // Ordered List
    else if (/^\d+\.\s/.test(firstLine)) {
        let html = '<ol>';
        block.forEach(line => {
            const itemText = line.replace(/^\d+\.\s/, ''); // Remove number and dot
            html += `<li>${parseInline(itemText)}</li>`;
        });
        html += '</ol>';
        return html;
    }
    // Paragraph
    else {
        const paragraphText = block.map(line => parseInline(line.trim())).join(' ');
        return `<p>${paragraphText}</p>`;
    }

    return ''; // Default case, should not occur with proper input
}

// Main function to parse Markdown text into HTML
export function parseMarkdown(markdown) {
    const blocks = splitIntoBlocks(markdown);
    let html = '';
    blocks.forEach(block => {
        html += parseBlock(block);
    });
    return html;
}