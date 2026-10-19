# syntax=docker/dockerfile:1

# ---- Estágio 1: build das dependências (compila o better-sqlite3, nativo) ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# ferramentas para compilar módulos nativos (node-gyp), caso não haja binário pré-compilado
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# instala só as dependências de produção usando o lockfile (reprodutível)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Estágio 2: runtime enxuto ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/plantao.sqlite
WORKDIR /app

# dependências já instaladas/compiladas no estágio anterior
COPY --from=builder /app/node_modules ./node_modules

# código da aplicação (apenas o necessário em runtime)
COPY package.json ./
COPY src ./src
COPY public ./public

# diretório de dados persistente, gravável pelo usuário não-root "node"
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

# saúde: o servidor responde 200 em "/" (serve o index.html)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
