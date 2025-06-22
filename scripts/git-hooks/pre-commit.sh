#!/bin/sh

# Navigate to the project root directory
project_root=$(git rev-parse --show-toplevel)
cd "$project_root" || exit 1

echo "Running Tier 1 tests before commit..."

# Execute Tier 1 tests using make
# The `test-tier1` target in Makefile depends on `test-tier0`,
# so both will be run. If tier0 fails, test-tier1 won't run.
if make test-tier1; then
  echo "Tier 1 tests passed. Proceeding with commit."
  exit 0 # Tests passed, allow commit
else
  echo "--------------------------------------------------"
  echo "ERROR: Tier 1 tests failed. Commit aborted."
  echo "Please fix the Tier 1 tests before committing."
  echo "You can run tests manually using: make test-tier1"
  echo "--------------------------------------------------"
  exit 1 # Tests failed, block commit
fi
