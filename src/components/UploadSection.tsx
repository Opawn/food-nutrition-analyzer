import { useRef, useState } from 'react'
import { FaCloudUploadAlt } from 'react-icons/fa'

interface UploadSectionProps {
  onUpload: (file: File) => void;
  isAnalyzing: boolean;
  onClear: () => void;
}

const UploadSection = ({ onUpload, isAnalyzing, onClear }: UploadSectionProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClear = () => {
    setPreviewUrl(null);
    onClear();
  };

  return (
    <div className="card mb-8">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-96 mx-auto rounded-lg"
            />
            {isAnalyzing ? (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4"></div>
                  <p>正在分析...</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-white bg-opacity-75 hover:bg-opacity-100 text-gray-600 hover:text-gray-800 rounded-full p-2 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <FaCloudUploadAlt className="mx-auto text-5xl text-gray-400" />
            <div>
              <p className="text-xl text-gray-600">
                拖拽食物图片到这里，或者
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-green-500 hover:text-green-600 font-medium mx-1"
                >
                  点击上传
                </button>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                文件大小不超过20MB
              </p>
            </div>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}

export default UploadSection 