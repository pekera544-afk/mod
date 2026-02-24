#!/bin/sh
echo ">>> Running prisma db push..."
npx prisma db push --datasource-url "$DATABASE_URL" --accept-data-loss
echo ">>> Starting server..."
node index.js
