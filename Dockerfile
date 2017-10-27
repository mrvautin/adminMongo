FROM node:alpine
WORKDIR /app/user

COPY package.json .
RUN npm install --production

COPY . .
CMD node app.js
