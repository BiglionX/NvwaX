# 多 Agent 通信协议

本文档定义 NvwaX 项目中多个 agent 之间的标准化通信格式和交互流程。

---

## 消息格式规范

### 基础消息结构

```typescript
interface AgentMessage {
  // 消息元数据
  messageId: string;          // UUID v4
  timestamp: string;          // ISO 8601 格式
  version: string;            // 协议版本，当前为 "1.0"
  
  // 发送者信息
  sender: {
    agentType: string;        // e.g., "frontend-agent", "backend-agent"
    agentId: string;          // 唯一标识符
  };
  
  // 接收者信息（可选，广播时为 null）
  recipient?: {
    agentType: string;
    agentId?: string;
  } | null;
  
  // 消息类型
  messageType: MessageType;
  
  // 消息内容
  payload: MessagePayload;
  
  // 上下文信息
  context: {
    taskId: string;           // 所属任务 ID
    projectId: string;        // 项目 ID
    correlationId: string;    // 关联 ID，用于追踪请求链
  };
}

enum MessageType {
  TASK_ASSIGNMENT = 'TASK_ASSIGNMENT',           // 任务分配
  TASK_STARTED = 'TASK_STARTED',                 // 任务开始
  TASK_PROGRESS = 'TASK_PROGRESS',               // 任务进度更新
  TASK_COMPLETED = 'TASK_COMPLETED',             // 任务完成
  TASK_FAILED = 'TASK_FAILED',                   // 任务失败
  DEPENDENCY_REQUEST = 'DEPENDENCY_REQUEST',     // 依赖请求
  DEPENDENCY_RESPONSE = 'DEPENDENCY_RESPONSE',   // 依赖响应
  INTERFACE_CONTRACT = 'INTERFACE_CONTRACT',     // 接口契约定义
  ERROR_REPORT = 'ERROR_REPORT',                 // 错误报告
  HELP_REQUEST = 'HELP_REQUEST',                 // 求助请求
  REVIEW_REQUEST = 'REVIEW_REQUEST',             // 审查请求
  NOTIFICATION = 'NOTIFICATION'                  // 通知
}
```

### 消息载荷类型

#### 1. 任务分配 (TASK_ASSIGNMENT)

```typescript
interface TaskAssignmentPayload {
  taskId: string;
  taskDescription: string;
  requirements: string[];
  deliverables: string[];
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];     // 依赖的其他任务 ID
  estimatedEffort: string;    // 预估工作量，如 "2 hours"
  acceptanceCriteria: string[];
  resources?: {
    documentation?: string[];
    codeReferences?: string[];
    apiEndpoints?: string[];
  };
}
```

**示例**:
```json
{
  "messageId": "msg-001",
  "timestamp": "2026-04-24T10:00:00Z",
  "version": "1.0",
  "sender": {
    "agentType": "orchestrator",
    "agentId": "orch-001"
  },
  "recipient": {
    "agentType": "backend-agent",
    "agentId": "backend-001"
  },
  "messageType": "TASK_ASSIGNMENT",
  "payload": {
    "taskId": "task-auth-api",
    "taskDescription": "实现用户认证 API",
    "requirements": [
      "支持邮箱密码登录",
      "JWT token 生成和验证",
      "refresh token 机制",
      "速率限制防止暴力破解"
    ],
    "deliverables": [
      "POST /api/auth/login",
      "POST /api/auth/refresh",
      "POST /api/auth/logout",
      "认证中间件"
    ],
    "priority": "high",
    "dependencies": ["task-user-schema"],
    "estimatedEffort": "4 hours",
    "acceptanceCriteria": [
      "所有端点通过单元测试",
      "API 文档完整",
      "安全扫描无高危漏洞"
    ]
  },
  "context": {
    "taskId": "user-auth-system",
    "projectId": "nvwax-001",
    "correlationId": "corr-12345"
  }
}
```

#### 2. 任务进度 (TASK_PROGRESS)

```typescript
interface TaskProgressPayload {
  taskId: string;
  progress: number;            // 0-100
  status: 'in_progress' | 'blocked' | 'waiting_review';
  currentActivity: string;
  blockers?: string[];
  eta?: string;                // 预计完成时间
  artifacts?: {
    type: 'code' | 'doc' | 'test' | 'config';
    path: string;
    description: string;
    commitHash?: string;
  }[];
}
```

**示例**:
```json
{
  "messageType": "TASK_PROGRESS",
  "payload": {
    "taskId": "task-auth-api",
    "progress": 60,
    "status": "in_progress",
    "currentActivity": "实现 refresh token 逻辑",
    "eta": "2026-04-24T14:00:00Z",
    "artifacts": [
      {
        "type": "code",
        "path": "api/routes/auth.ts",
        "description": "登录和登出端点",
        "commitHash": "abc123"
      },
      {
        "type": "test",
        "path": "tests/auth.test.ts",
        "description": "认证测试用例",
        "commitHash": "abc123"
      }
    ]
  }
}
```

#### 3. 任务完成 (TASK_COMPLETED)

```typescript
interface TaskCompletedPayload {
  taskId: string;
  summary: string;
  artifacts: {
    type: 'code' | 'doc' | 'test' | 'config' | 'migration';
    path: string;
    description: string;
    size?: number;              // 文件大小（字节）
    checksum?: string;          // SHA256
  }[];
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    coverage?: number;
  };
  notes?: string;
  nextSteps?: string[];         // 建议的后续步骤
  dependsOnMe?: string[];       // 依赖此任务的其他任务
}
```

**示例**:
```json
{
  "messageType": "TASK_COMPLETED",
  "payload": {
    "taskId": "task-auth-api",
    "summary": "完成用户认证 API 实现，包括登录、刷新 token 和登出功能",
    "artifacts": [
      {
        "type": "code",
        "path": "api/routes/auth.ts",
        "description": "认证路由",
        "size": 2048
      },
      {
        "type": "code",
        "path": "api/middleware/auth.ts",
        "description": "JWT 验证中间件",
        "size": 1024
      },
      {
        "type": "test",
        "path": "tests/auth.test.ts",
        "description": "完整测试套件",
        "size": 3072
      },
      {
        "type": "doc",
        "path": "docs/api/auth.md",
        "description": "API 文档",
        "size": 1536
      }
    ],
    "testResults": {
      "total": 25,
      "passed": 25,
      "failed": 0,
      "coverage": 92
    },
    "notes": "使用了 bcrypt 进行密码哈希，JWT 过期时间设置为 15 分钟",
    "nextSteps": [
      "前端可以实现登录表单",
      "需要配置环境变量 JWT_SECRET"
    ],
    "dependsOnMe": ["task-login-form", "task-protected-routes"]
  }
}
```

#### 4. 接口契约 (INTERFACE_CONTRACT)

```typescript
interface InterfaceContractPayload {
  contractId: string;
  interfaceType: 'api' | 'component' | 'service' | 'database';
  name: string;
  version: string;
  specification: {
    // API 接口示例
    endpoints?: {
      method: string;
      path: string;
      requestSchema?: any;
      responseSchema?: any;
      authentication?: boolean;
    }[];
    
    // 组件接口示例
    componentProps?: {
      propName: string;
      propType: string;
      required: boolean;
      description: string;
    }[];
    
    // 数据库 schema
    schema?: any;
  };
  compatibility: 'backward' | 'forward' | 'breaking';
  effectiveDate: string;
}
```

**示例**:
```json
{
  "messageType": "INTERFACE_CONTRACT",
  "payload": {
    "contractId": "contract-user-api-v1",
    "interfaceType": "api",
    "name": "User API v1",
    "version": "1.0.0",
    "specification": {
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/users/:id",
          "responseSchema": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "email": { "type": "string" },
              "name": { "type": "string" },
              "createdAt": { "type": "string", "format": "date-time" }
            }
          },
          "authentication": true
        },
        {
          "method": "POST",
          "path": "/api/users",
          "requestSchema": {
            "type": "object",
            "required": ["email", "password"],
            "properties": {
              "email": { "type": "string", "format": "email" },
              "password": { "type": "string", "minLength": 8 },
              "name": { "type": "string" }
            }
          },
          "responseSchema": {
            "$ref": "#/definitions/User"
          },
          "authentication": false
        }
      ]
    },
    "compatibility": "backward",
    "effectiveDate": "2026-04-24T00:00:00Z"
  }
}
```

#### 5. 错误报告 (ERROR_REPORT)

```typescript
interface ErrorReportPayload {
  errorId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'compilation' | 'runtime' | 'test_failure' | 'dependency' | 'other';
  message: string;
  stackTrace?: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  impact: string;              // 影响范围描述
  suggestedFix?: string;       // 建议的修复方案
  relatedTasks?: string[];     // 相关任务 ID
}
```

**示例**:
```json
{
  "messageType": "ERROR_REPORT",
  "payload": {
    "errorId": "err-001",
    "severity": "high",
    "category": "dependency",
    "message": "Database migration failed: Column 'email' already exists",
    "location": {
      "file": "prisma/migrations/20260424_add_email/migration.sql",
      "line": 5
    },
    "impact": "阻止数据库迁移，影响所有需要数据库的任务",
    "suggestedFix": "检查迁移脚本，移除重复的 email 列定义",
    "relatedTasks": ["task-user-schema", "task-auth-api"]
  }
}
```

---

## 通信模式

### 1. 请求-响应模式

用于获取信息或请求服务：

```
Agent A                          Agent B
   |                                |
   |--- DEPENDENCY_REQUEST ------->|
   |  (我需要用户表 schema)         |
   |                                |
   |                                | (查询数据库定义)
   |                                |
   |<-- DEPENDENCY_RESPONSE -------|
   |  (返回 Prisma schema)          |
   |                                |
```

**使用场景**:
- 获取接口定义
- 请求代码审查
- 查询任务状态

### 2. 发布-订阅模式

用于广播状态更新：

```
Orchestrator
   |
   |--- NOTIFICATION --------------> Frontend Agent
   |  (后端 API 已完成)              |
   |                                |
   |--- NOTIFICATION --------------> Test Agent
   |  (后端 API 已完成)              |
   |                                |
   |--- NOTIFICATION --------------> Docs Agent
      (后端 API 已完成)              
```

**使用场景**:
- 任务完成通知
- 进度更新广播
- 紧急错误警报

### 3. 流水线模式

用于顺序依赖的任务：

```
Database Agent --> Backend Agent --> Frontend Agent --> Test Agent
     |                  |                  |                  |
  设计 Schema      实现 API          开发 UI           编写测试
     |                  |                  |                  |
     +------------------+------------------+------------------+
                        |
                   Orchestrator 协调
```

**使用场景**:
- 全栈功能开发
- CI/CD 管道
- 数据流处理

---

## 消息队列实现

### 基于 Redis 的实现

```typescript
import { createClient } from 'redis';

class AgentMessageQueue {
  private redis: ReturnType<typeof createClient>;
  private channels: Map<string, Set<(msg: AgentMessage) => void>>;
  
  constructor() {
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.channels = new Map();
  }
  
  async initialize() {
    await this.redis.connect();
    
    // 订阅所有 agent 通道
    this.channels.forEach((_, channel) => {
      this.redis.subscribe(channel, (message) => {
        const parsed = JSON.parse(message);
        this.notifySubscribers(channel, parsed);
      });
    });
  }
  
  subscribe(agentType: string, handler: (msg: AgentMessage) => void) {
    if (!this.channels.has(agentType)) {
      this.channels.set(agentType, new Set());
    }
    this.channels.get(agentType)!.add(handler);
  }
  
  async publish(message: AgentMessage) {
    const channel = message.recipient?.agentType || 'broadcast';
    await this.redis.publish(channel, JSON.stringify(message));
  }
  
  private notifySubscribers(channel: string, message: AgentMessage) {
    const handlers = this.channels.get(channel);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }
}
```

### 基于内存的实现（开发环境）

```typescript
class InMemoryMessageQueue {
  private listeners: Map<string, Set<(msg: AgentMessage) => void>>;
  
  constructor() {
    this.listeners = new Map();
  }
  
  subscribe(agentType: string, handler: (msg: AgentMessage) => void) {
    if (!this.listeners.has(agentType)) {
      this.listeners.set(agentType, new Set());
    }
    this.listeners.get(agentType)!.add(handler);
  }
  
  publish(message: AgentMessage) {
    const channel = message.recipient?.agentType || 'broadcast';
    
    // 通知特定通道
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach(handler => handler(message));
    }
    
    // 通知广播通道
    if (channel !== 'broadcast') {
      const broadcastListeners = this.listeners.get('broadcast');
      if (broadcastListeners) {
        broadcastListeners.forEach(handler => handler(message));
      }
    }
  }
}
```

---

## 消息追踪与调试

### 关联 ID 追踪

每个请求链使用唯一的 `correlationId`：

```typescript
// 生成关联 ID
function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 在日志中包含关联 ID
console.log(`[${correlationId}] Processing task assignment`);
```

### 消息日志

```typescript
interface MessageLog {
  messageId: string;
  correlationId: string;
  timestamp: string;
  direction: 'sent' | 'received';
  messageType: string;
  sender: string;
  recipient?: string;
  payloadSize: number;
  processingTime?: number;  // 毫秒
}

// 记录消息日志
function logMessage(message: AgentMessage, direction: 'sent' | 'received') {
  const log: MessageLog = {
    messageId: message.messageId,
    correlationId: message.context.correlationId,
    timestamp: new Date().toISOString(),
    direction,
    messageType: message.messageType,
    sender: `${message.sender.agentType}:${message.sender.agentId}`,
    recipient: message.recipient 
      ? `${message.recipient.agentType}:${message.recipient.agentId}`
      : undefined,
    payloadSize: JSON.stringify(message.payload).length
  };
  
  // 写入日志文件或监控系统
  writeToLog(log);
}
```

---

## 错误处理与重试

### 指数退避重试

```typescript
async function sendMessageWithRetry(
  message: AgentMessage,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await messageQueue.publish(message);
      return; // 成功则返回
    } catch (error) {
      if (attempt === maxRetries) {
        // 最后一次尝试失败，记录错误
        logError(message, error);
        throw error;
      }
      
      // 指数退避：1s, 2s, 4s, ...
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}
```

### 死信队列

```typescript
class DeadLetterQueue {
  private messages: AgentMessage[] = [];
  
  add(message: AgentMessage, reason: string) {
    this.messages.push({
      ...message,
      payload: {
        ...message.payload,
        deadLetterReason: reason,
        deadLetterTimestamp: new Date().toISOString()
      }
    });
    
    // 通知管理员
    notifyAdmin(`Message moved to DLQ: ${message.messageId}`);
  }
  
  retry(messageId: string) {
    const index = this.messages.findIndex(m => m.messageId === messageId);
    if (index !== -1) {
      const message = this.messages.splice(index, 1)[0];
      messageQueue.publish(message);
    }
  }
}
```

---

## 安全性考虑

### 消息签名

```typescript
import crypto from 'crypto';

function signMessage(message: AgentMessage, secret: string): string {
  const payload = JSON.stringify(message);
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function verifyMessage(message: AgentMessage, signature: string, secret: string): boolean {
  const expectedSignature = signMessage(message, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 消息加密（敏感数据）

```typescript
function encryptPayload(payload: any, encryptionKey: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  });
}
```

---

## 性能优化

### 消息批处理

```typescript
class BatchedMessageSender {
  private buffer: AgentMessage[] = [];
  private batchSize: number;
  private flushInterval: number;
  private timer: NodeJS.Timeout | null = null;
  
  constructor(batchSize: number = 10, flushInterval: number = 1000) {
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
  }
  
  enqueue(message: AgentMessage) {
    this.buffer.push(message);
    
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }
  
  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    if (this.buffer.length === 0) return;
    
    const batch = [...this.buffer];
    this.buffer = [];
    
    // 批量发送
    await Promise.all(batch.map(msg => messageQueue.publish(msg)));
  }
}
```

### 消息压缩

```typescript
import zlib from 'zlib';

function compressMessage(message: AgentMessage): Buffer {
  const json = JSON.stringify(message);
  return zlib.gzipSync(Buffer.from(json));
}

function decompressMessage(compressed: Buffer): AgentMessage {
  const json = zlib.gunzipSync(compressed).toString();
  return JSON.parse(json);
}
```

---

## 监控与可观测性

### 关键指标

```typescript
interface AgentMetrics {
  messagesSent: number;
  messagesReceived: number;
  averageProcessingTime: number;
  errorRate: number;
  queueLength: number;
  activeTasks: number;
  completedTasks: number;
}

// 定期上报指标
function reportMetrics(agentType: string, metrics: AgentMetrics) {
  prometheusClient.gauge('agent_messages_sent', { agent: agentType }, metrics.messagesSent);
  prometheusClient.gauge('agent_error_rate', { agent: agentType }, metrics.errorRate);
  // ...
}
```

### 分布式追踪

集成 OpenTelemetry：

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('nvwax-agent');

async function processTask(message: AgentMessage) {
  return tracer.startActiveSpan(`process.${message.messageType}`, async (span) => {
    span.setAttribute('message.id', message.messageId);
    span.setAttribute('agent.type', message.sender.agentType);
    
    try {
      // 处理逻辑
      await handleMessage(message);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

**协议版本**: 1.0  
**最后更新**: 2026-04-24  
**维护者**: NvwaX Team
