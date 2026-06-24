FROM node:18-alpine

WORKDIR /workspace

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

EXPOSE 5173

# Run vite dev server exposing host for container mapping
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
