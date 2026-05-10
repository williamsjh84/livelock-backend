FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm run build

# Copy .well-known folder into the frontend dist output
RUN mkdir -p dist/public/.well-known && cp -r public/.well-known/. dist/public/.well-known/

EXPOSE 3000

CMD ["node", "dist/index.js"]
