# Multi-stage Dockerfile for Network Monitor Agent

# Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the agent
RUN go build -o network-monitor-agent ./cmd/agent

# Runtime stage
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1000 netmon && \
    adduser -D -u 1000 -G netmon netmon

# Set working directory
WORKDIR /home/netmon

# Copy binary from builder
COPY --from=builder /app/network-monitor-agent .

# Set ownership
RUN chown netmon:netmon network-monitor-agent

# Switch to non-root user
USER netmon

# Expose no ports (agent connects outbound)

# Set default command
ENTRYPOINT ["./network-monitor-agent"]
CMD ["run"] 