import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const upload = multer();

app.use(cors());

// 路由处理
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    console.log('Processing request...');
    
    if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
      throw new Error('Missing required environment variables');
    }

    if (!req.file) {
      throw new Error('No file uploaded');
    }

    console.log('File received:', {
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // 动态导入handler
    const { default: handler } = await import('./api/analyze.js');
    
    // 修改请求格式以匹配handler期望的格式
    const modifiedReq = {
      ...req,
      body: req.file.buffer,
      method: 'POST'
    };

    await handler(modifiedReq, res);
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const port = 3001;

// 添加错误处理
const server = app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    hasSecretId: !!process.env.TENCENT_SECRET_ID,
    hasSecretKey: !!process.env.TENCENT_SECRET_KEY
  });
}).on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 