FROM node:6.9.0
WORKDIR /app/user

COPY package.json .
RUN npm install --production

COPY . .
CMD node app.js
