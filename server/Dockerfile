# Deploy testado
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

ENV DATABASE_URL="mysql://build:build@localhost:3306/build"

# --- NOVA LINHA OBRIGATÓRIA PARA O PRISMA ---
RUN npx prisma generate

EXPOSE 3001
CMD [ "npm", "start" ]