"use client";

import type { FC } from 'react';
import type { Order, ImageFile } from '../types';
import { useReturnModal } from '../hooks/useReturnModal';
import {
  ReasonSelector,
  DetailsForm,
  ImagePreviewModal,
  SuccessModal,
} from './return-modal';

interface ReturnItemModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (value: boolean) => void;
  selectedReason: string;
  setSelectedReason: (value: string) => void;
  order: Order;
  orderDetails: string;
  setOrderDetails: (value: string) => void;
  orderImages: ImageFile[];
  setOrderImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
}

const ReturnItemModal: FC<ReturnItemModalProps> = ({
  isModalOpen,
  setIsModalOpen,
  selectedReason,
  setSelectedReason,
  order,
  orderDetails,
  setOrderDetails,
  orderImages,
  setOrderImages,
}) => {
  const {
    step,
    goToNextStep,
    goToPrevStep,
    handleImageUpload,
    handleRemoveImage,
    isImagePreviewOpen,
    currentImageIndex,
    openImagePreview,
    closeImagePreview,
    goToPrevImage,
    goToNextImage,
    isSubmitting,
    isFormValid,
    handleSubmit,
    isSuccessModalOpen,
    closeSuccessModal,
    closeModal,
  } = useReturnModal({
    order,
    selectedReason,
    setSelectedReason,
    orderDetails,
    setOrderDetails,
    orderImages,
    setOrderImages,
    onClose: () => setIsModalOpen(false),
  });

  if (!isModalOpen) {
    return <SuccessModal isOpen={isSuccessModalOpen} onClose={closeSuccessModal} />;
  }

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50 px-2">
        <div
          className="bg-white p-2 md:p-4 rounded-lg w-full max-w-screen-md mx-auto"
          style={{ height: '650px' }}
        >
          {/* Header */}
          <div className="flex justify-between items-center relative border-b pb-2">
            <h2 className="text-xl font-bold text-gray-800 text-left">Return Item</h2>
            <button
              type="button"
              className="text-gray-400 font-extrabold hover:text-gray-600 focus:outline-none"
              onClick={closeModal}
              aria-label="Close modal"
            >
              &#x2715;
            </button>
          </div>

          {/* Content */}
          <div
            className="mt-4 overflow-y-auto scrollbar-thin scrollbar-webkit w-full px-2"
            style={{ height: 'calc(100% - 60px)' }}
          >
            {/* Step 1: Reason Selection */}
            {step === 1 && (
              <ReasonSelector
                selectedReason={selectedReason}
                onSelectReason={setSelectedReason}
                onNext={goToNextStep}
              />
            )}

            {/* Step 2: Details & Images */}
            {step === 2 && (
              <DetailsForm
                selectedReason={selectedReason}
                orderDetails={orderDetails}
                onDetailsChange={setOrderDetails}
                images={orderImages}
                onImageUpload={handleImageUpload}
                onImageRemove={handleRemoveImage}
                onImageClick={openImagePreview}
                onBack={goToPrevStep}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isValid={isFormValid}
              />
            )}

            {/* Image Preview Modal */}
            <ImagePreviewModal
              isOpen={isImagePreviewOpen}
              images={orderImages}
              currentIndex={currentImageIndex}
              onClose={closeImagePreview}
              onPrev={goToPrevImage}
              onNext={goToNextImage}
            />
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal isOpen={isSuccessModalOpen} onClose={closeSuccessModal} />
    </>
  );
};

export default ReturnItemModal;
