# BossClaw Agent Team 本地运行包

## 📦 说明

这是一个可独立运行的 AI Agent Team 包,包含:
- 团队配置 (config/team-config.json)
- 所需 Skills (skills/ 目录)
- Python 运行时入口 (main.py)

## 🚀 使用方法

### 方式 1: 直接运行可执行文件

**Windows:**
```bash
双击运行 .exe 文件
```

**macOS:**
```bash
chmod +x ./YourTeamName.app/Contents/MacOS/YourTeamName
./YourTeamName.app/Contents/MacOS/YourTeamName
```

**Linux:**
```bash
chmod +x ./YourTeamName
./YourTeamName
```

### 方式 2: 使用 Python 运行

```bash
# 安装依赖
pip install -r requirements.txt

# 运行
python main.py
```

## 💬 交互示例

```
============================================================
🚀 BossClaw AI Team: 客服智能体团队
📦 项目: 电商平台
📅 导出时间: 2026-04-26T13:00:00Z
============================================================

👥 团队成员 (3人):
   1. Customer Service Agent - 客户咨询处理
   2. Order Manager - 订单查询与管理
   3. Product Specialist - 产品知识专家

💬 请输入您的需求,输入 'exit' 或 'quit' 退出

> 帮我查询订单 #12345 的状态

⚙️  正在处理: 帮我查询订单 #12345 的状态
   (此处将调用 Leader Agent 执行团队协作)

✅ 执行完成:
   状态: completed
   消息: 已处理需求: 帮我查询订单 #12345 的状态
```

## ⚙️ 配置说明

团队配置位于 `config/team-config.json`,包含:
- `metadata`: 团队元信息
- `leaderConfig`: Leader Agent 配置
- `teammates`: 团队成员列表
- `workflow`: 工作流程定义
- `bindingRules`: 协作规则

## 🔧 自定义

如需修改团队行为,可以:
1. 编辑 `config/team-config.json`
2. 在 `skills/` 目录添加或修改 Skills
3. 重新打包或直接运行

## ❓ 常见问题

**Q: 运行时提示找不到配置文件?**  
A: 确保 `config/team-config.json` 文件存在且格式正确

**Q: 如何更新团队配置?**  
A: 从 NvwaX 平台重新导出并替换整个包

**Q: 支持哪些操作系统?**  
A: Windows 10+, macOS 10.14+, Ubuntu 18.04+

## 📞 技术支持

遇到问题请访问: https://github.com/BigLionX/NvwaX/issues
