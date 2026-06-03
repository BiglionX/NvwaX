# 需求文档：行业插件 AI Agent 创建

> 版本：v1.0 · 目标：为餐饮/美业/宠物/Cloud 四大行业插件创建专用 AI Agent  
> 输出对象：nvwax（AI 团队生成工具）  
> 关联文档：`docs/需求文档：行业插件功能实现（餐饮 美业 宠物 Cloud）.md`

---

## 一、概述

ProClaw 已实现插件化行业版架构（Phase 4），四大行业插件的**前端页面**和**Rust 后端命令**已完成 P0-P3 级别的落地。  
现在需要为各行业插件创建**专用的 AI Agent**，使其能够理解行业上下文、提供行业智能服务。

### 1.1 现有 Agent 架构

当前系统已有内置 Agent（在 `database.rs` 中自动注册）：

| Agent ID | 名称 | 领域 |
|----------|------|------|
| `proclaw-finance-agent` | 财务管理 Agent | 通用财务 |
| `proclaw-task-agent` | 任务管理 Agent | 通用任务 |
| `proclaw-crm-agent` | 客户关系 Agent | 通用 CRM |
| `proclaw-docs-agent` | 文档协作 Agent | 通用文档 |
| `proclaw-hr-agent` | 人事管理 Agent | 通用 HR |

新行业 Agent 需要遵循相同的注册规范，但增加行业特有 capabilities。

### 1.2 Agent 注册规范

每个 Agent 在数据库中通过以下结构注册：

```json
{
  "id": "proclaw-{industry}-{name}",
  "name": "中文名称",
  "version": "1.0.0",
  "entry": "index.html",
  "description": "描述文本",
  "author": "ProClaw 官方",
  "permissions": ["read_user", "send_message", "show_notification"],
  "capabilities": ["行业特有能力"]
}
```

在 `src-tauri/src/database.rs` 的 `initialize()` 方法中注册（同现有 built-in agents 模式）。

---

## 二、餐饮行业 AI Agent（catering）

### 2.1 Agent 列表

| # | Agent ID | 名称 | 优先级 | 预估工时 |
|---|----------|------|--------|----------|
| 1 | `proclaw-catering-assistant` | 餐饮服务助手 | P1 | 3d |
| 2 | `proclaw-catering-menu` | 智能菜单顾问 | P2 | 2d |
| 3 | `proclaw-catering-kds` | 后厨调度助手 | P2 | 2d |

### 2.2 Agent 1: 餐饮服务助手（catering-assistant）

**定位**：面向餐厅前台/服务员，提供点餐推荐、订单查询、桌台管理一站式智能服务。

**Capabilities**：
- `pos_order_management` — 查询 POS 订单状态、催单、改单
- `menu_recommendation` — 基于顾客口味推荐菜品
- `table_status_query` — 查询桌台占用状态
- `daily_summary` — 当日营收、翻台率统计
- `member_lookup` — 会员信息查询

**触发场景**：
- 服务员在 POS 界面询问："3号桌客人不吃辣，推荐什么？"
- "今天一共多少桌已结账？营收多少？"
- "A5桌客人催菜了，菜做好了吗？"

**后端依赖**：`catering_get_pos_orders`、`catering_get_daily_summary`、`catering_get_kds_orders`

**权限**：`["read_user", "read_orders", "send_message", "show_notification"]`

### 2.3 Agent 2: 智能菜单顾问（catering-menu）

**定位**：面向顾客自助点餐场景，提供菜品推荐、营养搭配建议。

**Capabilities**：
- `dish_recommendation` — 根据口味/忌口推荐
- `popular_dishes` — 今日热销榜单
- `dietary_pairing` — 搭配建议（冷热/荤素/饮品）
- `special_diet` — 特殊饮食需求（素食/过敏原）

**权限**：`["read_user", "send_message"]`

### 2.4 Agent 3: 后厨调度助手（catering-kds）

**定位**：面向后厨，优化出餐流程、超时预警、打印联动。

**Capabilities**：
- `kds_order_monitor` — 监控待处理订单并排优先级
- `overdue_alert` — 超时订单自动预警
- `prep_time_estimate` — 预估备餐完成时间
- `printer_integration` — 新订单自动打印联动

**权限**：`["read_orders", "show_notification", "send_message"]`

---

## 三、美业行业 AI Agent（beauty）

### 3.1 Agent 列表

| # | Agent ID | 名称 | 优先级 | 预估工时 |
|---|----------|------|--------|----------|
| 1 | `proclaw-beauty-assistant` | 美业服务顾问 | P1 | 3d |
| 2 | `proclaw-beauty-scheduler` | 智能排班助手 | P2 | 2d |
| 3 | `proclaw-beauty-marketing` | 营销活动助手 | P3 | 2d |

### 3.2 Agent 1: 美业服务顾问（beauty-assistant）

**定位**：面向前台和美业顾问，提供预约管理、服务推荐、客户洞察。

**Capabilities**：
- `appointment_management` — 查询/创建/修改预约
- `service_recommendation` — 根据客户偏好推荐美业项目
- `employee_schedule_query` — 查看技师排班和空闲时段
- `member_insight` — 客户消费习惯、到店频率分析
- `crm_engagement` — 沉睡客户唤醒（30天未到店自动提醒）

**触发场景**：
- "张女士上次做的什么项目？建议今天做什么？"
- "今天下午小王有空档吗？我想约个面部护理"
- "有哪些会员超过1个月没来了？"

**后端依赖**：`beauty_get_appointments`、`beauty_get_employees`

**权限**：`["read_user", "read_crm", "send_message", "show_notification"]`

### 3.3 Agent 2: 智能排班助手（beauty-scheduler）

**定位**：优化技师排班，提升人效。

**Capabilities**：
- `schedule_optimization` — 根据历史到店数据优化排班
- `peak_hour_prediction` — 预测高峰时段并建议人力调配
- `leave_management` — 管理请假、调班申请
- `commission_calc` — 自动计算提成

**权限**：`["read_user", "read_finance", "send_message"]`

### 3.4 Agent 3: 营销活动助手（beauty-marketing）

**定位**：自动生成和执行营销活动。

**Capabilities**：
- `campaign_templates` — "沉睡唤醒"、"生日礼"、"充值满赠"
- `campaign_analytics` — 活动参与率和转化率分析
- `wechat_template_push` — 微信模板消息推送（可选）
- `coupon_distribution` — 自动发放优惠券

**权限**：`["read_crm", "send_message", "show_notification"]`

---

## 四、宠物行业 AI Agent（pet）

### 4.1 Agent 列表

| # | Agent ID | 名称 | 优先级 | 预估工时 |
|---|----------|------|--------|----------|
| 1 | `proclaw-pet-assistant` | 宠物养护顾问 | P1 | 3d |
| 2 | `proclaw-pet-boarding` | 寄养管理助手 | P2 | 2d |
| 3 | `proclaw-pet-health` | 健康管理助手 | P2 | 2d |

### 4.2 Agent 1: 宠物养护顾问（pet-assistant）

**定位**：面向宠物店主和宠物主人，提供养护建议、商品推荐。

**Capabilities**：
- `pet_care_advice` — 提供宠物日常养护建议（饮食/运动/行为）
- `breed_query` — 不同品种的特性和注意事项
- `grooming_recommendation` — 推荐合适的洗护方案
- `product_recommendation` — 推荐宠物用品/食品
- `emergency_guide` — 常见宠物紧急情况处理指南

**触发场景**：
- "金毛掉毛严重怎么办？"
- "我家猫3个月大，推荐什么粮？"
- "狗狗洗完澡后皮肤发红是怎么回事？"

**权限**：`["read_user", "send_message", "show_notification"]`

### 4.3 Agent 2: 寄养管理助手（pet-boarding）

**定位**：辅助寄养业务的日常运营。

**Capabilities**：
- `boarding_status_query` — 查询寄养房间状态和占用情况
- `daily_log_management` — 记录每日喂养/遛狗/用药
- `checkout_calculation` — 自动计算寄养费用和附加服务费
- `owner_communication` — 向主人推送宠物日常照片和状态
- `availability_forecast` — 预测节假日寄养需求高峰

**权限**：`["read_user", "send_message", "show_notification"]`

### 4.4 Agent 3: 健康管理助手（pet-health）

**定位**：管理宠物健康和疫苗记录。

**Capabilities**：
- `vaccine_reminder` — 疫苗到期自动提醒
- `vaccine_schedule` — 不同宠物/品种的推荐疫苗计划
- `weight_tracking` — 体重变化趋势分析
- `health_log` — 就诊/寄养/洗护历史记录查询
- `medical_alert` — 异常健康指标预警

**权限**：`["read_user", "send_message", "show_notification"]`

---

## 五、Cloud 平台 AI Agent

### 5.1 Agent 列表

| # | Agent ID | 名称 | 优先级 | 预估工时 |
|---|----------|------|--------|----------|
| 1 | `proclaw-cloud-billing` | Token 计费助手 | P1 | 2d |
| 2 | `proclaw-cloud-ops` | 云平台运营助手 | P2 | 2d |
| 3 | `proclaw-cloud-backup` | 备份恢复助手 | P2 | 1d |

### 5.2 Agent 1: Token 计费助手（cloud-billing）

**定位**：帮助用户管理 Token 消耗和套餐选择。

**Capabilities**：
- `token_balance_query` — 查询余额和消耗趋势
- `plan_recommendation` — 根据消耗量推荐最优套餐
- `usage_analytics` — 按资源类型的消耗分析
- `budget_alert` — 余额低于阈值自动预警
- `invoice_query` — 查询历史账单和支付记录

**触发场景**：
- "我这个月用了多少 Token？够用吗？"
- "推荐一个适合我的套餐"
- "帮我看看昨天的消耗为什么突然变高了"

**后端依赖**：`get_token_summary_cmd`、`get_token_usage_cmd`、`get_token_balance_cmd`、`get_plans_cmd`

**权限**：`["read_finance", "send_message", "show_notification"]`

### 5.3 Agent 2: 云平台运营助手（cloud-ops）

**定位**：面向平台运营人员，提供商城运营数据。

**Capabilities**：
- `store_analytics` — 商城总数、在线率、订单趋势
- `product_sync_status` — 商品同步到云端的成功率
- `order_monitoring` — 云商城订单监控
- `performance_report` — 平台性能报告（响应时间、可用性）

**权限**：`["read_finance", "read_orders", "send_message"]`

### 5.4 Agent 3: 备份恢复助手（cloud-backup）

**定位**：管理数据备份和恢复流程。

**Capabilities**：
- `backup_status_query` — 查询备份状态和历史
- `auto_backup_config` — 配置自动备份策略
- `restore_assistant` — 引导恢复流程
- `backup_integrity_check` — 备份完整性检查
- `disaster_recovery` — 灾难恢复指南

**权限**：`["read_user", "send_message", "show_notification"]`

---

## 六、实现计划

### 6.1 代码修改点

1. **`src-tauri/src/database.rs`** — 在 `initialize()` 方法的 built-in agents 注册处追加行业 Agent（参考已有模式）：

```rust
let industry_builtins = vec![
    ("proclaw-catering-assistant", "餐饮服务助手", 
     vec!["read_user", "send_message", "show_notification"],
     vec!["pos_order_management", "menu_recommendation", "table_status_query", "daily_summary"],
     "智能餐饮助手 - POS 点餐、桌台管理、菜单推荐、营收统计"),
    // ... 其他 Agent 同上
];

for (id, name, permissions, capabilities, description) in &industry_builtins {
    // 同现有注册逻辑
}
```

2. **`src/agents/bundles/`** — 为每个行业 Agent 创建 bundle 目录（可选，用于前端加载 Agent UI）

### 6.2 注册顺序建议

按以下顺序逐个注册并验证：

| 顺序 | Agent | 说明 |
|------|-------|------|
| 1 | `cloud-billing` | 最简单，复用现有 API |
| 2 | `catering-assistant` | 核心，验证餐饮整体流程 |
| 3 | `beauty-assistant` | 核心，验证美业预约流程 |
| 4 | `pet-assistant` | 核心，验证宠物养护场景 |
| 5 | 其余 Agent | 按需逐步建立 |

### 6.3 验证方式

1. 启动应用，切换到对应行业模式
2. 在 AI 对话页面输入触发场景中的问题
3. 确认 Agent 能正确调用后端命令并返回行业相关回答
4. 检查 `agents` 表中已注册行业 Agent
5. 确认 Agent 的 capabilities 在 `ceo_get_tasks` 任务分派中可被识别

---

## 七、注意事项

1. **manifest.json 更新**：各行业插件的 `manifest.json` 中 `agents` 字段需引用对应 Agent ID
2. **多语言支持**：初始版本使用中文，后续考虑国际版英文 Agent
3. **数据隐私**：Agent 能访问的数据仅限于插件激活时的行业相关表
4. **退化处理**：如果 Agent 后端命令查询返回空数据，Agent 应基于通用知识提供参考信息
5. **Agent 间协作**：行业 Agent 可调用通用 Agent（如 finance-agent、task-agent）的能力
