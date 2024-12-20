import { useState } from 'react'
import axios, { AxiosError } from 'axios'
import Header from './components/Header'
import UploadSection from './components/UploadSection'
import AnalysisResult from './components/AnalysisResult'
import Footer from './components/Footer'

// 从 AnalysisResult 组件导入类型
import type { AnalysisData } from './components/AnalysisResult'

function App() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisData(null);

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_FILE_SIZE) {
      setError('图片大小不能超过20MB');
      setIsAnalyzing(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // 添加重试逻辑
    const maxRetries = 2;
    let retryCount = 0;

    const makeRequest = async (): Promise<any> => {
      try {
        const apiUrl = '/api/analyze'; // 直接使用相对路径
        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000,
        });
        return response;
      } catch (error) {
        if (retryCount < maxRetries && error instanceof AxiosError && 
            (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')) {
          retryCount++;
          console.log(`重试请求 ${retryCount}/${maxRetries}`);
          return makeRequest();
        }
        throw error;
      }
    };

    try {
      const response = await makeRequest();

      if (response.data && typeof response.data === 'object') {
        // 检查是否是非食物图片的响应
        if (response.data.isFood === false) {
          setError(response.data.message || '请上传食物图片');
          return;
        }

        // 验证数据格式
        const { isFood, foodType, ingredients, calories, nutrition, suggestions } = response.data;
        
        if (!isFood || !foodType || !Array.isArray(ingredients) || 
            typeof calories !== 'number' || 
            !nutrition || typeof nutrition !== 'object' || 
            !Array.isArray(suggestions)) {
          throw new Error('服务器返回的数据格式不正确');
        }

        setAnalysisData(response.data);
      } else {
        throw new Error('服务器返回的数据格式不正确');
      }
    } catch (err) {
      if (err instanceof AxiosError) {
        // 处理预期的错误情况
        if (err.response?.status === 400 && err.response.data?.isFood === false) {
          // 这是预期的非食物图片响应，只设置错误消息
          setError(err.response.data.message || '请上传食物图片');
        } else {
          // 处理其他错误情况
          console.error('Error analyzing image:', err);
          if (err.code === 'ECONNABORTED') {
            setError('请求超时，请尝试使用更小的图片或稍后重试');
          } else if (err.code === 'ERR_NETWORK') {
            setError('网络连接错误，请确保后端服务器正在运行');
          } else if (err.response?.status === 404) {
            setError('API 服务不可用，请稍后重试');
          } else if (err.response) {
            const errorMessage = err.response.data?.error || err.response.data?.message || '请求失败，请重试';
            setError(typeof errorMessage === 'string' ? errorMessage : '请求失败，请重试');
          } else if (err.request) {
            setError('无法连接到服务器，请检查网络连接');
          } else {
            setError('请求发送失败，请重试');
          }
        }
      } else if (err instanceof Error) {
        console.error('Error analyzing image:', err);
        setError(err.message);
      } else {
        console.error('Error analyzing image:', err);
        setError(typeof err === 'string' ? err : '分析图片时出错，请重试');
      }
      setAnalysisData(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setAnalysisData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="container py-8 flex-grow">
        <UploadSection onUpload={handleImageUpload} isAnalyzing={isAnalyzing} onClear={handleClear} />
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {analysisData && <AnalysisResult data={analysisData} />}
      </main>
      <Footer />
    </div>
  )
}

export default App
