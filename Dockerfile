FROM node:alpine
WORKDIR /app/user

COPY package.json .
RUN npm install --production

COPY . .
RUN rm /app/user/config/config.json

EXPOSE 1234

CMD node app.js
