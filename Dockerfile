FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build:client
RUN npx prisma generate
RUN npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/index.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma.config.ts ./

RUN mkdir -p uploads

RUN printf '#!/bin/sh\necho ">>> Syncing DB schema..."\nnpx prisma db push --datasource-url "$DATABASE_URL" --accept-data-loss\necho ">>> Starting server..."\nexec node index.js\n' > /app/start.sh && chmod +x /app/start.sh

EXPOSE $PORT

CMD ["/bin/sh", "/app/start.sh"]
