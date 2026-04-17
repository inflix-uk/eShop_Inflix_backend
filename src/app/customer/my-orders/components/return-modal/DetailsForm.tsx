import type { FC } from 'react';
import type { ImageFile } from '../../types';
import ImageUploader from './ImageUploader';

interface DetailsFormProps {
  selectedReason: string;
  orderDetails: string;
  onDetailsChange: (details: string) => void;
  images: ImageFile[];
  onImageUpload: (files: FileList) => void;
  onImageRemove: (id: string) => void;
  onImageClick: (index: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isValid: boolean;
}

const DetailsForm: FC<DetailsFormProps> = ({
  selectedReason,
  orderDetails,
  onDetailsChange,
  images,
  onImageUpload,
  onImageRemove,
  onImageClick,
  onBack,
  onSubmit,
  isSubmitting,
  isValid,
}) => {
  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        {/* Selected Reason Display */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <svg
              className="w-6 h-6 text-green-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4"
              />
            </svg>
            <p className="text-gray-800 text-lg font-medium">
              Reason:
              <span className="font-semibold text-green-700 pl-1">
                {selectedReason}
              </span>
            </p>
          </div>

          {/* Additional Details Textarea */}
          <div>
            <label
              htmlFor="orderDetails"
              className="block text-gray-700 text-sm font-medium md:mb-2"
            >
              Additional Details <span className="text-red-500">*</span>
            </label>
            {!orderDetails && (
              <p className="text-sm text-red-500">(Additional details are required)</p>
            )}
            <textarea
              id="orderDetails"
              name="orderDetails"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Provide any additional information about your return... (required)"
              value={orderDetails}
              onChange={(e) => onDetailsChange(e.target.value)}
              rows={8}
              aria-label="Additional details for return"
              required
            />
          </div>
        </div>

        {/* Image Uploader */}
        <ImageUploader
          images={images}
          onUpload={onImageUpload}
          onRemove={onImageRemove}
          onImageClick={onImageClick}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between sticky bottom-0 bg-white pt-4">
        <button
          type="button"
          className="bg-blue-500 py-2 px-4 rounded-md text-white hover:bg-blue-600 transition-colors"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className={`bg-primary text-white py-2 px-4 rounded-md hover:bg-green-600 inline-flex items-center transition-colors ${
            !isValid || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </>
          ) : (
            'Confirm Return'
          )}
        </button>
      </div>
    </div>
  );
};

export default DetailsForm;
