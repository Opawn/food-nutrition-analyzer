from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import base64
import json
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.hunyuan.v20230901 import hunyuan_client, models
from PIL import Image
import io
import time
import logging
import sys
import traceback
import urllib3
import requests

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 禁用所有代理
os.environ['NO_PROXY'] = '*'
if 'HTTP_PROXY' in os.environ:
    del os.environ['HTTP_PROXY']
if 'HTTPS_PROXY' in os.environ:
    del os.environ['HTTPS_PROXY']
if 'http_proxy' in os.environ:
    del os.environ['http_proxy']
if 'https_proxy' in os.environ:
    del os.environ['https_proxy']

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

load_dotenv()

# 检查环境变量
if not os.getenv('TENCENT_SECRET_ID') or not os.getenv('TENCENT_SECRET_KEY'):
    logger.error("未找到必要的环境变量 TENCENT_SECRET_ID 或 TENCENT_SECRET_KEY")
    sys.exit(1)

app = FastAPI()

# 配置CORS - 确保这段代码在所有路由之前
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://你的vercel域名.vercel.app",  # 添加 Vercel 域名
        "https://你的自定义域名"  # 如果有自定义域名
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
async def analyze_food(file: UploadFile = File(...)):
    try:
        logger.info("开始处理上传的图片...")
        
        # 检查环境变量
        secret_id = os.getenv("TENCENT_SECRET_ID")
        secret_key = os.getenv("TENCENT_SECRET_KEY")
        logger.info(f"环境变量检查 - Secret ID存在: {bool(secret_id)}, Secret Key存在: {bool(secret_key)}")
        
        if not secret_id or not secret_key:
            raise ValueError("缺少必要的环境变量")
            
        # 检查文件大小
        contents = await file.read()
        file_size = len(contents)
        logger.info(f"上传的文件大小: {file_size / (1024*1024):.2f}MB")
        
        if file_size > 20 * 1024 * 1024:  # 20MB
            logger.warning("文件大小超过限制")
            raise HTTPException(status_code=400, detail="图片大小不能超过20MB")
            
        # 读取和处理图片
        logger.info("开始处理图片...")
        image = Image.open(io.BytesIO(contents))
        logger.info(f"原始图片尺寸: {image.size}")
        
        # 转换为RGB模式（如果是RGBA）
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # 只在图片超过4096像素时才进行缩放
        max_dimension = 4096  # 增加到4096像素，以保留更多细节
        if max(image.size) > max_dimension:
            ratio = max_dimension / max(image.size)
            new_size = tuple(int(dim * ratio) for dim in image.size)
            # 使用高质量的LANCZOS重采样
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"调整后的图片尺寸: {new_size}")
        
        # 使用最高质量保存JPEG
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG", quality=100, optimize=False)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        logger.info(f"处理后的图片大小: {len(buffered.getvalue()) / (1024*1024):.2f}MB")
        
        # 添加base64头
        img_base64 = f"data:image/jpeg;base64,{img_base64}"
        
        # 配置认证信息
        logger.info("配置API认证信息...")
        cred = credential.Credential(
            os.getenv("TENCENT_SECRET_ID"),
            os.getenv("TENCENT_SECRET_KEY")
        )
        
        # 配置API访问
        httpProfile = HttpProfile()
        httpProfile.endpoint = "hunyuan.tencentcloudapi.com"
        httpProfile.timeout = 240
        httpProfile.protocol = "https"
        httpProfile.verify = False  # 禁用SSL验证
        
        clientProfile = ClientProfile()
        clientProfile.httpProfile = httpProfile
        clientProfile.signMethod = "TC3-HMAC-SHA256"
        
        # 创建客户端
        client = hunyuan_client.HunyuanClient(cred, "ap-guangzhou", clientProfile)
        
        # 添加重试机制
        max_retries = 3
        retry_count = 0
        last_error = None
        
        while retry_count < max_retries:
            try:
                logger.info(f"开始第{retry_count + 1}次API调用...")
                
                # 构造请求参数
                params = {
                    "Model": "hunyuan-turbo-vision",
                    "Messages": [
                        {
                            "Role": "user",
                            "Contents": [
                                {
                                    "Type": "text",
                                    "Text": """分析这张食物图片并返回以下格式的JSON（不要添加任何其他内容）：

{
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
3. calories必须是整数
4. nutrition中的值必须是小数
5. 不要返回任何其他字段或说明文字"""
                                },
                                {
                                    "Type": "image_url",
                                    "ImageUrl": {
                                        "Url": img_base64
                                    }
                                }
                            ]
                        }
                    ],
                    "Temperature": 0.1,
                    "TopP": 0.1,
                    "Stream": False
                }
                
                logger.info("发送API请求...")
                resp = client.call("ChatCompletions", params)
                response = json.loads(resp)
                logger.info("收到API响应")
                
                break
                
            except TencentCloudSDKException as err:
                logger.error(f"API调用失败: {str(err)}")
                last_error = err
                retry_count += 1
                if retry_count < max_retries:
                    logger.info(f"等待5秒后进行第{retry_count + 1}次重试...")
                    time.sleep(5)
                else:
                    logger.error("已达到最大重试次数，放弃重试")
                    raise HTTPException(status_code=500, detail=f"API调用失败（已重试{max_retries}次）: {str(last_error)}")
                continue
        
        try:
            logger.info("开始处理API响应...")
            # 处理响应
            if "Response" in response and "Choices" in response["Response"] and len(response["Response"]["Choices"]) > 0:
                response_text = response["Response"]["Choices"][0]["Message"].get("Content", "")
                logger.info("成功提取响应内容")
            else:
                logger.error("响应格式不正确")
                raise ValueError("未能从API响应中提取到文本内容")
            
            logger.debug(f"API响应文本: {response_text}")
            
            # 清理响应文本，确保是有效的JSON
            response_text = response_text.strip()
            if not response_text.startswith('{'):
                logger.warning("响应文本不是标准JSON格式，尝试提取JSON部分")
                import re
                json_match = re.search(r'({[\s\S]*})', response_text)
                if not json_match:
                    logger.error("无法从响应中提取JSON")
                    raise ValueError("API返回的不是有效的JSON格式")
                response_text = json_match.group(1)
            
            # 解析JSON
            logger.info("解析响应JSON...")
            result = json.loads(response_text)
            
            # 验证和转换数据类型
            logger.info("验证数据类型...")
            if not isinstance(result.get('foodType'), str):
                raise ValueError("foodType必须是字符串")
                
            if not isinstance(result.get('ingredients'), list):
                raise ValueError("ingredients必须是数组")
                
            # 转换calories为整数
            try:
                result['calories'] = int(float(str(result['calories']).replace('千卡', '').strip()))
            except (ValueError, TypeError):
                logger.warning("calories转换失败，使用默认值0")
                result['calories'] = 0
                
            # 确保nutrition存在且格式正确
            if not isinstance(result.get('nutrition'), dict):
                raise ValueError("nutrition必须是对象")
                
            # 转换营养成分为浮点数
            nutrition = result['nutrition']
            for key in ['protein', 'carbs', 'fat']:
                try:
                    value = str(nutrition.get(key, '0')).replace('g', '').strip()
                    nutrition[key] = float(value)
                except (ValueError, TypeError):
                    logger.warning(f"{key}转换失败，使用默认值0.0")
                    nutrition[key] = 0.0
                    
            if not isinstance(result.get('suggestions'), list):
                raise ValueError("suggestions必须是数组")
            
            logger.info("数据处理完成")
            logger.debug(f"最终结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            return result
            
        except Exception as e:
            logger.error(f"处理响应时出错: {str(e)}")
            logger.error(f"响应文本: {response_text}")
            raise HTTPException(status_code=500, detail=f"处理响应失败: {str(e)}")
            
    except TencentCloudSDKException as err:
        logger.error(f"腾讯云API错误: {str(err)}")
        raise HTTPException(status_code=500, detail=f"API调用失败: {str(err)}")
    except Exception as e:
        error_msg = f"处理请求时出错: {str(e)}"
        stack_trace = traceback.format_exc()
        logger.error(error_msg)
        logger.error("错误详情:", exc_info=True)
        logger.error("完整错误堆栈:\n%s", stack_trace)
        raise HTTPException(
            status_code=500,
            detail=f"{error_msg}\n堆栈跟踪: {stack_trace}"
        )

if __name__ == "__main__":
    import uvicorn
    logger.info("启动服务器...")
    uvicorn.run(app, host="0.0.0.0", port=8888) 