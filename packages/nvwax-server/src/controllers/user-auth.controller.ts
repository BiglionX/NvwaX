import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';

export class UserAuthController {
  // 用户注册
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      // 验证输入
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // 验证密码长度
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const result = await userService.registerUser(email, password, name);

      res.status(201).json({
        message: 'Registration successful',
        data: result
      });
    } catch (error: any) {
      console.error('Error in user registration:', error);
      
      if (error.message === 'Email already registered') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  // 用户登录
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await userService.login(email, password);

      if (!result) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      res.json({
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Error in user login:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // ProClaw 跨服务预授权登录
  async proclawCrossAuth(req: Request, res: Response) {
    try {
      const { proclaw_token, proclaw_email } = req.body;

      if (!proclaw_token || !proclaw_email) {
        return res.status(400).json({ error: 'proclaw_token and proclaw_email are required' });
      }

      const result = await userService.crossAuthLogin(proclaw_token, decodeURIComponent(proclaw_email));

      if (!result) {
        return res.status(401).json({ error: 'Invalid or expired cross-auth token' });
      }

      res.json({
        message: 'Cross-auth login successful',
        data: result
      });
    } catch (error) {
      console.error('Error in ProClaw cross-auth:', error);
      res.status(500).json({ error: 'Cross-auth failed' });
    }
  }

  // 获取当前用户信息（需要认证）
  async getProfile(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token is required' });
      }

      const token = authHeader.slice(7);
      const decoded = userService.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = await userService.getUserById(decoded.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }
}

export const userAuthController = new UserAuthController();
