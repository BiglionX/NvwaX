# SSH 部署指南

## 快速开始

### 前置条件

1. **SSH 密钥配置**：确保已配置 SSH 密钥可以无密码登录服务器
   ```bash
   ssh ubuntu@43.156.133.180
   ```

2. **构建项目**：部署前需要先构建项目
   ```bash
   # 构建后端
   cd packages/nvwax-server
   npm run build
   
   # 构建前端
   cd packages/account-portal
   npm run build
   ```

## 使用方法

### 1. 部署后端

```bash
python deploy_ssh.py backend
```

这将：
- 打包 `packages/nvwax-server/dist` 目录
- 通过 SCP 上传到服务器
- 解压并通过 docker cp 复制到容器
- 重启后端容器

### 2. 部署前端

```bash
python deploy_ssh.py frontend
```

这将：
- 打包 `packages/account-portal/out` 目录
- 通过 SCP 上传到服务器
- 替换旧版本（保留备份）
- 重启后端容器（前端由后端服务）

### 3. 同时部署前后端

```bash
python deploy_ssh.py both
```

或直接运行（默认是 both）：

```bash
python deploy_ssh.py
```

## 部署流程

```
本地构建 → 打包 tar.gz → SCP 上传 → 远程解压 → 替换文件 → 重启容器 → 验证
```

## 日志

部署日志保存在：`deploy_ssh.log`

查看日志：
```bash
cat deploy_ssh.log
```

## 故障排除

### SSH 连接失败

```
错误: ssh hostname failed, abort
```

检查：
1. 网络连接是否正常
2. SSH 密钥是否正确配置
3. 服务器地址是否正确（43.156.133.180）

### 构建文件不存在

```
错误: 后端 dist 目录不存在
错误: 前端 out 目录不存在
```

解决：
```bash
# 构建后端
cd packages/nvwax-server
npm run build

# 构建前端
cd packages/account-portal
npm run build
```

### 部署后服务未启动

```bash
# SSH 到服务器检查
ssh ubuntu@43.156.133.180

# 查看容器状态
cd /opt/nvwax
docker compose ps

# 查看容器日志
docker compose logs backend
docker compose logs nginx
```

## 手动部署

如果脚本失败，可以手动执行：

### 后端手动部署

```bash
# 1. 本地打包
tar -czf backend-dist.tar.gz -C packages/nvwax-server/dist .

# 2. 上传到服务器
scp backend-dist.tar.gz ubuntu@43.156.133.180:/tmp/

# 3. SSH 到服务器
ssh ubuntu@43.156.133.180

# 4. 解压并部署
cd /tmp
rm -rf backend-dist-new
mkdir backend-dist-new
cd backend-dist-new
tar -xzf ../backend-dist.tar.gz

# 5. 复制到容器
docker cp /tmp/backend-dist-new/. nvwax-backend:/app/packages/nvwax-server/dist/

# 6. 重启容器
cd /opt/nvwax
docker compose restart backend
```

### 前端手动部署

```bash
# 1. 本地打包
tar -czf portal-out.tar.gz -C packages/account-portal/out .

# 2. 上传到服务器
scp portal-out.tar.gz ubuntu@43.156.133.180:/tmp/

# 3. SSH 到服务器
ssh ubuntu@43.156.133.180

# 4. 解压
cd /tmp
rm -rf portal-out-new
mkdir portal-out-new
cd portal-out-new
tar -xzf ../portal-out.tar.gz

# 5. 替换旧版本
cd /opt/nvwax
mv account-portal-out account-portal-out.bak.$(date +%Y%m%d_%H%M%S)
mv /tmp/portal-out-new account-portal-out

# 6. 重启容器
docker compose restart backend
```

## 其他部署脚本

项目还包含其他专用部署脚本：

- `deploy_portal.py` - 专门部署前端门户
- `deploy_backend_fix.py` - 专门部署后端修复
- `deploy_eyebutton.py` - 部署密码输入框眼睛按钮功能
- `scripts/deploy-account.sh` - 完整部署 account.proclaw.cc

可以根据需要选择使用。
