// Tier 0 Test: Basic Compilation Check

// This test ensures that the main extension module can be imported without
// causing compilation errors. It's a fundamental check to catch issues
// like syntax errors or missing dependencies early.

import * as extension from '@src/extension'; // Using path alias
import * as assert from 'assert';

describe('Tier 0: Compilation Tests', () => {
  it('Should import the main extension module without errors', () => {
    // If the import itself doesn't throw an error, this test implicitly passes.
    // We can add a trivial assertion to make the test runner happy.
    assert.ok(true, 'Extension module imported successfully.');
  });

  it('Should have an activate function exported', () => {
    assert.strictEqual(typeof extension.activate, 'function', 'activate function should be exported');
    // VS Code extensions can optionally export a 'deactivate' function.
    // We are not checking for it in this basic compilation test.
    // If 'deactivate' becomes a requirement, this test should be updated.
  });
});
