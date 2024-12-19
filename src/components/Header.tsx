import { FaLeaf } from 'react-icons/fa'

const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaLeaf className="text-green-500 text-2xl" />
            <h1 className="text-xl font-bold text-gray-800">食物营养分析</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-green-500">首页</a>
            <a href="#" className="text-gray-600 hover:text-green-500">营养知识</a>
            <a href="#" className="text-gray-600 hover:text-green-500">关于我们</a>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header 