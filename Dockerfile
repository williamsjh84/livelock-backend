FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy all source files
COPY . .

# Build the app
RUN pnpm run build

# Copy public folder to dist/public so static files are served
RUN cp -r public dist/public 2>/dev/null || true

EXPOSE 3000

CMD ["node", "dist/index.js"]
