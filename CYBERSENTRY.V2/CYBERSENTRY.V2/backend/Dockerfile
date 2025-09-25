FROM node:20-alpine

WORKDIR /app

# Install deps first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]


