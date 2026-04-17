import type { FC } from 'react';
import Image from 'next/image';
import type { FileType } from '../../types';
import { FiFile, FiFileText } from 'react-icons/fi';

function isBlobOrDataUrl(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}

interface FileAttachmentProps {
  files: FileType[];
  onPreview: (file: FileType) => void;
}

/**
 * FileAttachment Component
 * Displays file attachments in messages
 */
const FileAttachment: FC<FileAttachmentProps> = ({ files, onPreview }) => {
  if (!files || files.length === 0) return null;

  const isImage = (type: string) => type.startsWith('image/');
  const isPdf = (type: string) => type === 'application/pdf';

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file, index) => {
        if (isImage(file.type)) {
          const src = file.url || '/placeholder.svg';
          return (
            <div
              key={index}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onPreview(file)}
            >
              {isBlobOrDataUrl(src) ? (
                <img
                  src={src}
                  alt={file.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <Image
                  src={src}
                  alt={file.name}
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded"
                  unoptimized={
                    src.startsWith('http://localhost') ||
                    src.startsWith('http://127.0.0.1')
                  }
                />
              )}
            </div>
          );
        }

        if (isPdf(file.type)) {
          return (
            <div
              key={index}
              onClick={() => onPreview(file)}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors border border-red-200"
              title={file.name}
            >
              <FiFileText className="text-red-600" size={18} />
              <span className="text-sm text-gray-700 max-w-[120px] truncate">
                {file.name}
              </span>
            </div>
          );
        }

        // Other file types
        return (
          <div
            key={index}
            onClick={() => onPreview(file)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
            title={file.name}
          >
            <FiFile className="text-gray-600" size={18} />
            <span className="text-sm text-gray-700 max-w-[120px] truncate">
              {file.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FileAttachment;
