# Network Monitor Agent Makefile

.PHONY: build clean test run install deps check-deps tidy help

# Variables
BINARY_NAME=network-monitor-agent
BUILD_DIR=./bin
MAIN_PATH=./cmd/agent
VERSION=1.0.0
LDFLAGS=-ldflags "-X main.version=$(VERSION) -w -s"

# Default target
all: deps tidy test build

# Help target
help:
	@echo "Available targets:"
	@echo "  build      - Build the monitoring agent binary"
	@echo "  clean      - Clean build artifacts"
	@echo "  test       - Run tests"
	@echo "  run        - Run the agent (with default config)"
	@echo "  install    - Install the binary to GOPATH/bin"
	@echo "  deps       - Download dependencies"
	@echo "  tidy       - Clean up go.mod and go.sum"
	@echo "  check-deps - Check if all dependencies are available"
	@echo "  config     - Generate default configuration"
	@echo "  help       - Show this help message"

# Build the binary
build: deps
	@echo "🔨 Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PATH)
	@echo "✅ Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

# Build for multiple platforms
build-all: deps
	@echo "🔨 Building for multiple platforms..."
	@mkdir -p $(BUILD_DIR)
	
	# Linux AMD64
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64 $(MAIN_PATH)
	
	# Linux ARM64
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-arm64 $(MAIN_PATH)
	
	# macOS AMD64
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64 $(MAIN_PATH)
	
	# macOS ARM64 (Apple Silicon)
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64 $(MAIN_PATH)
	
	# Windows AMD64
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe $(MAIN_PATH)
	
	@echo "✅ Multi-platform build complete!"
	@ls -la $(BUILD_DIR)/

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	go clean
	@echo "✅ Clean complete"

# Download dependencies
deps:
	@echo "📦 Downloading dependencies..."
	go mod download
	@echo "✅ Dependencies downloaded"

# Tidy dependencies
tidy:
	@echo "🧹 Tidying dependencies..."
	go mod tidy
	@echo "✅ Dependencies tidied"

# Check if dependencies are available
check-deps:
	@echo "🔍 Checking dependencies..."
	@go mod verify
	@echo "✅ All dependencies verified"

# Run tests
test:
	@echo "🧪 Running tests..."
	go test -v ./...
	@echo "✅ Tests complete"

# Run tests with coverage
test-coverage:
	@echo "🧪 Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report generated: coverage.html"

# Run the agent with default configuration
run: build
	@echo "🚀 Running $(BINARY_NAME)..."
	$(BUILD_DIR)/$(BINARY_NAME) run

# Generate default configuration
config: build
	@echo "📝 Generating default configuration..."
	$(BUILD_DIR)/$(BINARY_NAME) generate-config
	@echo "✅ Configuration generated: agent-config.yaml"

# Show status
status: build
	@echo "📊 Showing agent status..."
	$(BUILD_DIR)/$(BINARY_NAME) status

# Install binary to GOPATH/bin
install: build
	@echo "📦 Installing $(BINARY_NAME)..."
	go install $(LDFLAGS) $(MAIN_PATH)
	@echo "✅ Installed to $(GOPATH)/bin/$(BINARY_NAME)"

# Development target - build and run with auto-restart
dev:
	@echo "🔄 Running in development mode..."
	@echo "Press Ctrl+C to stop"
	go run $(MAIN_PATH) run --log-level debug

# Format code
fmt:
	@echo "🎨 Formatting code..."
	go fmt ./...
	@echo "✅ Code formatted"

# Lint code
lint:
	@echo "🔍 Linting code..."
	@command -v golangci-lint >/dev/null 2>&1 || { echo "Installing golangci-lint..."; go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; }
	golangci-lint run
	@echo "✅ Linting complete"

# Security check
sec:
	@echo "🔒 Running security checks..."
	@command -v gosec >/dev/null 2>&1 || { echo "Installing gosec..."; go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest; }
	gosec ./...
	@echo "✅ Security check complete"

# Full check: fmt, lint, test, build
check: fmt lint test build
	@echo "✅ All checks passed!"

# Docker build
docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t network-monitor-agent:$(VERSION) .
	@echo "✅ Docker image built: network-monitor-agent:$(VERSION)"

# Create release tarball
release: build-all
	@echo "📦 Creating release package..."
	@mkdir -p release
	tar -czf release/$(BINARY_NAME)-$(VERSION)-linux-amd64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-linux-amd64
	tar -czf release/$(BINARY_NAME)-$(VERSION)-linux-arm64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-linux-arm64
	tar -czf release/$(BINARY_NAME)-$(VERSION)-darwin-amd64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-darwin-amd64
	tar -czf release/$(BINARY_NAME)-$(VERSION)-darwin-arm64.tar.gz -C $(BUILD_DIR) $(BINARY_NAME)-darwin-arm64
	zip -j release/$(BINARY_NAME)-$(VERSION)-windows-amd64.zip $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe
	@echo "✅ Release packages created in ./release/" 