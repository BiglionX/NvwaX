import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';

export class UserController {
  // 获取当前用户信息
  async getProfile(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const user = await userService.getUserById(userId as string);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  // 更新用户信息
  async updateProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { name, avatar, bio } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const user = await userService.updateUser(userId as string, { name, avatar, bio });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }

  // 获取用户统计数据
  async getStats(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const stats = await userService.getUserStats(userId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  }
}

export const userController = new UserController();
