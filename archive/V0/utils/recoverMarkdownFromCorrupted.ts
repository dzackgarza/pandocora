// Utility to recover markdown from a corrupted HTML-like document
export function recoverMarkdownFromCorrupted(input: string): string {
  // Remove all <div ...>, <span ...>, <p>, <hr>, <h2>, <h3>, <blockquote>, <thead>, <tbody>, <tr>, <td>, <th>, <ul>, <li>, <code>, <em>, <strong>, etc.
  let output = input;
  // Replace block-level tags with newlines
  output = output.replace(/<\/?(div|p|hr|h2|h3|blockquote|thead|tbody|tr|ul|li)[^>]*>/g, '\n');
  // Replace table cells and headers with tabs
  output = output.replace(/<\/?(td|th)[^>]*>/g, '\t');
  // Remove inline tags
  output = output.replace(/<\/?(span|code|em|strong)[^>]*>/g, '');
  // Remove all other tags
  output = output.replace(/<[^>]+>/g, '');
  // Replace HTML entities
  output = output.replace(/&nbsp;/g, ' ');
  // Collapse multiple newlines
  output = output.replace(/\n{2,}/g, '\n');
  // Remove excessive tabs
  output = output.replace(/\t+/g, ' ');
  // Trim lines
  output = output.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
  return output;
} 