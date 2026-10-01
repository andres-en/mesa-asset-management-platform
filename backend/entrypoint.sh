#!/bin/sh
set -e

echo "Applying database migrations..."
flask db upgrade

echo "Starting the server..."
exec gunicorn --bind 0.0.0.0:5000 --workers 3 --access-logfile - run:app
