import type { FC } from 'react';
import { useEffect, useMemo } from 'react';
import { FiX } from 'react-icons/fi';
import type { FileType } from '../../types';

function LocalFileImageThumb({
  file,
  onPreview,
}: {
  file: File;
  onPreview: (file: FileType) => void;
}) {
  const objectUrl = useMemo(
    () => URL.createObjectURL(file),
    [file.name, file.size, file.lastModified, file.type]
  );
  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  return (
    <img
      src={objectUrl}
      alt={file.name}
      width={40}
      height={40}
      className="w-10 h-10 object-cover rounded cursor-pointer"
      onClick={() =>
        onPreview({
          url: objectUrl,
          name: file.name,
          type: file.type,
        })
      }
    />
  );
}

interface SelectedFilesListProps {
  files: File[];
  onRemove: (index: number) => void;
  onPreview: (file: FileType) => void;
}

/**
 * SelectedFilesList Component
 * Displays the list of files selected for upload
 */
const SelectedFilesList: FC<SelectedFilesListProps> = ({
  files,
  onRemove,
  onPreview
}) => {
  if (files.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {files.map((file, index) => (
        <div
          key={index}
          className="flex items-center justify-between bg-gray-100 p-2 rounded"
        >
          {file.type.startsWith('image/') ? (
            <div className="flex items-center gap-2">
              <LocalFileImageThumb file={file} onPreview={onPreview} />
              <span className="text-sm text-gray-600 truncate">
                {file.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-600">{file.name}</span>
          )}
          <button
            className="text-red-500 hover:text-red-700"
            onClick={() => onRemove(index)}
            aria-label="Remove file"
          >
            <FiX size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default SelectedFilesList;
