import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import { validateEnv } from './utils/env.js';
import handler from './api/analyze.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

dotenv.config();

// 启动时验证环境变量
validateEnv(['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'NODE_ENV']);

const app = express();
const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['POST']
}));

// 路由处理
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    console.log('Processing request...');
    
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    // 修改接口定义
    interface ModifiedRequest extends Pick<VercelRequest, 'body' | 'method' | 'headers' | 'query' | 'cookies'> {
      file?: Express.Multer.File;
    }

    const modifiedReq: ModifiedRequest = {
      body: req.file.buffer,
      method: 'POST',
      headers: req.headers,
      query: req.query as { [key: string]: string | string[] },
      cookies: req.cookies || {},
    };

    await handler(modifiedReq as unknown as VercelRequest, res as unknown as VercelResponse);
  } catch (error: Error | unknown) {
    console.error('Error in /api/analyze:', error);
    const err = error as Error;
    res.status(500).json({
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
  console.log('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    hasSecretId: !!process.env.TENCENT_SECRET_ID,
    hasSecretKey: !!process.env.TENCENT_SECRET_KEY
  });
}); 