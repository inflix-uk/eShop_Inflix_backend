"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/Auth';
import { getUserOrders } from '../services/ordersService';
import type { Order, ImageFile } from '../types';

interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  refetchOrders: () => Promise<void>;
  // Modal state
  isModalOpen: boolean;
  currentOrder: Order | null;
  openReturnModal: (order: Order) => void;
  closeReturnModal: () => void;
  // Return form state
  selectedReason: string;
  setSelectedReason: (reason: string) => void;
  orderDetails: string;
  setOrderDetails: (details: string) => void;
  orderImages: ImageFile[];
  setOrderImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
}

export const useOrders = (): UseOrdersReturn => {
  const auth = useAuth();
  const userId = auth?.user?._id;

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Return form state
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<string>('');
  const [orderImages, setOrderImages] = useState<ImageFile[]>([]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getUserOrders(userId);
      if (response.status === 201) {
        setOrders(response.orders);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('An error occurred while fetching orders');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Modal handlers
  const openReturnModal = useCallback((order: Order) => {
    setCurrentOrder(order);
    setIsModalOpen(true);
    // Reset form state
    setSelectedReason('');
    setOrderDetails('');
    setOrderImages([]);
  }, []);

  const closeReturnModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentOrder(null);
    // Clean up image URLs
    orderImages.forEach((image) => URL.revokeObjectURL(image.id));
    setOrderImages([]);
    setSelectedReason('');
    setOrderDetails('');
  }, [orderImages]);

  return {
    orders,
    isLoading,
    error,
    refetchOrders: fetchOrders,
    isModalOpen,
    currentOrder,
    openReturnModal,
    closeReturnModal,
    selectedReason,
    setSelectedReason,
    orderDetails,
    setOrderDetails,
    orderImages,
    setOrderImages,
  };
};

export default useOrders;
