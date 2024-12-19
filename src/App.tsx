import { useState } from 'react'
import axios, { AxiosError } from 'axios'
import Header from './components/Header'
import UploadSection from './components/UploadSection'
import AnalysisResult from './components/AnalysisResult'
import Footer from './components/Footer'

interface AnalysisData {
  foodType: string;
  ingredients: string[];
  calories: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
  };
  suggestions: string[];
}

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
        const response = await axios.post('http://localhost:8888/api/analyze', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
          timeout: 120000, // 增加到120秒
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
        const { foodType, ingredients, calories, nutrition, suggestions } = response.data;
        
        if (!foodType || !Array.isArray(ingredients) || 
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
      if (err instanceof AxiosError) {
        if (err.code === 'ECONNABORTED') {
          setError('请求超时，请尝试使用更小的图片或稍后重试');
        } else if (err.code === 'ERR_NETWORK') {
          setError('网络连接错误，请确保后端服务器正在运行');
        } else if (err.response) {
          setError(err.response.data?.detail || '请求失败，请重试');
        } else if (err.request) {
          setError('无法连接到服务器，请检查网络连接');
        } else {
          setError('请求发送失败，请重试');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('分析图片时出错，请重试');
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
