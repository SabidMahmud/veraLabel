# syntax=docker/dockerfile:1
FROM node:22-alpine AS dependencies
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .

# Build the Next.js app
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S -g 1001 veralabel && adduser -S -u 1001 -G veralabel veralabel
COPY --from=builder --chown=veralabel:veralabel /app/.next/standalone ./
COPY --from=builder --chown=veralabel:veralabel /app/.next/static ./.next/static
COPY --from=builder --chown=veralabel:veralabel /app/public ./public
COPY --chown=veralabel:veralabel scripts ./scripts
# The seed CLI runs outside Next.js, whose bundler otherwise embeds bcryptjs.
COPY --from=dependencies --chown=veralabel:veralabel /app/node_modules/bcryptjs ./node_modules/bcryptjs
USER veralabel
EXPOSE 3000

# Start the application
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 CMD node scripts/healthcheck.js
CMD ["node", "server.js"]
