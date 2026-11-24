FROM node:26-alpine
RUN apk add --no-cache git ffmpeg libwebp-tools python3 make g++
WORKDIR /app
COPY package.json yarn.lock ./
RUN npm install -g yarn@1.22.22 && yarn install --frozen-lockfile
COPY . .
ENV TZ=Asia/Kolkata
CMD ["node", "index.js"]
