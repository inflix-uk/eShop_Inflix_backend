"use client";

import { FC } from "react";

interface NewsletterSuccessModalProps {
  onClose: () => void;
}

const NewsletterSuccessModal: FC<NewsletterSuccessModalProps> = ({
  onClose,
}) => {
  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        <div
          className="fixed inset-0 bg-black opacity-50"
          onClick={onClose}
        ></div>
        <div className="bg-white rounded-lg shadow-xl flex flex-col transform transition-all sm:max-w-3xl w-full h-80 relative">
          <div className="flex flex-col justify-center items-center h-full w-full">
            <div className="mx-auto flex-shrink-0 flex flex-col items-center justify-center mt-5 md:mt-3">
              <div className="relative inline-block mb-8">
                <div className="relative z-10 w-36 h-36 background-check-confetti"></div>
                <div className="absolute top-0 left-0 w-36 h-36 background-confeti-square"></div>
              </div>

              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">
                  Thank you for your subscription!
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    You have successfully subscribed to our newsletter. You will
                    receive updates shortly.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col md:flex-row-reverse gap-4 rounded-b-lg">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NewsletterSuccessModal;
