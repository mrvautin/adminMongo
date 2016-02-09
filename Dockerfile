FROM node:latest

COPY . /app/user

WORKDIR /app/user

RUN npm install

CMD node app.js
