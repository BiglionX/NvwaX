# Nvwax Agent 平台行业插件增强需求（PRD v2.0）

> 项目：Nvwax（`nvwax.proclaw.cc`）
> 版本：v2.0
> 关联文档：ProClaw 插件系统 PRD——行业工作流插件（PRD v10.0）、SkillHub 行业技能仓库增强需求（PRD v2.0）
> 目标：扩展 Nvwax Agent 平台，使 Agent 能感知 ProClaw 插件上下文、输出插件可执行的动作指令，并与 SkillHub 协同推荐行业技能。

---

## 一、背景与目标

### 1.1 背景

- Nvwax v1.x 生成的 Agent 主要面向对话场景，输出纯文本、Markdown 或简单卡片。
- ProClaw v10.0 引入行业工作流插件（餐饮点餐、维修工单等），需要 Agent 能够触发插件内的具体操作（如"创建维修工单"、"打印后厨订单"）。
- 当前 Agent 无法感知 ProClaw 实例中安装了哪些行业插件，也无法输出结构化动作指令供插件执行。
- 用户在安装行业插件后，需要手动寻找和安装配套的 AI Team，缺乏智能推荐机制。

### 1.2 目标

- 扩展 Agent 输出类型，增加 **Action（动作）** 类型，使 Agent 能触发插件命令。
- 实现插件上下文注入机制：Agent 系统提示词自动注入已安装插件的能力描述。
- 支持 Agent 在授权下读取插件内部数据（如查询未完成工单数量）。
- 实现技能推荐与自动安装：ProClaw 安装插件后，Nvwax 推荐配套 AI Team。
- 提供 API 端点供 ProClaw 调用。

---

## 二、功能需求

### 2.1 Agent 输出类型扩展

#### 2.1.1 Action 输出格式

在现有输出类型（纯文本、Markdown、卡片）基础上，增加 `action` 类型：

```json
{
  "type": "action",
  "action_name": "create_repair_order",
  "plugin_id": "com.proclaw.plugin.repair",
  "label": "创建维修工单",
  "description": "根据以下信息创建维修工单",
  "parameters": {
    "customer_name": "张三",
    "customer_phone": "13800138000",
    "device_model": "iPhone 12",
    "device_color": "蓝色",
    "fault_description": "屏幕破裂，触摸失灵",
    "estimated_cost": 599
  },
  "confirm_required": true,
  "confirm_message": "即将为张三创建 iPhone 12 屏幕维修工单，费用预估 ¥599，是否继续？"
}
```

#### 2.1.2 Action 格式规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 固定值 `"action"` |
| `action_name` | string | 是 | 动作名称（对应插件注册的命令名） |
| `plugin_id` | string | 否 | 目标插件 ID（如果存在多个插件支持同名动作可区分） |
| `label` | string | 是 | 动作的 UI 展示标签 |
| `description` | string | 否 | 动作描述文本 |
| `parameters` | object | 是 | 动作参数键值对 |
| `confirm_required` | boolean | 否 | 是否需用户确认后才执行（默认 false） |
| `confirm_message` | string | 否 | 确认对话框的提示消息 |
| `timeout_seconds` | integer | 否 | 动作执行超时时间（默认 30） |
| `fallback_text` | string | 否 | 动作执行失败时的备用回复文本 |

#### 2.1.3 支持组合输出

Agent 在同一轮回复中可混合输出多种类型：

```json
{
  "type": "mixed",
  "parts": [
    {
      "type": "text",
      "content": "已为您查询到张三的维修记录。建议创建一个新的维修工单："
    },
    {
      "type": "action",
      "action_name": "create_repair_order",
      "plugin_id": "com.proclaw.plugin.repair",
      "parameters": { ... }
    },
    {
      "type": "card",
      "title": "近期维修记录",
      "fields": [...]
    }
  ]
}
```

#### 2.1.4 ProClaw 端处理流程

1. Agent 返回包含 `type: "action"` 的响应
2. ProClaw 主应用解析响应，识别 Action
3. 如果 `confirm_required = true`，弹出确认对话框
4. 用户确认后，ProClaw 调用对应插件的后端命令（通过 Tauri invoke）
5. 将执行结果返回给用户，并可选择反馈给 Agent

### 2.2 插件上下文注入

#### 2.2.1 能力描述注入

当 ProClaw 实例中安装了行业插件时，调用 Nvwax Agent API 时自动传递插件能力信息。

**实现方式**：ProClaw 在请求 Nvwax API 时，通过 HTTP Header `X-Plugin-Capabilities` 传递：

```
X-Plugin-Capabilities: [
  {
    "plugin_id": "com.proclaw.plugin.restaurant",
    "plugin_name": "餐厅工作流",
    "actions": [
      {
        "name": "create_order",
        "label": "创建订单",
        "description": "创建新的点餐订单",
        "parameters": {
          "table_number": { "type": "string", "description": "桌号" },
          "items": { "type": "array", "description": "菜品列表" }
        }
      },
      {
        "name": "print_ticket",
        "label": "打印小票",
        "parameters": {
          "order_id": { "type": "string" }
        }
      }
    ],
    "data_queries": [
      {
        "name": "get_pending_orders",
        "description": "获取当前未完成的订单",
        "parameters": {},
        "returns": "array of order objects"
      }
    ]
  }
]
```

#### 2.2.2 系统提示词自动生成

Nvwax 后端收到 `X-Plugin-Capabilities` header 后，自动将插件能力描述转换为系统提示词注入点，例如：

```
你所在的环境已安装以下行业插件：

## 餐厅工作流 (com.proclaw.plugin.restaurant)
该插件提供以下可执行动作：
- create_order: 创建新的点餐订单。参数：table_number（桌号）, items（菜品列表）
- print_ticket: 打印小票。参数：order_id

该插件提供以下数据查询：
- get_pending_orders: 获取当前未完成的订单

当用户提出相关需求时，请使用上述动作生成 Action 输出。
对于数据查询类请求，请使用 data_query 输出类型。
```

#### 2.2.3 插件能力注册 API

ProClaw 端在安装/卸载插件时，调用 Nvwax API 通知能力变化：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v2/capabilities/register` | POST | 注册插件能力列表 |
| `/v2/capabilities/unregister` | POST | 卸载插件能力 |
| `/v2/capabilities/:plugin_id` | GET | 查询已注册的插件能力 |

**`POST /v2/capabilities/register` 请求：**

```json
{
  "plugin_id": "com.proclaw.plugin.restaurant",
  "plugin_name": "餐厅工作流",
  "actions": [ ... ],
  "data_queries": [ ... ],
  "skill_ids": ["skill-catering-001", "skill-catering-002"]
}
```

### 2.3 Agent 访问插件内部数据

#### 2.3.1 数据查询权限声明

在 Agent 的 manifest 中增加 `data_queries` 字段，声明需要读取的数据范围：

```json
{
  "id": "agent-catering-assistant",
  "name": "餐饮服务助手",
  "version": "1.0.0",
  "permissions": ["read_user", "send_message", "show_notification"],
  "data_queries": [
    {
      "name": "get_pending_orders",
      "plugin_id": "com.proclaw.plugin.restaurant",
      "query": "SELECT COUNT(*) FROM orders WHERE status = 'pending'",
      "description": "获取待处理订单数量",
      "parameters": {},
      "cache_ttl_seconds": 60
    },
    {
      "name": "get_table_status",
      "plugin_id": "com.proclaw.plugin.restaurant",
      "query": "SELECT table_number, status, guest_count FROM tables ORDER BY table_number",
      "description": "获取所有桌台状态",
      "parameters": {},
      "cache_ttl_seconds": 30
    }
  ]
}
```

#### 2.3.2 数据查询执行流程

1. Agent 在对话中识别到需要查询插件数据
2. Agent 输出 `type: "data_query"` 的请求：

```json
{
  "type": "data_query",
  "query_name": "get_pending_orders",
  "parameters": {},
  "reason": "用户询问当前有多少未完成订单"
}
```

3. ProClaw 主应用收到 `data_query` 请求后，执行对应的 SQL 查询（需检查权限）
4. 将查询结果注入回 Agent 的上下文，由 Agent 生成自然语言回复

#### 2.3.3 安全限制

- 数据查询仅限 `SELECT` 操作
- 查询范围限制在插件声明所属的数据库表
- 每次查询需经过 ProClaw 的权限验证
- 敏感字段（如客户手机号）可配置脱敏

### 2.4 技能推荐与自动安装

#### 2.4.1 触发时机

- 用户在 ProClaw 中首次安装行业插件时
- 用户在 Nvwax 市场浏览 Agent 时（基于当前 ProClaw 已安装插件）
- 用户手动请求技能推荐时

#### 2.4.2 推荐流程

```
ProClaw                              Nvwax
  |                                    |
  |--- POST /v2/agents/recommend ---->|
  |    { plugin_ids: ["catering"] }   |
  |                                    |--- GET /v2/skills?industry_tags=餐饮 
  |                                    |    (从 SkillHub 获取)
  |                                    |--- 匹配插件关联的 AI Agent 列表
  |<--- 200 OK -----------------------|
  |    {                              |
  |      "recommended_agents": [      |
  |        { id: "proclaw-catering-assistant", ... },
  |        { id: "proclaw-catering-menu", ... }
  |      ],
  |      "recommended_skills": [
  |        { id: "skill-catering-001", ... }
  |      ]
  |    }
  |                                    |
  |--- 展示推荐列表给用户 ------------->
  |--- 用户选择安装 ------------------->
```

#### 2.4.3 推荐算法逻辑

推荐 Agent 列表的排序依据（权重从高到低）：
1. **精确匹配**：插件 manifest 中显式声明的推荐 Agent
2. **行业匹配**：Agent 的 `industry_tags` 与插件的行业标签匹配
3. **热榜优先**：Nvwax 平台的下载量和评分
4. **功能互补**：Agent 的 capabilities 与插件功能模块互补（如安装了点餐插件，推荐后厨调度 Agent）

### 2.5 API 变更

#### 基础 URL：`https://nvwax.proclaw.cc/api/v2`

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/v2/agents/:id/presets` | GET | 根据插件能力返回 Agent 预设提示词 | API Key |
| `/v2/agents/recommend` | POST | 提交插件 ID，返回推荐的 Agent 列表 | API Key |
| `/v2/agents/:id/validate_action` | POST | 验证动作名称和参数是否符合插件定义 | API Key |
| `/v2/capabilities/register` | POST | 注册插件能力 | API Key |
| `/v2/capabilities/unregister` | POST | 卸载插件能力 | API Key |
| `/v2/capabilities/:plugin_id` | GET | 查询已注册的插件能力 | API Key |

#### 2.5.1 `POST /v2/agents/recommend`

**请求：**

```json
{
  "plugin_ids": ["catering", "com.proclaw.plugin.restaurant"],
  "industry_tags": ["餐饮"],
  "limit": 5,
  "include_skills": true
}
```

**响应：**

```json
{
  "recommended_agents": [
    {
      "id": "proclaw-catering-assistant",
      "name": "餐饮服务助手",
      "description": "面向餐厅前台和服务员的智能助手",
      "version": "1.0.0",
      "capabilities": ["pos_order_management", "menu_recommendation"],
      "plugin_id": "catering",
      "downloads": 1250,
      "rating": 4.5
    }
  ],
  "recommended_skills": [
    {
      "id": "skill-catering-001",
      "name": "菜品分类与推荐知识",
      "type": "knowledge",
      "source": "skillhub"
    }
  ],
  "total_agents": 3,
  "total_skills": 2
}
```

#### 2.5.2 `POST /v2/agents/:id/validate_action`

**请求：**

```json
{
  "action_name": "create_repair_order",
  "parameters": {
    "customer_name": "张三",
    "device_model": "iPhone 12"
  },
  "plugin_id": "com.proclaw.plugin.repair"
}
```

**响应：**

```json
{
  "valid": true,
  "plugin_id": "com.proclaw.plugin.repair",
  "action_name": "create_repair_order",
  "required_params": ["customer_name", "customer_phone", "device_model", "fault_description"],
  "provided_params": ["customer_name", "device_model"],
  "missing_params": ["customer_phone", "fault_description"],
  "suggestions": [
    "请补充客户手机号（customer_phone）",
    "请补充故障描述（fault_description）"
  ]
}
```

### 2.6 Agent 编排引擎增强

#### 2.6.1 Action 编排

Nvwax 的 Agent 编排引擎需增强以支持 Action 的生成：

- 在 LLM 调用时，通过系统提示词注入可用的插件动作列表（来自 `X-Plugin-Capabilities`）
- 使用 function calling 或等效机制约束 LLM 输出格式
- 动作名称和参数必须符合插件 manifest 中定义的 schema
- 支持 Multi-turn 动作编排：Agent 可先生成一个动作，根据执行结果再生成后续动作

#### 2.6.2 输出格式约束

LLM 调用时的 system prompt 增加以下约束：

```
You MUST follow these response format rules:

1. When the user asks you to perform a plugin action, output an action block:
   {"type": "action", "action_name": "...", "plugin_id": "...", "parameters": {...}}
   
2. Available actions and their parameters are listed in the "Available Plugin Actions" section above.

3. NEVER invent action names that are not in the available list.

4. If you need to query plugin data, use:
   {"type": "data_query", "query_name": "...", "parameters": {...}}

5. You can combine text and action/data_query in a mixed response:
   {"type": "mixed", "parts": [...]}
```

---

## 三、与 SkillHub 的协同

### 3.1 技能拉取

- Nvwax 在构建 Agent 时，通过调用 `GET /v2/skills?industry_tags=[]&type=knowledge` 从 SkillHub 拉取行业知识技能
- 拉取的技能内容自动组装进 Agent 的系统提示词
- Agent 运行时通过 `POST /skills/:id/vector_search` 实时检索知识库

### 3.2 知识闭环

- Agent 执行动作产生的结果，可经由用户授权后保存回 SkillHub 知识库（升级为 `knowledge` 类型的新版本）
- 例如：维修工单 Agent 积累常见故障处理方案，定期同步至 SkillHub 形成行业知识库
- 闭环流程：
  ```
  Agent 处理用户请求 -> 记录处理方案 -> 推送至 SkillHub 审核 -> 发布为新版知识片段 -> 被其他 Agent 使用
  ```

### 3.3 API 协议

Nvwax 与 SkillHub 之间的通信使用 Nvwax 的系统 API Key（在 Nvwax 控制台配置），SkillHub 视为一个数据源服务。

---

## 四、控制台增强

### 4.1 Agent 定义增强

Agent 编辑器中增加以下配置项：

- **插件能力关联**：选择该 Agent 可以与哪些插件联动
- **数据查询声明**：定义 Agent 需要读取的插件数据表/视图
- **动作验证规则**：配置动作参数的验证规则

### 4.2 测试面板增强

- **Action 测试**：输入 Agent 回复文本，模拟解析 Action 输出，验证格式正确性
- **上下文模拟**：模拟 ProClaw 发送的 `X-Plugin-Capabilities` header，测试 Agent 在不同插件环境下的行为
- **数据查询模拟**：模拟 `data_query` 执行并查看 Agent 的回复

---

## 五、安全与隐私

- Action 执行前必须经过用户确认（`confirm_required` 默认 true 除非插件显式声明为低风险）
- 数据查询权限遵守最小够用原则，Agent manifest 必须显式声明
- `X-Plugin-Capabilities` 内容仅用于当前对话 session，不持久化
- Agent 不可直接访问插件数据库表，所有数据访问须通过 ProClaw 代理执行
- API 调用频率限制：ProClaw 实例 500 次/分钟

---

## 六、实施路线图

| 阶段 | 时间 | 任务 |
|------|------|------|
| 1 | 2 周 | Action 输出格式设计与 Agent 编排引擎增强（function calling 集成 + 格式约束） |
| 2 | 1 周 | 插件上下文注入机制：`X-Plugin-Capabilities` header 解析 + 系统提示词自动生成 |
| 3 | 1 周 | capabilities 注册/注销 API 开发（`/v2/capabilities/*`） |
| 4 | 1 周 | 数据查询支持：`data_query` 输出类型 + manifest 声明 + 权限校验 |
| 5 | 1 周 | 推荐引擎：`/v2/agents/recommend` 端点 + 推荐算法 + SkillHub 集成 |
| 6 | 1 周 | 控制台增强：Agent 编辑器（插件关联 + 数据查询声明）+ 测试面板 |
| 7 | 3 天 | ProClaw 端集成联调：Action 解析 -> 插件命令调用 -> 结果回显全链路 |

---

## 七、验收标准

1. **Action 输出**：Agent 能在对话中输出 `type: "action"` 的结构化响应，ProClaw 端正确解析
2. **上下文注入**：ProClaw 传递 `X-Plugin-Capabilities` header 后，Agent 系统提示词正确包含插件能力描述
3. **数据查询**：Agent 输出 `type: "data_query"` 后，ProClaw 执行查询并返回结果，Agent 能基于结果生成自然语言回复
4. **技能推荐**：调用 `POST /v2/agents/recommend?plugin_ids=catering` 返回 3 个以上推荐 Agent
5. **动作验证**：`POST /v2/agents/:id/validate_action` 能正确识别缺失参数并给出建议
6. **组合输出**：Agent 能在同一轮回复中混合输出文本、Action、卡片
7. **SkillHub 协同**：Agent 构建时能从 SkillHub 拉取行业知识技能并成功注入提示词
