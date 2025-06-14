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

# Create environment.ts from template for build process
RUN cp src/environments/environment.ts.template src/environments/environment.ts

# Build the Angular app for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from build stage
COPY --from=build /app/dist/demo-cloud-console /usr/share/nginx/html


# Expose port 8080 (Cloud Run requirement)
EXPOSE 8080


# Start nginx
CMD ["nginx", "-g", "daemon off;"] 