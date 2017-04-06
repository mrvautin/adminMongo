FROM node:latest

COPY . /app/user

# Remove the standard app.json config - see issue #152 for details
RUN rm /app/user/config/app.json

WORKDIR /app/user
RUN npm install
CMD node app.js
