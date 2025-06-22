# Intelligent FileSystem Broker Test

This document tests the new **intelligent FileSystem Broker** that maintains clean, human-readable Markdown.

## Key Features

- **Timestamp-based queuing** - edits are processed in chronological order
- **Inactivity-based saves** - saves after 2 seconds of no typing
- **Staleness protection** - forces save after 10 seconds maximum
- **Intelligent HTML cleaning** - removes contenteditable artifacts
- **Temporary file processing** - uses temp files for clean conversion
- **Human-readable output** - ensures source stays clean

## Test Cases

### Basic Formatting

This is **bold text** and this is *italic text*.

Here's some `inline code` and a [link](https://example.com).

### Lists

1. First numbered item
2. Second numbered item
3. Third numbered item

- First bullet point
- Second bullet point
- Third bullet point

### Math

Inline math: $E = mc^2$

Block math:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### Code Block

```javascript
function testBroker() {
    console.log("Testing the intelligent broker!");
    return "success";
}
```

## Expected Behavior

1. **While typing**: Status shows "Editing..."
2. **After 2s inactivity**: Automatic save with "Saving..." → "Saved"
3. **Ctrl+S**: Immediate force save
4. **No reverts**: Previous edits should never be lost
5. **Clean source**: This file should remain human-readable

Try editing this document and observe the behavior!

## Backup/Version History Test

1. Make several edits to this document in the WYSIWYG editor and wait for autosave or press Ctrl+S.
2. Open the folder containing this file in your file manager or terminal.
3. You should see hidden backup files named `.test-intelligent.md.bak.<timestamp>.md`.
4. Only the 5 most recent backups should be kept; older ones are deleted automatically.
5. If you open a backup file, it should contain a previous version of your document.
6. If you delete or corrupt the main file, you can restore from a backup.