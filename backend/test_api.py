import requests
import os
import json

def test_analyze_endpoint():
    # API端点URL
    url = "http://localhost:8888/api/analyze"
    
    # 测试图片路径
    test_image_path = os.path.join("test_images", "test_food.jpg")
    
    if not os.path.exists(test_image_path):
        print(f"错误: 测试图片不存在于 {test_image_path}")
        return
    
    print(f"测试图片路径: {test_image_path}")
    print(f"图片大小: {os.path.getsize(test_image_path) / (1024*1024):.2f}MB")
    
    # 准备文件
    files = {
        'file': ('test_food.jpg', open(test_image_path, 'rb'), 'image/jpeg')
    }
    
    try:
        # 发送POST请求
        print("\n发送请求到API...")
        response = requests.post(url, files=files)
        
        # 检查响应状态码
        print(f"响应状态码: {response.status_code}")
        print(f"响应头: {json.dumps(dict(response.headers), indent=2)}")
        
        # 如果请求成功，打印响应内容
        if response.status_code == 200:
            print("\n请求成功！")
            print("响应内容:")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print("\n请求失败！")
            print("错误信息:", response.text)
            print("完整响应:", response.content.decode('utf-8', errors='ignore'))
            
    except Exception as e:
        print(f"发生错误: {str(e)}")
        import traceback
        print("错误详情:")
        print(traceback.format_exc())
    finally:
        # 关闭文件
        files['file'][1].close()

if __name__ == "__main__":
    test_analyze_endpoint() 