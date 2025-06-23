# IMPORTANT: Fail EARLY, FAST, and LOUDLY
# - Fail on first error
# - Don't hide error messages
# - Make it obvious when something goes wrong

.PHONY: build watch clean format lint

# Source files (exclude tests)
SRC_FILES = $(shell find src -type f -name '*.ts' ! -name '*.test.ts' ! -path '*/test/*' ! -path '*/__tests__/*')

# Format all non-test TypeScript files
format:
	@echo "Formatting TypeScript files..."
	@for file in $(SRC_FILES); do \
		echo "Formatting $$file"; \
		npx prettier --write "$$file" || exit 1; \
	done

# Lint and fix TypeScript files in src and tests directories
LINT_FILES = $(shell find src tests -type f -name '*.ts')

lint:
	@echo "Linting and fixing TypeScript files in src/ and tests/..."
	@if [ -n "$(LINT_FILES)" ]; then \
		echo "Found files to lint: $(LINT_FILES)"; \
		npx eslint --fix $(LINT_FILES) || exit 1; \
	else \
		echo "No TypeScript files found to lint in src/ or tests/"; \
	fi

# Build the extension (excludes tests)
build: format lint
	@echo "Building TypeScript files..."
	npx tsc -p ./

# Watch for changes and rebuild
watch:
	tsc -w -p ./

# Clean build artifacts
clean:
	rm -rf out

# Install development dependencies
setup:
	npm install --save-dev typescript @types/node @types/vscode prettier \
		eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Rebuild from scratch
rebuild: clean build

# --- Tiered Testing ---

# Find test files in a specific tier
define find_tier_tests
    $(shell find tests/tier$(1) -type f -name '*.test.ts' 2>/dev/null || echo '')
endef

# Run tests for a specific tier
# Usage: $(call run_tier_tests, <tier_number>)
define run_tier_tests
    $(eval _TIER_FILES := $(call find_tier_tests,$(1)))
    @if [ -z "$(_TIER_FILES)" ]; then \
        echo "No tests found for Tier $(1)"; \
        exit 0; \
    fi; \
    echo "Running Tier $(1) tests using files: $(_TIER_FILES)"; \
    for test_file in $(_TIER_FILES); do \
        echo "Running $$test_file"; \
        if env TS_NODE_PROJECT=tests/tsconfig.json npx mocha \
            -r ts-node/register/transpile-only \
            -r tsconfig-paths/register \
            $$test_file; then \
            echo "$$test_file PASSED"; \
        else \
            echo "$$test_file FAILED"; \
            exit 1; \
        fi; \
    done; \
    echo "Tier $(1) tests PASSED"; \
    true
endef

# Run all tests, tier by tier
test: test-tier1 # Depends on test-tier0, so will run both
	@echo "All tests passed!"

# Run Tier 0 tests
test-tier0: typecheck-tests
	@$(call run_tier_tests,0)

# Run Tier 1 tests (depends on Tier 0)
# Ensure this target is only called if Tier 1 actually has tests, or it will pass vacuously.
test-tier1: test-tier0
	$(eval _TIER_1_FILES := $(call find_tier_tests,1))
	@if [ -z "$(_TIER_1_FILES)" ]; then \
		echo "No tests found for Tier 1, skipping."; \
		exit 0; \
	fi; \
	echo "Tier 0 tests passed. Proceeding to Tier 1."; \
	$(call run_tier_tests,1)
	# Add dependencies for future tiers here, e.g., test-tier2: test-tier1

# Run a specific test file (useful for development)
# Example: make test-file file=tests/tier0/compilation.test.ts
test-file:
	@if [ -z "$(file)" ]; then \
		echo "Error: No test file specified. Usage: make test-file file=path/to/your.test.ts"; \
		exit 1; \
	fi
	@echo "Running specific test file: $(file)"
	@if ! env TS_NODE_PROJECT=tests/tsconfig.json npx mocha \
		-r ts-node/register/transpile-only \
		-r tsconfig-paths/register \
		$(file); then \
		echo "Test file $(file) FAILED"; \
		exit 1; \
	fi
	@echo "Test file $(file) PASSED"

# Run type checking on all test files (without building)
# This target also ensures that the tsconfig settings are compatible with the test files.
# Uses a temporary tsconfig file if necessary to include test files for type checking.
typecheck-tests:
	@echo "Type checking test files using tests/tsconfig.json..."
	@if ! npx tsc -p tests/tsconfig.json --noEmit; then \
		echo "Type checking FAILED for some test files."; \
		echo "Ensure tests/tsconfig.json is correctly configured."; \
		exit 1; \
	fi; \
	echo "All test files type checked successfully via tests/tsconfig.json."

# --- Test Summary ---
.PHONY: test-summary

# Summarize tests by tier
test-summary:
	@echo "Summarizing tests by tier:"
	@for tier_dir in $(shell find tests -maxdepth 1 -type d -name 'tier*' | sort); do \
		tier_name=$$(basename $$tier_dir); \
		num_tests=$$(find $$tier_dir -type f -name '*.test.ts' | wc -l | tr -d ' '); \
		if [ $$num_tests -gt 0 ]; then \
			echo "  $${tier_name}: $$num_tests test file(s)"; \
		else \
			echo "  $${tier_name}: No test files found"; \
		fi; \
	done
	@echo "For detailed test execution, run 'make test' or 'npm test'."
