FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY nest-cli.json tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps

FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/generated ./generated

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]