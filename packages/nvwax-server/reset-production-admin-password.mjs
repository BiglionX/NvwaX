import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function resetAdminPassword() {
  try {
    console.log('🔧 重置管理员密码...\n');
    
    const email = '1055603323@qq.com';
    const newPassword = 'admin123456';
    
    // 检查用户是否存在
    const checkResult = await pool.query(
      'SELECT id, username, email FROM admins WHERE username = $1 OR email = $1',
      [email]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ admins 表中未找到该用户');
      console.log('💡 需要先创建管理员账号\n');
      
      // 创建新管理员
      console.log('✨ 创建新管理员账号...');
      const { v4: uuidv4 } = await import('uuid');
      const id = uuidv4();
      
      await pool.query(
        'INSERT INTO admins (id, username, password, email, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())',
        [id, email, newPassword, email, '管理员', 'superadmin']
      );
      
      console.log('✅ 管理员账号创建成功！\n');
    } else {
      // 更新密码
      console.log('✅ 找到现有管理员账号');
      console.log(`   ID: ${checkResult.rows[0].id}`);
      console.log(`   Username: ${checkResult.rows[0].username}`);
      console.log(`   Email: ${checkResult.rows[0].email}\n`);
      
      console.log('🔄 更新密码...');
      await pool.query(
        'UPDATE admins SET password = $1, updated_at = NOW() WHERE username = $2 OR email = $2',
        [newPassword, email]
      );
      
      console.log('✅ 密码更新成功！\n');
    }
    
    console.log('📋 登录信息:');
    console.log(`   邮箱/用户名: ${email}`);
    console.log(`   密码: ${newPassword}`);
    console.log(`   登录页面: https://nvwax.proclaw.cc/admin/login\n`);
    
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
