import type { FC } from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuccessModal: FC<SuccessModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="bg-white shadow-xl flex flex-col transform transition-all sm:max-w-3xl w-full relative rounded-lg z-10">
        {/* Header */}
        <div className="flex justify-between items-center w-full p-4 border-b border-gray-400">
          <h3 className="text-2xl font-semibold text-primary">
            Return Request Submitted
          </h3>
          <button
            type="button"
            className="text-2xl text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col justify-center items-center h-full w-full py-8">
          <div className="mx-auto flex-shrink-0 flex flex-col items-center justify-center">
            {/* Success Icon */}
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Message */}
            <div className="text-center px-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Thank you for your submission!
              </h4>
              <p className="text-gray-500">
                Your return request has been successfully submitted. Our team will
                review your request and process it shortly. You will receive an email
                notification once your request has been reviewed.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 flex flex-col md:flex-row-reverse gap-4 border-t border-gray-200">
          <button
            type="button"
            className="px-6 py-3 text-sm font-bold text-white uppercase transition-all duration-150 ease-linear bg-primary rounded shadow hover:bg-green-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
