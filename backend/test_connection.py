import os
import io
import time
import json
import base64
import requests
import urllib3
from PIL import Image
from dotenv import load_dotenv
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.hunyuan.v20230901 import hunyuan_client, models

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

def test_api():
    """测试API调用"""
    print("\n测试API调用...")
    
    # 加载环境变量
    load_dotenv()
    
    # 检查必要的环境变量
    if not os.getenv('TENCENT_SECRET_ID') or not os.getenv('TENCENT_SECRET_KEY'):
        print("错误: 未找到必要的环境变量 TENCENT_SECRET_ID 或 TENCENT_SECRET_KEY")
        return False
    
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # 读取本地测试图片
            test_image_path = os.path.join("test_images", "test_food.jpg")
            if not os.path.exists(test_image_path):
                print(f"错误: 测试图片不存在于 {test_image_path}")
                return False
            
            # 获取原始图片大小
            original_size = os.path.getsize(test_image_path) / (1024 * 1024)  # MB
            print(f"原始图片大小: {original_size:.2f}MB")
            
            # 读取并处理图片
            with Image.open(test_image_path) as img:
                # 转换为RGB模（如果是RGBA）
                if img.mode == 'RGBA':
                    img = img.convert('RGB')
                
                # 图片尺寸和质量的策略
                max_size = 1024  # 增加最大尺寸到1024像素
                quality = 95    # 默认使用较高质量
                
                # 如果原图太大，逐步调整压缩参数
                if original_size > 5:  # 如果大于5MB
                    max_size = 800
                    quality = 85
                elif original_size > 2:  # 如果大于2MB
                    max_size = 1024
                    quality = 90
                
                # 计算新的尺寸，保持宽高比
                if max(img.width, img.height) > max_size:
                    ratio = max_size / max(img.width, img.height)
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                
                # 保存到内存
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=quality)
                image_bytes = buffer.getvalue()
                compressed_size = len(image_bytes) / (1024 * 1024)  # MB
                print(f"处理后的图片大小: {compressed_size:.2f}MB")
                print(f"压缩比例: {(compressed_size/original_size*100):.1f}%")
                print(f"最终图片尺寸: {img.width}x{img.height}")
                print(f"使用的质量参数: {quality}")
                
                image_base64 = base64.b64encode(image_bytes).decode()
            
            print("\n开始调用API...")
            start_time = time.time()
            
            # 实例化一个认证对象
            cred = credential.Credential(os.getenv('TENCENT_SECRET_ID'), os.getenv('TENCENT_SECRET_KEY'))
            
            # 实例化一个http选项，可选的��没有特殊需求可以跳过
            httpProfile = HttpProfile()
            httpProfile.endpoint = "hunyuan.tencentcloudapi.com"
            
            # 实例化一个client选项，可选的，没有特殊需求可以跳过
            clientProfile = ClientProfile()
            clientProfile.httpProfile = httpProfile
            
            # 实例化要请求产品的client对象
            client = hunyuan_client.HunyuanClient(cred, "ap-guangzhou", clientProfile)
            
            # 构造消息
            message = models.Message()
            message.Role = "user"
            message.Contents = [
                {
                    "Type": "text",
                    "Text": "分析这张图片并告诉我：\n1. 图片中包含什么内容\n2. 物体的特征和细节\n3. 整体场景的布局和氛围"
                },
                {
                    "Type": "image_url",
                    "ImageUrl": {
                        "Url": f"data:image/jpeg;base64,{image_base64}"
                    }
                }
            ]
            
            # 设置请求参数
            params = {
                "Model": "hunyuan-turbo-vision",
                "Messages": [
                    {
                        "Role": message.Role,
                        "Contents": message.Contents
                    }
                ],
                "Temperature": 0.8,
                "TopP": 0.8,
                "Stream": False
            }
            
            # 发起请求
            resp = client.call("ChatCompletions", params)
            resp_json = json.loads(resp)
            
            # 检查响应
            if "Response" in resp_json and "Choices" in resp_json["Response"] and len(resp_json["Response"]["Choices"]) > 0:
                print("\n完整响应:", json.dumps(resp_json, indent=2, ensure_ascii=False))
                if "Message" in resp_json["Response"]["Choices"][0]:
                    print("\n模型回复:", resp_json["Response"]["Choices"][0]["Message"].get("Content", ""))
                else:
                    print("\n警告: 响应中没有找到消息内容")
                
                print(f"\n请求耗时: {time.time() - start_time:.2f}秒")
                return True
            else:
                print("\n警告: 响应格式不正确")
                print("完整响应:", json.dumps(resp_json, indent=2, ensure_ascii=False))
                return False
            
        except Exception as e:
            print(f"\n发生错误: {str(e)}")
            retry_count += 1
            if retry_count < max_retries:
                print(f"将在3秒后进行第{retry_count + 1}次重试...")
                time.sleep(3)
            else:
                print("已达到最大重试次数，测试失败")
                return False
    
    return False

def main():
    print("开始测试腾讯云混元大模型API连接...\n")
    
    # 运行API测试
    api_ok = test_api()
    
    # 输出结果
    print("\n测试结果总结:")
    print(f"API调用: {'✓' if api_ok else '✗'}")
    
    if api_ok:
        print("\n测试通过! API服务可以正常使用。")
    else:
        print("\n测试未通过，请检查上述错误信息。")

if __name__ == "__main__":
    main() 