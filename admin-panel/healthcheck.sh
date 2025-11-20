#!/bin/sh

# Health check for nginx
curl -f http://localhost/ || exit 1