/**
 * MicroBiz SQLite Local Storage Adapter
 * 
 * 为 ProClaw-Light 桌面端提供 SQLite 本地存储支持
 * 所有经营数据仅存储在商家本地，不上传云（除非开启 Pro 版备份）
 * 使用 better-sqlite3 库
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface LocalOrder {
  id: string;
  platform: string;
  orderNumber: string;
  items: string; // JSON string
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface LocalProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  salesLast30Days: number;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface LocalInventoryChange {
  id: string;
  productId: string;
  productName: string;
  change: number; // positive = increase, negative = decrease
  reason: string;
  orderId?: string;
  createdAt: string;
}

export interface SyncResult {
  success: boolean;
  syncedOrders: number;
  syncedProducts: number;
  errors: string[];
}

export class MicroBizSqliteAdapter {
  private db: Database.Database | null = null;
  private dbPath: string = '';

  /**
   * 连接本地 SQLite 数据库
   */
  connect(dbPath: string): boolean {
    try {
      // 确保目录存在
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.dbPath = dbPath;
      this.db = new Database(dbPath);

      // 启用 WAL 模式提高并发性能
      this.db.pragma('journal_mode = WAL');

      // 初始化表结构
      this.initializeTables();

      console.log(`[MicroBizSQLite] Connected to local database: ${dbPath}`);
      return true;
    } catch (error) {
      console.error('[MicroBizSQLite] Failed to connect:', error);
      return false;
    }
  }

  /**
   * 断开数据库连接
   */
  disconnect(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[MicroBizSQLite] Disconnected');
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.db !== null;
  }

  /**
   * 初始化本地表结构
   */
  private initializeTables(): void {
    if (!this.db) throw new Error('Database not connected');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS local_products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        price REAL NOT NULL DEFAULT 0,
        cost_price REAL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        sales_last_30_days INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'discontinued')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS local_orders (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        order_number TEXT NOT NULL,
        items TEXT DEFAULT '[]',
        total_amount REAL NOT NULL DEFAULT 0,
        customer_name TEXT DEFAULT '',
        customer_phone TEXT DEFAULT '',
        customer_address TEXT DEFAULT '',
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'cancelled')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS local_inventory_log (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES local_products(id),
        product_name TEXT NOT NULL,
        change_amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        order_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS local_sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_local_orders_status ON local_orders(status);
      CREATE INDEX IF NOT EXISTS idx_local_orders_platform ON local_orders(platform);
      CREATE INDEX IF NOT EXISTS idx_local_products_sku ON local_products(sku);
      CREATE INDEX IF NOT EXISTS idx_local_products_status ON local_products(status);
      CREATE INDEX IF NOT EXISTS idx_local_inventory_log_product ON local_inventory_log(product_id);
      CREATE INDEX IF NOT EXISTS idx_local_inventory_log_created ON local_inventory_log(created_at);
    `);
  }

  /**
   * 获取所有本地商品
   */
  getProducts(options?: { status?: string; category?: string }): LocalProduct[] {
    if (!this.db) throw new Error('Database not connected');

    let query = 'SELECT * FROM local_products WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.category) {
      query += ' AND category = ?';
      params.push(options.category);
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as LocalProduct[];
  }

  /**
   * 获取单个商品
   */
  getProduct(productId: string): LocalProduct | undefined {
    if (!this.db) throw new Error('Database not connected');
    const stmt = this.db.prepare('SELECT * FROM local_products WHERE id = ?');
    return stmt.get(productId) as LocalProduct | undefined;
  }

  /**
   * 更新商品库存
   */
  updateStock(productId: string, delta: number, reason: string, orderId?: string): boolean {
    if (!this.db) throw new Error('Database not connected');

    const db = this.db;

    const transaction = db.transaction(() => {
      // 获取当前商品
      const product = this.getProduct(productId);
      if (!product) throw new Error(`Product not found: ${productId}`);

      const newStock = product.stock + delta;
      if (newStock < 0) throw new Error(`Insufficient stock for product: ${product.name} (${product.stock} < ${Math.abs(delta)})`);

      // 更新库存
      const updateStmt = db.prepare(
        `UPDATE local_products SET stock = ?, updated_at = datetime('now') WHERE id = ?`
      );
      updateStmt.run(newStock, productId);

      // 记录变更日志
      const logId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const logStmt = db.prepare(
        `INSERT INTO local_inventory_log (id, product_id, product_name, change_amount, reason, order_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      logStmt.run(logId, productId, product.name, delta, reason, orderId || null);
    });

    try {
      transaction();
      return true;
    } catch (error) {
      console.error('[MicroBizSQLite] Stock update failed:', error);
      return false;
    }
  }

  /**
   * 同步库存（从外部订单扣减）
   */
  syncInventory(productId: string, quantity: number): boolean {
    return this.updateStock(
      productId,
      -Math.abs(quantity),
      'order_sync',
      undefined
    );
  }

  /**
   * 获取本地订单
   */
  getOrders(options?: { status?: string; platform?: string; since?: string }): LocalOrder[] {
    if (!this.db) throw new Error('Database not connected');

    let query = 'SELECT * FROM local_orders WHERE 1=1';
    const params: any[] = [];

    if (options?.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.platform) {
      query += ' AND platform = ?';
      params.push(options.platform);
    }
    if (options?.since) {
      query += ' AND created_at >= ?';
      params.push(options.since);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as LocalOrder[];
  }

  /**
   * 保存订单到本地
   */
  saveOrder(order: LocalOrder): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO local_orders (id, platform, order_number, items, total_amount,
          customer_name, customer_phone, customer_address, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(
        order.id,
        order.platform,
        order.orderNumber,
        order.items,
        order.totalAmount,
        order.customerName,
        order.customerPhone,
        order.customerAddress,
        order.status,
        order.createdAt
      );

      return true;
    } catch (error) {
      console.error('[MicroBizSQLite] Failed to save order:', error);
      return false;
    }
  }

  /**
   * 更新订单状态
   */
  updateOrderStatus(orderId: string, status: LocalOrder['status']): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const stmt = this.db.prepare(
        `UPDATE local_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`
      );
      stmt.run(status, orderId);
      return true;
    } catch (error) {
      console.error('[MicroBizSQLite] Failed to update order status:', error);
      return false;
    }
  }

  /**
   * 获取库存变更日志
   */
  getInventoryLog(productId?: string, limit = 100): LocalInventoryChange[] {
    if (!this.db) throw new Error('Database not connected');

    let query = 'SELECT * FROM local_inventory_log';
    const params: any[] = [];

    if (productId) {
      query += ' WHERE product_id = ?';
      params.push(productId);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as LocalInventoryChange[];
  }

  /**
   * 获取低库存商品（低于阈值）
   */
  getLowStockProducts(threshold: number): LocalProduct[] {
    if (!this.db) throw new Error('Database not connected');

    const stmt = this.db.prepare(
      'SELECT * FROM local_products WHERE stock <= ? AND status = ? ORDER BY stock ASC'
    );
    return stmt.all(threshold, 'active') as LocalProduct[];
  }

  /**
   * 获取动销分析数据
   */
  getSalesAnalysis(days: number): { hotProducts: LocalProduct[]; slowProducts: LocalProduct[] } {
    if (!this.db) throw new Error('Database not connected');

    const products = this.getProducts({ status: 'active' });

    // 动销品：30天内销售 > 0
    const hotProducts = products
      .filter(p => p.salesLast30Days > 0)
      .sort((a, b) => b.salesLast30Days - a.salesLast30Days);

    // 静销品：30天内销售 = 0
    const slowProducts = products
      .filter(p => p.salesLast30Days === 0);

    return { hotProducts, slowProducts };
  }

  /**
   * 获取同步元数据
   */
  getSyncMeta(key: string): string | null {
    if (!this.db) throw new Error('Database not connected');
    const stmt = this.db.prepare('SELECT value FROM local_sync_meta WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value || null;
  }

  /**
   * 设置同步元数据
   */
  setSyncMeta(key: string, value: string): void {
    if (!this.db) throw new Error('Database not connected');
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO local_sync_meta (key, value, updated_at)
       VALUES (?, ?, datetime('now'))`
    );
    stmt.run(key, value);
  }

  /**
   * 同步数据到云端（Pro版备份功能）
   */
  backup(backupPath?: string): string {
    if (!this.db) throw new Error('Database not connected');

    const targetPath = backupPath || this.dbPath + '.backup';

    try {
      // 使用 VACUUM INTO 创建备份（SQLite 3.27+）
      this.db.exec(`VACUUM INTO '${targetPath.replace(/'/g, "''")}'`);
      console.log(`[MicroBizSQLite] Backup created: ${targetPath}`);
      return targetPath;
    } catch (error) {
      // 回退方案：手动复制文件
      console.error('[MicroBizSQLite] VACUUM INTO failed, falling back to file copy:', error);
      fs.copyFileSync(this.dbPath, targetPath);
      return targetPath;
    }
  }

  /**
   * 获取数据库统计信息
   */
  getStats(): { productCount: number; orderCount: number; lowStockCount: number; dbSizeBytes: number } {
    if (!this.db) throw new Error('Database not connected');

    const productCount = (this.db.prepare('SELECT COUNT(*) as count FROM local_products').get() as any).count;
    const orderCount = (this.db.prepare('SELECT COUNT(*) as count FROM local_orders').get() as any).count;
    const lowStockCount = (this.db.prepare("SELECT COUNT(*) as count FROM local_products WHERE stock <= 5 AND status = 'active'").get() as any).count;

    let dbSizeBytes = 0;
    try {
      dbSizeBytes = fs.statSync(this.dbPath).size;
    } catch { /* ignore */ }

    return { productCount, orderCount, lowStockCount, dbSizeBytes };
  }
}

// 导出单例
export const microbizSqliteAdapter = new MicroBizSqliteAdapter();
