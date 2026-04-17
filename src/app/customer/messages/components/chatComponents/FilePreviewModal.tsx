import type { FC } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';
import type { FileType } from '../../types';

interface FilePreviewModalProps {
  file: FileType | null;
  onClose: () => void;
}

/**
 * FilePreviewModal Component
 * Modal for previewing files (images and PDFs)
 */
const FilePreviewModal: FC<FilePreviewModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg overflow-hidden ${
          isPdf ? 'w-[90vw] h-[90vh] max-w-5xl' : 'max-w-2xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 truncate max-w-md">
            {file.name}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={file.url}
              download={file.name}
              className="text-gray-500 hover:text-gray-700 p-1"
              title="Download"
            >
              <FiDownload size={20} />
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
              aria-label="Close preview"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={isPdf ? 'h-[calc(90vh-60px)]' : 'p-4'}>
          {isImage ? (
            <img
              src={file.url || '/placeholder.svg'}
              alt={file.name}
              className="max-w-full h-auto mx-auto"
            />
          ) : isPdf ? (
            <iframe
              src={file.url}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">Cannot preview this file type</p>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline"
              >
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
