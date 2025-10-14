FROM node:24-alpine
LABEL org.opencontainers.image.authors="houthacker@pm.me"
WORKDIR /autotune
RUN apk add --no-cache jq git openssh sudo coreutils bash curl
RUN git clone --branch v0.7.1 https://github.com/openaps/oref0.git /autotune/oref0
WORKDIR /autotune/oref0
RUN npm run global-install

WORKDIR /converter
COPY . .
RUN sed -i 's/\r$//' bin/app.sh bin/run-autotune.sh
RUN npm install
RUN npm install -g .
EXPOSE 80
CMD ["node", "web-server.js"]
