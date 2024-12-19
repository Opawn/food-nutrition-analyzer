# 食物营养分析网站

这是一个使用AI技术分析食物图片的网站，可以识别食物类型、营养成分，并提供专业的营养建议。

## 功能特点

- 上传食物图片
- AI自动分析食物类型
- 计算营养成分和卡路里
- 提供专业的营养建议
- 美观的用户界面

## 技术栈

前端：
- React
- TypeScript
- Tailwind CSS
- Axios

后端：
- FastAPI
- Python
- OpenAI API
- Pillow

## 安装说明

1. 克隆项目
```bash
git clone [项目地址]
cd [项目目录]
```

2. 安装前端依赖
```bash
npm install
```

3. 安装后端依赖
```bash
cd backend
pip install -r requirements.txt
```

4. 配置环境变量
- 复制 `backend/.env.example` 到 `backend/.env`
- 在 `.env` 文件中填入你的 OpenAI API 密钥

## 运行项目

1. 启动后端服务
```bash
cd backend
python main.py
```

2. 启动前端开发服务器
```bash
npm run dev
```

3. 访问网站
打开浏览器访问 http://localhost:5173

## 注意事项

- 需要有效的腾讯云混元大模型API密钥
- 确保后端服务器在8888端口运行
- 上传的图片必须清晰可见
- 建议使用JPEG或PNG格式的图片
- 单个图片大小不超过20MB
