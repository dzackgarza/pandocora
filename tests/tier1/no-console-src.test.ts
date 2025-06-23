import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

describe('Tier 1: No console.log in src/ files', () => {
  const srcDir = path.resolve(__dirname, '../../src');
  const forbiddenPattern = /console\.log\s*\(/; // Specifically targets console.log()
  // Could be extended: /console\.(log|debug|info)\s*\(/;

  function findViolations(dirPath: string): string[] {
    const violations: string[] = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        violations.push(...findViolations(filePath));
      } else if (filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n'); 
        lines.forEach((line, index) => {
          if (forbiddenPattern.test(line)) {
            // Check if it's commented out
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*') && !trimmedLine.endsWith('*/')) {
              violations.push(`Found 'console.log' in ${path.relative(srcDir, filePath)} at line ${index + 1}: ${line.trim()}`);
            }
          }
        });
      }
    }
    return violations;
  }

  it('Should not find any console.log statements in src/ directory', () => {
    const violations = findViolations(srcDir);
    assert.strictEqual(violations.length, 0, `Found forbidden console.log statements in src/:\n${violations.join('\n')}`);
  });
});
