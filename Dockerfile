FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build:client
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY server ./server
COPY index.js ./
COPY prisma.config.ts ./

RUN mkdir -p uploads

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node index.js"]
