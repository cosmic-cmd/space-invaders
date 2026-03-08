FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p /app/data && chgrp -R 0 /app/data && chmod -R g=u /app/data

# Explicitly signal port 8080
EXPOSE 8080

USER 1001
CMD ["node", "server.js"]