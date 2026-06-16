FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml .npmrc ./
COPY config ./config
COPY src ./src
COPY assets ./assets
COPY patches ./patches
COPY types ./types
COPY babel.config.js eslint.config.mjs stylelint.config.mjs tsconfig.json ./

RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm build:web

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=80

COPY --from=builder /app/dist-web ./dist-web
COPY server/dist/main.js ./server/dist/main.js

EXPOSE 80

CMD ["node", "server/dist/main.js"]
