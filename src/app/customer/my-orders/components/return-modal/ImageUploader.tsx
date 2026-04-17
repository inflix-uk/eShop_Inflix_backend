import type { FC } from 'react';
import { useRef } from 'react';
import type { ImageFile } from '../../types';
import { MAX_RETURN_IMAGES } from '../../constants';

interface ImageUploaderProps {
  images: ImageFile[];
  onUpload: (files: FileList) => void;
  onRemove: (id: string) => void;
  onImageClick: (index: number) => void;
}

const ImageUploader: FC<ImageUploaderProps> = ({
  images,
  onUpload,
  onRemove,
  onImageClick,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(e.target.files);
    }
    // Reset input to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  return (
    <div className="mb-4">
      <label className="block md:mb-2 text-gray-800 font-medium">
        Add Photos: <span className="text-red-500">*</span>
      </label>
      {images.length === 0 && (
        <p className="text-sm text-red-500">(At least one image is required)</p>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        multiple
        capture="environment"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />

      {/* Image Previews and Add Button */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4 mb-6">
        {images.map((image, index) => (
          <div key={image.id} className="relative">
            <img
              src={image.id}
              alt="uploaded preview"
              width={112}
              height={112}
              className="w-28 h-28 object-cover rounded-md border cursor-pointer"
              onClick={() => onImageClick(index)}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(image.id);
              }}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Remove Image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}

        {/* Add Image Button */}
        {images.length < MAX_RETURN_IMAGES && (
          <div className="relative">
            <button
              type="button"
              onClick={triggerFileInput}
              className="bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 w-28 h-28 flex items-center justify-center"
              aria-label="Add Images"
            >
              <div className="flex items-center justify-center rounded-full w-8 h-8 bg-green-500 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Camera Button */}
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={triggerCameraInput}
          className="bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 w-28 h-28 flex items-center justify-center"
          aria-label="Take Photo"
        >
          <div className="flex flex-col items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-green-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
            <span className="text-xs mt-1">Camera</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
