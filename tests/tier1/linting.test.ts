import { ESLint } from 'eslint';
import * as assert from 'assert';
import * as path from 'path';

describe('Tier 1: ESLint Checks', () => {
  it('Should run ESLint on src/ and tests/ directories and report no errors', async () => {
    // Create an instance of ESLint. Uses eslint.config.js by default.
    const eslint = new ESLint({
      // Explicitly set cwd to project root to ensure eslint.config.js is found correctly.
      // And that file paths in results are relative to project root.
      cwd: path.resolve(__dirname, '../../'),
      // We can choose to ignore warnings for this test or include them.
      // For now, let's focus on errors.
      // overrideConfig: {
      //   rules: {
      //     // Example: if you want to ensure no warnings either for this test
      //     // 'no-console': 'error', // Promote to error for this test run
      //   }
      // }
    });

    // Lint files. This will use the patterns defined in eslint.config.js or you can specify them.
    // Let's specify them to be sure.
    const results = await eslint.lintFiles(['src/**/*.ts', 'tests/**/*.ts']);

    // Calculate total errors and warnings
    let totalErrors = 0;
    let totalWarnings = 0;
    results.forEach(result => {
      totalErrors += result.errorCount;
      totalWarnings += result.warningCount;
    });

    // Format the results into a readable string if there are errors/warnings
    if (totalErrors > 0 || totalWarnings > 0) {
      const formatter = await eslint.loadFormatter('stylish');
      const resultText = formatter.format(results);
      console.log('\nESLint Run Results:\n' + resultText);
    }

    // Assert that there are no ESLint errors.
    // We can decide if warnings should also cause a failure. For now, only errors.
    assert.strictEqual(totalErrors, 0, `ESLint found ${totalErrors} errors. Check console output for details.`);

    // Optionally, assert for no warnings as well if desired for stricter checks
    // assert.strictEqual(totalWarnings, 0, `ESLint found ${totalWarnings} warnings. Check console output for details.`);
  });
});
