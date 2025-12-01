# Deploy testado
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# --- NOVA LINHA OBRIGATÓRIA PARA O PRISMA ---
RUN npx prisma generate

EXPOSE 3001
CMD [ "npm", "start" ]