#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过 Lighthouse Integration 一键部署 NvwaX 到腾讯云服务器
用法：
  python deploy_lighthouse.py           # 部署前后端（完整构建）
  python deploy_lighthouse.py --quick  # 仅重启容器（无代码变更）

前置条件：
  1. 在 CodeBuddy 中打开此项目（Lighthouse 集成需通过 AI 调用）
  2. 或手动 SSH 到服务器执行以下步骤

手动部署步骤（任何 IDE 通用）：
  ssh ubuntu@43.156.133.180
  cd /opt/nvwax
  git pull origin main
  docker compose --env-file .env up -d --build
"""

import sys

def print_manual_steps():
    print("""
==== NvwaX 手动部署步骤（适用于任何 IDE）====

【方式一：SSH 直接部署】
  ssh ubuntu@43.156.133.180
  cd /opt/nvwax
  git pull origin main
  docker compose --env-file .env up -d --build

【方式二：VS Code Remote SSH】
  1. 安装插件：Remote - SSH
  2. F1 → "Remote-SSH: Connect to Host"
  3. 输入：ubuntu@43.156.133.180
  4. 连接后打开 /opt/nvwax 目录
  5. 在终端执行上述 docker compose 命令

【方式三：通过 CodeBuddy 部署】
  在 CodeBuddy 聊天框中输入：重新部署

==== 服务器信息 ====
  IP: 43.156.133.180
  用户: ubuntu
  项目目录: /opt/nvwax
  Lighthouse 实例 ID: lhins-5x8onyrr
  Lighthouse 地域: ap-singapore
""")

if __name__ == '__main__':
    print_manual_steps()
    print("提示：此脚本仅显示部署步骤。请在 CodeBuddy 中输入「重新部署」以自动执行。")
    sys.exit(0)
