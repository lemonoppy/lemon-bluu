#!/bin/bash

# Auto-restart script for Takoyaki bot
# Usage: ./start-bot.sh

echo "Starting Takoyaki bot with auto-restart..."

while true; do
    echo "$(date): Starting bot..."

    # Run the bot (change this to your preferred start command)
    npm run start:prod

    # If we get here, the bot crashed
    echo "$(date): Bot crashed with exit code $?. Restarting in 5 seconds..."
    sleep 5
done
