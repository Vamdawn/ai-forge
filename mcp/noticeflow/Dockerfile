FROM node:24.15.0-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild better-sqlite3 fs-ext esbuild
COPY tsconfig*.json ./
COPY src ./src
RUN npm run typecheck && npm run build && npm prune --omit=dev --ignore-scripts

FROM node:24.15.0-bookworm-slim
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p /data /backup && chown node:node /data /backup
USER node
EXPOSE 3000
ENTRYPOINT ["node", "dist/main.js"]
CMD ["serve", "--config", "/run/noticeflow/config.yaml"]
