import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { validateEnv } from './utils/env.js';
import handler from './api/analyze.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

dotenv.config();

// 启动时验证环境变量
validateEnv(['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'NODE_ENV']);

const app = express();

// 配置 CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['POST', 'OPTIONS']
}));

// 配置 JSON 解析器，增加限制
app.use(express.json({
  limit: '20mb'
}));

// 路由处理
app.post('/api/analyze', async (req, res) => {
  try {
    console.log('Processing request...');
    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
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