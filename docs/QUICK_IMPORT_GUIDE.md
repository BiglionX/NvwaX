# 虚拟公司冷启动数据导入 - 操作指南

## 🚨 当前问题

远程数据库 (43.156.133.180:5432) 连接超时，无法直接导入数据。

## ✅ 解决方案

### 方案一：使用Docker启动本地PostgreSQL（推荐）

#### 步骤1：启动Docker Desktop
1. 打开 Docker Desktop 应用程序
2. 等待Docker服务完全启动

#### 步骤2：启动PostgreSQL容器
```bash
# 在项目根目录执行
docker run --name nvwax-postgres -e POSTGRES_PASSWORD=NvwaX@2024Secure! -e POSTGRES_DB=nvwax -e POSTGRES_USER=nvwax -p 5432:5432 -d postgres:16-alpine
```

#### 步骤3：等待数据库就绪
```bash
# 等待10-15秒让数据库完全启动
timeout /t 15
```

#### 步骤4：执行导入
```bash
# 使用PowerShell脚本
.\import-popular-teams.ps1 localhost 5432 nvwax nvwax NvwaX@2024Secure!

# 或使用批处理脚本
import-popular-teams.bat localhost 5432 nvwax nvwax NvwaX@2024Secure!
```

#### 步骤5：验证结果
```bash
cd packages\nvwax-server
node scripts\verify-team-data.js
```

---

### 方案二：安装本地PostgreSQL

如果您不想使用Docker，可以安装本地PostgreSQL：

1. 下载 PostgreSQL: https://www.postgresql.org/download/windows/
2. 安装时设置密码为: `NvwaX@2024Secure!`
3. 创建数据库 `nvwax`
4. 运行导入脚本

---

### 方案三：修复远程数据库连接

如果必须使用远程数据库，请检查：

1. **网络连接**: 确保能访问 43.156.133.180
2. **防火墙**: 确认5432端口未被阻止
3. **数据库服务**: 确认远程PostgreSQL正在运行
4. **认证信息**: 验证用户名密码正确

测试连接：
```bash
telnet 43.156.133.180 5432
```

---

## 📋 快速命令参考

### Docker方式（最简单）
```bash
# 1. 启动数据库
docker run --name nvwax-postgres -e POSTGRES_PASSWORD=NvwaX@2024Secure! -e POSTGRES_DB=nvwax -e POSTGRES_USER=nvwax -p 5432:5432 -d postgres:16-alpine

# 2. 等待15秒
timeout /t 15

# 3. 导入数据
.\import-popular-teams.ps1

# 4. 验证
cd packages\nvwax-server && node scripts\verify-team-data.js
```

### 清理（如果需要重新开始）
```bash
docker stop nvwax-postgres
docker rm nvwax-postgres
```

---

## 🎯 预期结果

成功导入后，您将看到：
- ✅ 总共23个团队（原有3个 + 新增20个）
- ✅ 5个分类：development, analysis, content, design, operations
- ✅ 所有团队都包含完整的配置信息

---

## 💡 提示

1. **推荐使用Docker方案** - 最简单、最快速
2. **导入是安全的** - 使用ON CONFLICT DO NOTHING，可重复执行
3. **数据持久化** - Docker容器的数据在容器删除前会保留
4. **后续使用** - 导入后可以停止Docker容器，数据不会丢失

---

## 🆘 需要帮助？

如果遇到问题，请检查：
1. Docker是否正确安装并运行
2. 端口5432是否被占用
3. 是否有足够的磁盘空间
4. 网络连接是否正常

查看详细文档：`IMPORT_POPULAR_TEAMS_GUIDE.md`
