FROM node:20-bookworm

# Install pnpm and build essentials for native modules
RUN npm install -g pnpm && \
    apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy engine package config and install dependencies
COPY packages/anchor-engine/package.json ./packages/anchor-engine/
RUN pnpm install --frozen-lockfile --filter anchor-engine

# Copy engine source
COPY packages/anchor-engine ./packages/anchor-engine

WORKDIR /app/packages/anchor-engine

# Build (if necessary)
RUN pnpm run build

EXPOSE 3160

CMD ["node", "--expose-gc", "engine/dist/index.js"]
