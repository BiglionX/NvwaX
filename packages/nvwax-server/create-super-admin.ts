import dotenv from 'dotenv';
import { databaseService } from './src/services/database.service.js';
import { v4 as uuidv4 } from 'uuid';

// 加载环境变量
dotenv.config();

async function createSuperAdmin() {
  console.log('\n🔧 创建超级管理员...\n');

  const superAdmin = {
    username: '1055603323@qq.com',
    password: 'admin123456',
    email: '1055603323@qq.com',
    name: '超级管理员',
    role: 'super_admin'
  };

  try {
    // 初始化数据库
    console.log('📦 初始化数据库连接...');
    await databaseService.initializeDatabase();
    console.log('✓ 数据库连接成功\n');

    const pool = databaseService.getPool();

    // 检查是否已存在
    console.log('🔍 检查管理员是否已存在...');
    const existing = await pool.query(
      'SELECT id, username, email FROM admins WHERE username = $1 OR email = $2',
      [superAdmin.username, superAdmin.email]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  管理员已存在:');
      existing.rows.forEach((row: any) => {
        console.log(`   - ID: ${row.id}`);
        console.log(`     用户名: ${row.username}`);
        console.log(`     邮箱: ${row.email}\n`);
      });
      
      console.log('💡 如需重置密码，请手动执行 SQL:\n');
      console.log(`UPDATE admins SET password = '${superAdmin.password}' WHERE username = '${superAdmin.username}';\n`);
      return;
    }

    // 创建超级管理员
    console.log('✨ 创建超级管理员...');
    const id = uuidv4();
    
    await pool.query(
      `INSERT INTO admins (id, username, password, email, name, role, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        superAdmin.username,
        superAdmin.password,
        superAdmin.email,
        superAdmin.name,
        superAdmin.role
      ]
    );

    console.log('\n✅ 超级管理员创建成功！\n');
    console.log('📋 登录信息:');
    console.log(`   用户名/邮箱: ${superAdmin.username}`);
    console.log(`   密码: ${superAdmin.password}`);
    console.log(`   角色: ${superAdmin.role}`);
    console.log(`   ID: ${id}\n`);

    console.log('🌐 访问 Admin 后台:');
    console.log('   http://localhost:3000/admin/login\n');

    console.log('⚠️  安全提示:');
    console.log('   - 请立即修改默认密码');
    console.log('   - 不要将密码分享给他人');
    console.log('   - 建议启用双因素认证\n');

  } catch (error) {
    console.error('\n❌ 创建失败:', error);
    process.exit(1);
  } finally {
    await databaseService.close();
    console.log('👋 数据库连接已关闭\n');
  }
}

createSuperAdmin();
