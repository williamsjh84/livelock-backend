FROM node:20-alpine AS base
WORKDIR /app

RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Remove patches directory reference and install
RUN pnpm install --no-frozen-lockfile

# Copy all source files
COPY . .

# Build
RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
