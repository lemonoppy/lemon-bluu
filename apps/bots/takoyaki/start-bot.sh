#!/bin/bash

# Auto-restart script for Takoyaki bot
# Usage: ./start-bot.sh

set -u

cd "$(dirname "$0")" || exit 1

echo "Starting Takoyaki bot with auto-restart..."

while true; do
    echo "$(date): Starting bot..."

    # Run the bot (change this to your preferred start command)
    NODE_ENV=production npm run start:prod
    status=$?

    # If we get here, the bot crashed
    echo "$(date): Bot exited with code $status. Restarting in 5 seconds..."
    sleep 5
done
