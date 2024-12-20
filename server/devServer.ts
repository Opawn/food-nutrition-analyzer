import express from 'express';
import multer from 'multer';
import handler from '../api/analyze';

const router = express.Router();
const upload = multer();

router.post('/analyze', upload.single('file'), async (req: express.Request, res: express.Response) => {
  // 转换请求格式以匹配Vercel的类型
  const vercelReq = {
    ...req,
    body: req.file?.buffer,
    query: {},
    cookies: {}
  } as any;  // 使用类型断言

  await handler(vercelReq, res as any);
});

export default router; 