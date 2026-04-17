"use client";

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { submitReturnRequest } from '../services/ordersService';
import type { Order, ImageFile } from '../types';
import { MAX_RETURN_IMAGES } from '../constants';

interface UseReturnModalProps {
  order: Order;
  selectedReason: string;
  setSelectedReason: (reason: string) => void;
  orderDetails: string;
  setOrderDetails: (details: string) => void;
  orderImages: ImageFile[];
  setOrderImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
  onClose: () => void;
}

interface UseReturnModalReturn {
  // Step management
  step: number;
  goToNextStep: () => void;
  goToPrevStep: () => void;

  // Image management
  handleImageUpload: (files: FileList) => void;
  handleRemoveImage: (id: string) => void;

  // Image preview
  isImagePreviewOpen: boolean;
  currentImageIndex: number;
  openImagePreview: (index: number) => void;
  closeImagePreview: () => void;
  goToPrevImage: () => void;
  goToNextImage: () => void;

  // Form submission
  isSubmitting: boolean;
  isFormValid: boolean;
  handleSubmit: () => Promise<void>;

  // Success modal
  isSuccessModalOpen: boolean;
  closeSuccessModal: () => void;

  // Modal close
  closeModal: () => void;
}

export const useReturnModal = ({
  order,
  selectedReason,
  setSelectedReason,
  orderDetails,
  setOrderDetails,
  orderImages,
  setOrderImages,
  onClose,
}: UseReturnModalProps): UseReturnModalReturn => {
  // Step state
  const [step, setStep] = useState<number>(1);

  // Image preview state
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      orderImages.forEach((image) => URL.revokeObjectURL(image.id));
    };
  }, []);

  // Form validation
  const isFormValid = Boolean(orderDetails && orderImages.length > 0);

  // Step navigation
  const goToNextStep = useCallback(() => {
    if (selectedReason) {
      setStep(2);
    }
  }, [selectedReason]);

  const goToPrevStep = useCallback(() => {
    setStep(1);
  }, []);

  // Image upload handler
  const handleImageUpload = useCallback(
    (files: FileList) => {
      const remainingSlots = MAX_RETURN_IMAGES - orderImages.length;
      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const uploadedImages = filesToUpload.map((file) => ({
        id: URL.createObjectURL(file),
        file,
      }));
      setOrderImages((prev) => [...uploadedImages, ...prev]);
    },
    [orderImages.length, setOrderImages]
  );

  // Image removal handler
  const handleRemoveImage = useCallback(
    (id: string) => {
      setOrderImages((prevImages) => {
        const removedImage = prevImages.find((image) => image.id === id);
        if (removedImage) {
          URL.revokeObjectURL(removedImage.id);
        }
        return prevImages.filter((image) => image.id !== id);
      });
    },
    [setOrderImages]
  );

  // Image preview handlers
  const openImagePreview = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setIsImagePreviewOpen(true);
  }, []);

  const closeImagePreview = useCallback(() => {
    setIsImagePreviewOpen(false);
  }, []);

  const goToPrevImage = useCallback(() => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? orderImages.length - 1 : prev - 1
    );
  }, [orderImages.length]);

  const goToNextImage = useCallback(() => {
    setCurrentImageIndex((prev) =>
      prev === orderImages.length - 1 ? 0 : prev + 1
    );
  }, [orderImages.length]);

  // Modal close handler
  const closeModal = useCallback(() => {
    onClose();
    setSelectedReason('');
    setOrderDetails('');
    orderImages.forEach((image) => URL.revokeObjectURL(image.id));
    setOrderImages([]);
    setStep(1);
    setIsImagePreviewOpen(false);
  }, [onClose, orderImages, setOrderDetails, setOrderImages, setSelectedReason]);

  // Success modal handler
  const closeSuccessModal = useCallback(() => {
    setIsSuccessModalOpen(false);
  }, []);

  // Form submission handler
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !isFormValid) return;

    setIsSubmitting(true);

    try {
      const response = await submitReturnRequest(
        order,
        selectedReason,
        orderDetails,
        orderImages,
        'Pending'
      );

      if (response.status === 200) {
        setIsSuccessModalOpen(true);
        closeModal();
      } else {
        toast.error(response.message || 'Failed to send return details');
      }
    } catch (error: any) {
      console.error('Error submitting return details:', error);
      const errorMessage =
        error.response?.data?.message || 'Error submitting return details';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    isFormValid,
    order,
    selectedReason,
    orderDetails,
    orderImages,
    closeModal,
  ]);

  return {
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
  };
};

export default useReturnModal;
