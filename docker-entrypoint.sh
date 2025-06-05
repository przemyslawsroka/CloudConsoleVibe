#!/bin/sh

# Generate environment configuration
/usr/share/nginx/html/env-config.sh

# Start nginx
nginx -g 'daemon off;' 