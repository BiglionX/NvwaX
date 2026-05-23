-- 创建管理员账号
INSERT INTO admins (id, username, password, email, name, role) 
VALUES ('admin-001', '1055603323@qq.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '1055603323@qq.com', 'Admin', 'super_admin')
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 验证插入
SELECT id, username, email, name, role FROM admins WHERE email = '1055603323@qq.com';
