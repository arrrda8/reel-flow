FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ linux-headers
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy values for build-time only (Next.js needs these to compile)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime"
ENV AUTH_URL="http://localhost:3000"
ENV ENCRYPTION_KEY="0000000000000000000000000000000000000000000000000000000000000000"
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
