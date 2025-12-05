FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check (use shell so `||` works)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["CMD-SHELL", "wget -q --tries=1 --spider http://localhost/health || exit 1"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]


