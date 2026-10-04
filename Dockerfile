# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Optional managed-environment CA, never copied into image layers.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --strict-ssl=true --no-audit --no-fund
COPY src ./src
COPY server ./server
COPY shared ./shared
COPY scripts/assets.mjs ./scripts/assets.mjs
COPY public ./public
COPY index.html tsconfig.json vite.config.ts ./
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4173
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4173
CMD ["node", "--import", "tsx", "server/index.ts"]
