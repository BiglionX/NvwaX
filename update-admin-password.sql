-- 更新管理员密码
UPDATE admins 
SET password = '$2b$10$SQGKabURWXpamNuGqf.RnOzm8nupXwzCYHrpl05j0N5WxAKv0DIGa'
WHERE email = '1055603323@qq.com';

-- 验证更新
SELECT id, username, email, name, role FROM admins WHERE email = '1055603323@qq.com';
