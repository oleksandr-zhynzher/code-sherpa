FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx nx run web:build --output-style=static

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npx", "next", "start", "apps/web", "-p", "3000", "-H", "0.0.0.0"]
