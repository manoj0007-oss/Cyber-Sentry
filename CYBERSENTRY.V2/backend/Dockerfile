FROM node:20-alpine

WORKDIR /app

# Install deps first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the app (includes src)
COPY . .

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]



