# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files from frontend
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code from frontend
COPY frontend/ .

# Build application
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration for frontend
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check (use shell so `||` works)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["CMD-SHELL", "wget -q --tries=1 --spider http://localhost/ || exit 1"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


