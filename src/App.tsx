import { useState } from 'react'
import axios, { AxiosError } from 'axios'
import Header from './components/Header'
import UploadSection from './components/UploadSection'
import AnalysisResult from './components/AnalysisResult'
import Footer from './components/Footer'

// 从 AnalysisResult 组件导入类型
import type { AnalysisData } from './components/AnalysisResult'

// 获取错误消息的辅助函数
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return 'API 服务不可用，请稍后重试';
    }
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') {
        return data;
      }
      if (typeof data === 'object' && data !== null) {
        return data.message || data.error || '请求失败，请重试';
      }
    }
    if (error.code === 'ECONNABORTED') {
      return '请求超时，请尝试使用更小的图片或稍后重试';
    }
    if (error.code === 'ERR_NETWORK') {
      return '网络连接错误，请确保网络连接正常';
    }
    return error.message || '请求失败，请重试';
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '发生未知错误，请重试';
};

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

    try {
      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000,
      });

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
      console.error('Error analyzing image:', err);
      setError(getErrorMessage(err));
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
