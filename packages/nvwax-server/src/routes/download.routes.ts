import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';

const router = Router();

/**
 * 下载打包文件 - team-skills 子路径
 * GET /api/downloads/team-skills/:filename
 */
router.get('/team-skills/:filename', async (req: Request, res: Response) => {
  try {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    
    // 安全检查：防止路径遍历攻击
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // 构建文件路径 - 从 exports/team-skills 目录读取
    const downloadsDir = path.join(process.cwd(), 'exports', 'team-skills');
    const filePath = path.join(downloadsDir, filename);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // 设置响应头 - 处理中文文件名
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', (await fs.stat(filePath)).size.toString());

    // 使用流式传输发送文件
    const fileStream = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc((await fs.stat(filePath)).size);
    await fileStream.read(buffer, 0, buffer.length, 0);
    await fileStream.close();
    res.send(buffer);

  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to download file', details: errorMessage });
  }
});

/**
 * 下载打包文件
 * GET /api/downloads/:filename
 * GET /api/downloads/team-skills/:filename
 */
router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    
    // 安全检查：防止路径遍历攻击
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // 构建文件路径 - 从 exports/team-skills 目录读取
    const downloadsDir = path.join(process.cwd(), 'exports', 'team-skills');
    const filePath = path.join(downloadsDir, filename);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // 设置响应头 - 处理中文文件名
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', (await fs.stat(filePath)).size.toString());

    // 使用流式传输发送文件
    const fileStream = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc((await fs.stat(filePath)).size);
    await fileStream.read(buffer, 0, buffer.length, 0);
    await fileStream.close();
    res.send(buffer);

  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to download file', details: errorMessage });
  }
});

export default router;
