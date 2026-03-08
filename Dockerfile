FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package files and install (even if empty for now)
COPY package*.json ./
RUN npm install --production

# Copy game files
COPY . .

# Create the data directory for the PVC mount
RUN mkdir -p /app/data && chown -node:node /app/data

EXPOSE 3000

# Run as non-root (OpenShift Best Practice)
USER 1001

CMD ["node", "server.js"]