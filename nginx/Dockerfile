FROM nginx:alpine

# Ensure curl is available for healthchecks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check (curl -f returns non‑zero on HTTP errors)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["CMD-SHELL", "curl -fsS http://localhost/health >/dev/null || exit 1"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


