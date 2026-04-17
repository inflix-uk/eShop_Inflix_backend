"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/Auth';
import { getUserReturns, sendReturnMessage } from '../services/returnsService';
import { calculateSummary, filterOrdersByStatus } from '../utils';
import type { RequestOrder, ReturnSummary } from '../types';

interface UseReturnsReturn {
  // Data
  returns: RequestOrder[];
  filteredReturns: RequestOrder[];
  summary: ReturnSummary;

  // State
  isLoading: boolean;
  error: string | null;

  // Filter
  filterStatus: string;
  setFilterStatus: (status: string) => void;

  // Actions
  refetchReturns: () => Promise<void>;
  sendMessage: (requestOrder: RequestOrder) => Promise<void>;
}

export const useReturns = (): UseReturnsReturn => {
  const auth = useAuth();
  const router = useRouter();
  const userId = auth?.user?._id;

  // State
  const [returns, setReturns] = useState<RequestOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Fetch returns
  const fetchReturns = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getUserReturns(userId);
      if (response.status === 201) {
        setReturns(response.requestOrders);
      } else {
        setError('Failed to fetch return orders');
      }
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError('An error occurred while fetching return orders');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Send message handler
  const sendMessage = useCallback(
    async (requestOrder: RequestOrder) => {
      if (!userId) return;

      try {
        await sendReturnMessage(userId, '', [], requestOrder);
        router.push('/customer/messages');
      } catch (err) {
        console.error('Error sending message:', err);
      }
    },
    [userId, router]
  );

  // Computed values
  const filteredReturns = filterOrdersByStatus(returns, filterStatus);
  const summary = calculateSummary(returns);

  return {
    returns,
    filteredReturns,
    summary,
    isLoading,
    error,
    filterStatus,
    setFilterStatus,
    refetchReturns: fetchReturns,
    sendMessage,
  };
};

export default useReturns;
