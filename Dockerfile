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

EXPOSE $PORT

CMD ["sh", "-c", "npx prisma migrate resolve --applied 20260224000000_init 2>/dev/null || true; npx prisma migrate deploy; node index.js"]
