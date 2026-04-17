import type { FC } from 'react';
import type { ImageFile } from '../../types';

interface ImagePreviewModalProps {
  isOpen: boolean;
  images: ImageFile[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const ImagePreviewModal: FC<ImagePreviewModalProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}) => {
  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-60">
      <div className="relative bg-white rounded-lg overflow-hidden shadow-lg max-w-5xl w-full mx-auto">
        {/* Close Button */}
        <button
          type="button"
          className="absolute top-2 right-2 text-white bg-primary bg-opacity-50 rounded-full p-1 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-white z-10"
          onClick={onClose}
          aria-label="Close Image Preview"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Image Display */}
        <img
          src={images[currentIndex]?.id}
          alt={`Preview ${currentIndex + 1}`}
          width={1600}
          height={1200}
          className="w-full h-auto object-contain max-h-[80vh]"
        />

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              type="button"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white bg-primary bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-white"
              onClick={onPrev}
              aria-label="Previous Image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>

            {/* Next Button */}
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white bg-primary bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-white"
              onClick={onNext}
              aria-label="Next Image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
