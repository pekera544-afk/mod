FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build:client
RUN npx prisma generate
RUN npm prune --omit=dev

FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/index.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma.config.js ./

RUN mkdir -p uploads

EXPOSE $PORT

CMD ["node", "index.js"]
