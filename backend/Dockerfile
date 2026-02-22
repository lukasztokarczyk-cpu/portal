FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN mkdir -p uploads/documents uploads/invoices uploads/attachments

EXPOSE 4000
CMD ["node", "src/server.js"]
