# Use multi-stage build for optimized production image
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci --silent

# Copy source code
COPY . .

# Build the Angular app for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from build stage
COPY --from=build /app/dist/demo-cloud-console /usr/share/nginx/html

# Copy environment configuration script
COPY env-config.sh /usr/share/nginx/html/env-config.sh
COPY env-config.js /usr/share/nginx/html/env-config.js

# Make script executable
RUN chmod +x /usr/share/nginx/html/env-config.sh

# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080

# Use custom startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Start nginx
ENTRYPOINT ["/docker-entrypoint.sh"] 