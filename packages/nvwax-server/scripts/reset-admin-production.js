// 用于 Railway 环境的管理员密码重置脚本
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetAdminPassword() {
  try {
    console.log('🔧 重置管理员密码...\n');
    
    const username = '1055603323@qq.com';
    const email = '1055603323@qq.com';
    const password = 'admin123456';
    const name = '管理员';
    const role = 'superadmin';
    
    // 检查管理员是否存在
    console.log('1️⃣ 检查管理员账号...');
    const checkResult = await pool.query(
      'SELECT id, username, email, password FROM admins WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(' admins 表中未找到该用户');
      console.log('✨ 创建新管理员账号...\n');
      
      const id = uuidv4();
      
      await pool.query(
        `INSERT INTO admins (id, username, password, email, name, role, created_at, updated_at, last_login) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NULL)`,
        [id, username, password, email, name, role]
      );
      
      console.log('✅ 管理员账号创建成功！');
      console.log(`   ID: ${id}`);
      console.log(`   Username: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      
    } else {
      const admin = checkResult.rows[0];
      console.log('✅ 找到现有管理员账号');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   当前密码: ${admin.password}`);
      console.log(`   密码长度: ${admin.password?.length || 0}\n`);
      
      // 更新密码
      console.log('🔄 更新密码...');
      await pool.query(
        'UPDATE admins SET password = $1, updated_at = NOW() WHERE id = $2',
        [password, admin.id]
      );
      
      console.log('✅ 密码更新成功！');
      console.log(`   新密码: ${password}\n`);
    }
    
    console.log('📋 登录信息:');
    console.log(`   登录页面: https://nvwax.proclaw.cc/admin/login`);
    console.log(`   用户名: ${username}`);
    console.log(`   密码: ${password}\n`);
    
    console.log('⚠️  安全提示:');
    console.log('   - 请立即修改此默认密码');
    console.log('   - 不要将密码分享给他人\n');
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();
