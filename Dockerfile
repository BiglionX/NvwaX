# 使用 Node.js 官方镜像
FROM node:20-alpine AS base

# 安装 pnpm
RUN npm install -g pnpm@8

# 强制清除缓存标记（用于解决 Docker 缓存问题）
ARG CACHE_BUST=1

# ==================== 依赖安装阶段 ====================
FROM base AS deps
WORKDIR /app

# 复制 monorepo 配置文件
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY packages/nvwax-web/package.json ./packages/nvwax-web/
COPY packages/nvwax-server/package.json ./packages/nvwax-server/
COPY packages/nvwax-sdk/package.json ./packages/nvwax-sdk/

# 安装依赖（不使用 frozen-lockfile，因为我们还没有 lock 文件）
RUN pnpm install --no-frozen-lockfile

# ==================== 构建阶段 ====================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建后端
WORKDIR /app/packages/nvwax-server
RUN pnpm run build

# 构建前端
WORKDIR /app/packages/nvwax-web
RUN pnpm run build

# ==================== 生产环境 ====================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制后端文件
COPY --from=builder /app/packages/nvwax-server/dist ./packages/nvwax-server/dist
COPY --from=builder /app/packages/nvwax-server/node_modules ./packages/nvwax-server/node_modules
COPY --from=builder /app/packages/nvwax-server/package.json ./packages/nvwax-server/package.json

# 复制前端文件
COPY --from=builder /app/packages/nvwax-web/.next ./packages/nvwax-web/.next
COPY --from=builder /app/packages/nvwax-web/node_modules ./packages/nvwax-web/node_modules
COPY --from=builder /app/packages/nvwax-web/package.json ./packages/nvwax-web/package.json
COPY --from=builder /app/packages/nvwax-web/public ./packages/nvwax-web/public

# 设置权限
RUN chown -R nextjs:nodejs /app

USER nextjs

# 暴露端口
EXPOSE 3000 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["sh", "-c", "cd /app/packages/nvwax-server && node dist/index.js & cd /app/packages/nvwax-web && npx next start"]
