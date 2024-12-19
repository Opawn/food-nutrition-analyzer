const Footer = () => {
  return (
    <footer className="bg-white border-t">
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">关于我们</h3>
            <p className="text-gray-600">
              我们致力于为用户提供专业的食物营养分析服务，帮助您更好地了解日常饮食的营养价值。
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">联系方式</h3>
            <ul className="space-y-2 text-gray-600">
              <li>邮箱：chengbuza@126.com</li>
              <li>地址：倒悬山</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">快速链接</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-green-500">
                  使用指南
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-green-500">
                  隐私政策
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-green-500">
                  服务条款
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-gray-600">
          <p>© 2024 食物营养分析. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer 