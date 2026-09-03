# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files from frontend
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code from frontend
COPY frontend/ .

# Ensure all binaries are executable and fix CRLF issues
RUN apk add --no-cache dos2unix \
  && find node_modules/.bin/ -type l -or -type f -exec dos2unix {} + \
  && find node_modules/.bin/ -type l -or -type f -exec chmod +x {} +

# Build application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Ensure curl is available for healthchecks
RUN apk add --no-cache curl

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration for frontend
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check (curl -f returns non‑zero on HTTP errors)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["CMD-SHELL", "curl -fsS http://localhost/ >/dev/null || exit 1"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
