# CloudConsoleVibe Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies needed for SQLite compilation
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs data

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Start the application (using simplified server for initial deployment)
CMD ["node", "server-simple.js"] 