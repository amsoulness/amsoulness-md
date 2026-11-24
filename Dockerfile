FROM node:26-alpine
RUN apk add --no-cache git ffmpeg libwebp-tools python3 make g++
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile
COPY . .
ENV TZ=Asia/Kolkata
CMD ["node", "index.js"]
