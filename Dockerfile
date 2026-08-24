# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY backend/package.json backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY backend/package.json backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /app/client/dist ./client/dist

USER node
EXPOSE 3000
CMD ["node", "backend/dist/index.js"]
