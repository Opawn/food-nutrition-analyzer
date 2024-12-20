import { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const clientConfig = {
  credential: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },
  region: "ap-guangzhou",
  profile: {
    httpProfile: {
      endpoint: "hunyuan.tencentcloudapi.com",
    },
  },
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: '只支持POST请求',
      method: req.method,
      allowedMethods: ['POST']
    });
  }

  try {
    // 检查环境变量
    if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
      throw new Error("缺少必要的环境变量");
    }

    // 检查请求体
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: "请求格式不正确" });
    }

    // 处理上传的图片
    const file = req.body?.file;
    if (!file) {
      return res.status(400).json({ error: "未找到上传的文件" });
    }

    let imageBuffer: Buffer;
    try {
      // 尝试解析 base64 数据
      if (typeof file === 'string' && file.includes('base64')) {
        const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else if (Buffer.isBuffer(file)) {
        imageBuffer = file;
      } else if (typeof file === 'string') {
        imageBuffer = Buffer.from(file, 'binary');
      } else {
        throw new Error('不支持的文件格式');
      }
    } catch (error) {
      console.error('处理图片数据时出错:', error);
      return res.status(400).json({ error: '图片数据格式不正确' });
    }

    // 检查文件大小
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (imageBuffer.length > MAX_SIZE) {
      return res.status(400).json({ error: "图片大小不能超过20MB" });
    }

    // 使用sharp处理图片
    const processedImage = await sharp(imageBuffer)
      .resize(4096, 4096, { fit: 'inside' })
      .jpeg({ quality: 100 })
      .toBuffer();

    // 转换为base64
    const base64Image = processedImage.toString('base64');

    try {
      // 导入SDK
      const tencentcloud = require('tencentcloud-sdk-nodejs');
      const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;

      // 创建客户端实例
      const client = new HunyuanClient(clientConfig);

      // 构造请求参数
      const params = {
        Model: "hunyuan-turbo-vision",
        Messages: [{
          Role: "user",
          Contents: [
            {
              Type: "text",
              Text: `你是一位专业的食物营养分析师。请先判断图片是否为食物图片：

1. 如果不是食物图片，请直接返回：
{
    "isFood": false,
    "message": "这不是一张食物图片，请上传食物的照片"
}

2. 如果是食物图片，请详细分析并返回以下格式的JSON：
{
    "isFood": true,
    "foodType": "具体食物名称",
    "ingredients": ["主料1", "主料2"],
    "calories": 数字,
    "nutrition": {
        "protein": 数字,
        "carbs": 数字,
        "fat": 数字
    },
    "suggestions": ["建议1", "建议2"]
}

注意：
1. 必须完全按照上述格式返回
2. foodType必须是具体的食物名称
3. calories必须是整数（单位：千卡）
4. nutrition中的值必须是小数（单位：克）
5. 建议应该包含营养价值和用建议
6. 不要返回任何其他字段或说明文字`
            },
            {
              Type: "image_url",
              ImageUrl: {
                Url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }],
        Temperature: 0.1,
        TopP: 0.1
      };

      // 调用API
      const response = await client.ChatCompletions(params);
      
      // 处理响应
      if (!response || !response.Choices || !response.Choices[0] || !response.Choices[0].Message || !response.Choices[0].Message.Content) {
        throw new Error("API 返回格式不正确");
      }
      
      let responseText = response.Choices[0].Message.Content;

      // 清理响应文本，确保是有效的JSON
      responseText = responseText.trim();
      if (!responseText.startsWith('{')) {
        const jsonMatch = responseText.match(/({[\s\S]*})/);
        if (!jsonMatch) {
          throw new Error("API返回的不是有效的JSON格式");
        }
        responseText = jsonMatch[1];
      }

      // 解析JSON
      const result = JSON.parse(responseText);

      // 检查是否是食物图片
      if (!result.isFood) {
        return res.status(400).json(result);
      }

      // 验证数据类型
      if (typeof result.foodType !== 'string') {
        throw new Error("foodType必须是字符串");
      }

      if (!Array.isArray(result.ingredients)) {
        throw new Error("ingredients必须是数组");
      }

      // 转换calories为整数
      try {
        result.calories = parseInt(String(result.calories).replace('千卡', '').trim()) || 0;
      } catch {
        result.calories = 0;
      }

      // 验证nutrition对象
      if (typeof result.nutrition !== 'object' || result.nutrition === null) {
        throw new Error("nutrition必须是对象");
      }

      // 转换营养成分为浮点数
      ['protein', 'carbs', 'fat'].forEach(key => {
        try {
          const value = String(result.nutrition[key] || '0').replace('g', '').trim();
          result.nutrition[key] = parseFloat(value) || 0.0;
        } catch {
          result.nutrition[key] = 0.0;
        }
      });

      if (!Array.isArray(result.suggestions)) {
        throw new Error("suggestions必须是数组");
      }

      return res.status(200).json(result);

    } catch (error) {
      console.error('处理请求时出错:', error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : '服务器内部错误',
        detail: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }

  } catch (error) {
    console.error('处理请求时出错:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : '服务器内部错误',
      detail: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
} 