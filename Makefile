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

# Lint and fix TypeScript files in src directory
SRC_FILES = $(shell find src -name '*.ts')

lint:
	@echo "Linting and fixing TypeScript files in src/..."
	@if [ -n "$(SRC_FILES)" ]; then \
		echo "Found files to lint: $(SRC_FILES)"; \
		npx eslint --fix $(SRC_FILES) || exit 1; \
	else \
		echo "No TypeScript files found to lint"; \
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

# Run all tests
test:
	@echo "Error: No test specified. Please run specific test files directly."
	@echo "Example: make test-file file=path/to/your.test.ts"
	@exit 1

# Run a specific test file
test-file:
	@if [ -z "$(file)" ]; then \
		echo "Error: No test file specified. Usage: make test-file file=path/to/test"; \
		exit 1; \
	fi
	@echo "Running test file: $(file)"
	@npx ts-node $(file)

# Run type checking on test files (without building)
typecheck-tests:
	@echo "Type checking test files..."
	tsc --noEmit --skipLibCheck --pretty $(shell find src -type f -name '*.test.ts' -o -path '*/test/*.ts' -o -path '*/__tests__/*.ts' 2>/dev/null || echo '')
