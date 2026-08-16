/**
 * SessionStore — NvwaX 统一会话持久化服务
 * ------------------------------------------------------------
 * 镜像 @deepseek-ai/dsh-session（事件溯源会话日志）+ dsh-session-persistence-jsonl
 * （JSONL 持久化后端）的设计：会话是一串不可变事件，追加写入、按需重放。
 *
 * 存储：SESSION_STORE_DIR（默认 <cwd>/data/sessions）下每个会话一个 <id>.jsonl 文件，
 * 每行一个 JSON 事件，原子追加（appendFile 带 flag 'a'）。
 *
 * 替换路径：接入 DSH 运行时后，本服务可替换为 dsh-session + dsh-session-persistence-jsonl
 * 挂载在 Cordis Context 上，公共 API（createSession/append/read/list/search）保持不变。
 */

import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// ============================================================
// 类型
// ============================================================

export interface SessionCreatedEvent {
  type: 'session-created';
  meta: Record<string, unknown>;
  timestamp: string;
}

export interface SessionMessageEvent {
  type: 'message';
  role: 'user' | 'assistant';
  content: string;
  /** 附加业务数据（如搜索结果、建议、评分等），按业务约定序列化 */
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface SessionMetaEvent {
  type: 'meta';
  patch: Record<string, unknown>;
  timestamp: string;
}

export type SessionEvent = SessionCreatedEvent | SessionMessageEvent | SessionMetaEvent;

/** 追加事件输入：与 SessionEvent 同构但无需调用方提供 timestamp */
export type SessionEventInput =
  | Omit<SessionCreatedEvent, 'timestamp'>
  | Omit<SessionMessageEvent, 'timestamp'>
  | Omit<SessionMetaEvent, 'timestamp'>;

export interface SessionSnapshot {
  id: string;
  meta: Record<string, unknown>;
  events: SessionEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionSummary {
  id: string;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// ============================================================
// 实现
// ============================================================

function resolveStoreDir(): string {
  return process.env.SESSION_STORE_DIR ?? path.join(process.cwd(), 'data', 'sessions');
}

function nowIso(): string {
  return new Date().toISOString();
}

export class SessionStore {
  private readonly dir: string;

  constructor(dir?: string) {
    this.dir = dir ?? resolveStoreDir();
  }

  private filePath(id: string): string {
    return path.join(this.dir, `${id}.jsonl`);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  /** 创建会话，返回会话 id */
  async createSession(meta: Record<string, unknown> = {}): Promise<string> {
    await this.ensureDir();
    const id = randomUUID();
    const event: SessionCreatedEvent = { type: 'session-created', meta, timestamp: nowIso() };
    await fs.appendFile(this.filePath(id), JSON.stringify(event) + '\n', 'utf8');
    return id;
  }

  /** 追加事件（会话不存在时静默忽略，避免竞态写坏目录） */
  async append(sessionId: string, event: SessionEventInput): Promise<void> {
    await this.ensureDir();
    const full: SessionEvent = { ...event, timestamp: nowIso() } as SessionEvent;
    await fs.appendFile(this.filePath(sessionId), JSON.stringify(full) + '\n', 'utf8');
  }

  /** 重放会话全部事件并组装快照；不存在返回 null */
  async read(sessionId: string): Promise<SessionSnapshot | null> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath(sessionId), 'utf8');
    } catch {
      return null;
    }
    const events: SessionEvent[] = raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as SessionEvent);

    const meta: Record<string, unknown> = {};
    let createdAt = '';
    for (const ev of events) {
      if (ev.type === 'session-created') {
        Object.assign(meta, ev.meta);
        createdAt = ev.timestamp;
      } else if (ev.type === 'meta') {
        Object.assign(meta, ev.patch);
      }
    }
    const updatedAt = events.length > 0 ? events[events.length - 1].timestamp : createdAt;
    return { id: sessionId, meta, events, createdAt, updatedAt };
  }

  /** 同步读取（供必须同步返回的接口使用；文件很小，成本可接受） */
  readSync(sessionId: string): SessionSnapshot | null {
    let raw: string;
    try {
      raw = readFileSync(this.filePath(sessionId), 'utf8');
    } catch {
      return null;
    }
    const events: SessionEvent[] = raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as SessionEvent);

    const meta: Record<string, unknown> = {};
    let createdAt = '';
    for (const ev of events) {
      if (ev.type === 'session-created') {
        Object.assign(meta, ev.meta);
        createdAt = ev.timestamp;
      } else if (ev.type === 'meta') {
        Object.assign(meta, ev.patch);
      }
    }
    const updatedAt = events.length > 0 ? events[events.length - 1].timestamp : createdAt;
    return { id: sessionId, meta, events, createdAt, updatedAt };
  }

  /** 删除会话文件；不存在时返回 false */
  async delete(sessionId: string): Promise<boolean> {
    try {
      await fs.unlink(this.filePath(sessionId));
      return true;
    } catch {
      return false;
    }
  }

  /** 列出会话摘要（按更新时间倒序） */
  async list(): Promise<SessionSummary[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.dir);
    } catch {
      return [];
    }
    const summaries: SessionSummary[] = [];
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const id = file.slice(0, -'.jsonl'.length);
      const snap = await this.read(id);
      if (!snap) continue;
      summaries.push({
        id,
        meta: snap.meta,
        createdAt: snap.createdAt,
        updatedAt: snap.updatedAt,
        messageCount: snap.events.filter((e) => e.type === 'message').length,
      });
    }
    summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return summaries;
  }

  /** 简单全文检索：命中返回会话 id 列表 */
  async search(query: string): Promise<string[]> {
    const needle = query.toLowerCase();
    const summaries = await this.list();
    const hits: string[] = [];
    for (const s of summaries) {
      const snap = await this.read(s.id);
      if (!snap) continue;
      const haystack = snap.events
        .map((e) => (e.type === 'message' ? `${e.role} ${e.content}` : JSON.stringify(e)))
        .join('\n')
        .toLowerCase();
      if (haystack.includes(needle)) hits.push(s.id);
    }
    return hits;
  }
}

export const sessionStore = new SessionStore();
