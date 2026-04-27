import { adminService } from './src/services/admin.service.js';
import { databaseService } from './src/services/database.service.js';

async function initAdmin() {
  console.log('Initializing database...');
  await databaseService.initializeDatabase();
  
  console.log('Creating default admin account...');

  try {
    // 创建默认超级管理员
    const admin = await adminService.createAdmin(
      'admin',
      'admin123',
      'admin@nvwax.com',
      '系统管理员',
      'superadmin'
    );

    console.log('✓ Default admin created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@nvwax.com');
    console.log('\n⚠️  Please change the default password after first login!');
  } catch (error: any) {
    if (error.message?.includes('unique')) {
      console.log('Default admin already exists.');
    } else {
      console.error('Error creating default admin:', error);
    }
  } finally {
    await databaseService.close();
  }
}

initAdmin().catch(console.error);
