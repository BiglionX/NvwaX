# Git SSH 配置指南 - 解决推送失败问题

## ❌ 当前问题

HTTPS 推送失败：
```
fatal: unable to access 'https://github.com/BiglionX/NvwaX.git/': 
Recv failure: Connection was reset
```

**原因**: 网络连接不稳定或防火墙阻止

**解决方案**: 使用 SSH 代替 HTTPS

---

## 🔑 步骤 1: 检查是否已有 SSH Key

```bash
# 检查是否存在 SSH key
ls C:\Users\%USERNAME%\.ssh\

# 应该看到以下文件（如果已配置）:
# id_ed25519
# id_ed25519.pub
# known_hosts
```

### 如果已有 SSH Key

直接跳到 **步骤 3: 添加到 GitHub**

### 如果没有 SSH Key

继续 **步骤 2: 生成新的 SSH Key**

---

## 🆕 步骤 2: 生成新的 SSH Key

### 打开 PowerShell 或 Git Bash

```bash
# 生成 Ed25519 key（推荐）
ssh-keygen -t ed25519 -C "1055603323@qq.com"
```

### 按提示操作

```
Generating public/private ed25519 key pair.
Enter file in which to save the key (C:\Users\YourName/.ssh/id_ed25519): [直接回车]
Enter passphrase (empty for no passphrase): [直接回车，不设密码]
Enter same passphrase again: [直接回车]
```

**预期输出**:
```
Your identification has been saved in id_ed25519
Your public key has been saved in id_ed25519.pub
The key fingerprint is:
SHA256:xxxxx 1055603323@qq.com
```

### 验证 Key 已生成

```bash
ls C:\Users\%USERNAME%\.ssh\

# 应该看到:
# id_ed25519      (私钥 - 不要分享！)
# id_ed25519.pub  (公钥 - 可以分享)
```

---

## 📋 步骤 3: 复制公钥

### 方法 A: 使用命令

```bash
# 显示公钥内容
type C:\Users\%USERNAME%\.ssh\id_ed25519.pub

# 输出类似:
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... 1055603323@qq.com
```

**选中并复制整个输出内容**（从 `ssh-ed25519` 开始到邮箱结束）

### 方法 B: 手动打开文件

```bash
notepad C:\Users\%USERNAME%\.ssh\id_ed25519.pub
```

然后全选 (Ctrl+A) 并复制 (Ctrl+C)

---

## 🌐 步骤 4: 添加到 GitHub

### 访问 GitHub SSH Keys 设置

1. **打开浏览器**
2. **访问**: https://github.com/settings/keys
3. **登录** GitHub 账号（如果需要）

### 添加新 Key

1. **点击** "New SSH key" 按钮（绿色）

2. **填写表单**:
   - **Title**: `NvwaX Development - BiglionX`
   - **Key type**: 保持默认 "Authentication Key"
   - **Key**: 粘贴刚才复制的公钥内容
   
3. **点击** "Add SSH key" 按钮

4. **确认**（如果需要输入密码）

### 验证添加成功

你应该在列表中看到新添加的 key：
```
NvwaX Development - BiglionX
Added today
```

---

## 🔗 步骤 5: 更改 Git 远程 URL

### 当前状态

```bash
cd d:\BigLionX\NvwaX
git remote -v

# 输出:
# origin  https://github.com/BiglionX/NvwaX.git (fetch)
# origin  https://github.com/BiglionX/NvwaX.git (push)
```

### 更改为 SSH

```bash
# 更改远程 URL
git remote set-url origin git@github.com:BiglionX/NvwaX.git

# 验证更改
git remote -v

# 新输出:
# origin  git@github.com:BiglionX/NvwaX.git (fetch)
# origin  git@github.com:BiglionX/NvwaX.git (push)
```

---

## ✅ 步骤 6: 测试 SSH 连接

### 测试连接

```bash
ssh -T git@github.com
```

### 预期输出

**首次连接**:
```
The authenticity of host 'github.com (xxx.xxx.xxx.xxx)' can't be established.
ED25519 key fingerprint is SHA256:xxxxx.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes

Warning: Permanently added 'github.com' (ED25519) to the list of known hosts.
Hi BiglionX! You've successfully authenticated, but GitHub does not provide shell access.
```

**后续连接**:
```
Hi BiglionX! You've successfully authenticated, but GitHub does not provide shell access.
```

### 如果看到成功消息

✅ **SSH 配置成功！** 可以继续推送代码。

### 如果失败

查看下面的故障排除部分。

---

## 🚀 步骤 7: 推送代码

### 现在可以推送了

```bash
cd d:\BigLionX\NvwaX

# 推送所有提交
git push -u origin main
```

### 预期输出

```
Enumerating objects: xx, done.
Counting objects: 100% (xx/xx), done.
Delta compression using up to x threads
Compressing objects: 100% (xx/xx), done.
Writing objects: 100% (xx/xx), xx.xx KiB | xx.xx MiB/s, done.
Total xx (delta x), reused 0 (delta 0), pack-reused 0
remote: Resolving deltas: 100% (x/x), done.
To github.com:BiglionX/NvwaX.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

### 验证推送成功

访问: https://github.com/BiglionX/NvwaX

应该能看到所有提交和文件！

---

## 🐛 故障排除

### 问题 1: Permission denied (publickey)

**症状**:
```
git@github.com: Permission denied (publickey).
```

**解决**:

1. **确认 SSH agent 正在运行**
   ```bash
   # Windows PowerShell
   Get-Service ssh-agent
   
   # 如果未运行，启动它
   Start-Service ssh-agent
   Set-Service ssh-agent -StartupType Automatic
   ```

2. **添加 key 到 agent**
   ```bash
   ssh-add C:\Users\%USERNAME%\.ssh\id_ed25519
   ```

3. **验证 key 已添加**
   ```bash
   ssh-add -l
   
   # 应该看到你的 key
   ```

4. **重新测试**
   ```bash
   ssh -T git@github.com
   ```

---

### 问题 2: Could not resolve hostname

**症状**:
```
ssh: Could not resolve hostname github.com
```

**解决**:

1. **检查网络连接**
   ```bash
   ping github.com
   ```

2. **检查 DNS 设置**
   - 尝试使用 Google DNS: 8.8.8.8
   - 或 Cloudflare DNS: 1.1.1.1

3. **检查防火墙**
   - 确保端口 22 未被阻止

---

### 问题 3: Connection timed out

**症状**:
```
ssh: connect to host github.com port 22: Connection timed out
```

**解决**:

**方案 A**: 使用 HTTPS over SSH（端口 443）

编辑 `C:\Users\%USERNAME%\.ssh\config`（如果不存在则创建）：

```
Host github.com
    Hostname ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519
```

然后重试：
```bash
ssh -T git@github.com
git push -u origin main
```

**方案 B**: 使用代理

```bash
# 配置 Git 使用代理
git config --global http.proxy socks5://127.0.0.1:1080
git config --global https.proxy socks5://127.0.0.1:1080

# 推送
git push -u origin main

# 完成后取消代理
git config --global --unset http.proxy
git config --global --unset https.proxy
```

---

### 问题 4: Bad owner or permissions

**症状**:
```
Bad owner or permissions on C:\\Users\\...\\.ssh\\config
```

**解决**:

```bash
# 修复权限（Windows）
icacls C:\Users\%USERNAME%\.ssh\*.* /inheritance:r
icacls C:\Users\%USERNAME%\.ssh\id_ed25519 /grant %USERNAME%:R
icacls C:\Users\%USERNAME%\.ssh\id_ed25519.pub /grant %USERNAME%:R
```

---

## 📝 快速参考命令

```bash
# 1. 生成 SSH Key
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. 显示公钥
type C:\Users\%USERNAME%\.ssh\id_ed25519.pub

# 3. 启动 SSH Agent
Start-Service ssh-agent

# 4. 添加 Key
ssh-add C:\Users\%USERNAME%\.ssh\id_ed25519

# 5. 测试连接
ssh -T git@github.com

# 6. 更改远程 URL
git remote set-url origin git@github.com:BiglionX/NvwaX.git

# 7. 推送代码
git push -u origin main
```

---

## ✅ 验证清单

完成以下步骤即表示 SSH 配置成功：

- [ ] SSH Key 已生成
- [ ] 公钥已添加到 GitHub
- [ ] 远程 URL 已更改为 SSH
- [ ] `ssh -T git@github.com` 返回成功消息
- [ ] `git push` 成功推送代码
- [ ] GitHub 仓库可以看到最新提交

---

## 🎯 下一步

SSH 配置成功后：

1. ✅ 确认代码已推送到 GitHub
2. 📖 阅读 [DAY2-GUIDE.md](DAY2-GUIDE.md)
3. 🍴 Fork Flowise 仓库
4. 📥 克隆到本地
5. 📦 安装依赖
6. 🏃 启动开发服务器

---

**需要帮助？**

如果按照以上步骤仍然遇到问题，请：
1. 截图错误信息
2. 记录执行的命令
3. 联系技术支持

---

**祝你成功！** 🚀
