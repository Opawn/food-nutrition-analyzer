import { FaUtensils, FaFireAlt, FaListUl, FaLightbulb } from 'react-icons/fa'

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

interface AnalysisResultProps {
  data: AnalysisData;
}

const AnalysisResult = ({ data }: AnalysisResultProps) => {
  const nutrition = data?.nutrition || { protein: 0, carbs: 0, fat: 0 };
  const ingredients = data?.ingredients || [];
  const suggestions = data?.suggestions || [];

  return (
    <div className="space-y-6">
      {/* 食物类型 */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <FaUtensils className="text-2xl text-green-500" />
          <h2 className="text-xl font-semibold text-gray-800">食物类型</h2>
        </div>
        <p className="text-gray-600">{data?.foodType || '未知食物'}</p>
      </div>

      {/* 营养成分 */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <FaFireAlt className="text-2xl text-green-500" />
          <h2 className="text-xl font-semibold text-gray-800">营养成分</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600 mb-2">热量</p>
            <p className="text-2xl font-bold text-green-500">{data?.calories || 0}</p>
            <p className="text-sm text-gray-500">千卡</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600 mb-2">蛋白质</p>
            <p className="text-2xl font-bold text-green-500">{nutrition.protein}g</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600 mb-2">碳水化合物</p>
            <p className="text-2xl font-bold text-green-500">{nutrition.carbs}g</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-600 mb-2">脂肪</p>
            <p className="text-2xl font-bold text-green-500">{nutrition.fat}g</p>
          </div>
        </div>
      </div>

      {/* 食材列表 */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <FaListUl className="text-2xl text-green-500" />
          <h2 className="text-xl font-semibold text-gray-800">食材列表</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ingredients.map((ingredient, index) => (
            <div
              key={index}
              className="bg-gray-50 px-4 py-2 rounded-lg text-gray-600"
            >
              {ingredient}
            </div>
          ))}
        </div>
      </div>

      {/* 建议 */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <FaLightbulb className="text-2xl text-green-500" />
          <h2 className="text-xl font-semibold text-gray-800">营养建议</h2>
        </div>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="flex items-start space-x-2 text-gray-600"
            >
              <span className="text-green-500 font-bold">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default AnalysisResult 