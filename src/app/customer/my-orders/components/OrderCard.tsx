"use client";

import type { FC } from 'react';
import type { Order, ImageFile } from '../types';
import { calculateOrderDetails, getOrderBorderStyle } from '../utils';
import { useAuth } from '@/app/context/Auth';

import OrderHeader from './OrderHeader';
import ProductItem from './ProductItem';
import OrderTimeline from './OrderTimeline';
import OrderStatusSection from './OrderStatusSection';

interface OrderCardProps {
  order: Order;
  onStartChat: (order: Order) => void;
  onOpenReturnModal: (order: Order) => void;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedReason: string;
  setSelectedReason: (reason: string) => void;
  orderDetails: string;
  setOrderDetails: (details: string) => void;
  orderImages: ImageFile[];
  setOrderImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
  currentOrder: Order | null;
}

const OrderCard: FC<OrderCardProps> = ({
  order,
  onStartChat,
  onOpenReturnModal,
  isModalOpen,
  setIsModalOpen,
  selectedReason,
  setSelectedReason,
  orderDetails,
  setOrderDetails,
  orderImages,
  setOrderImages,
  currentOrder,
}) => {
  const auth = useAuth();
  const baseUrl = auth?.ip || process.env.NEXT_PUBLIC_API_URL || '';
  const calculations = calculateOrderDetails(order);
  const { regularItems } = calculations;
  const isCurrentOrder = currentOrder?._id === order._id;

  return (
    <div
      className={`bg-white rounded-xl ${getOrderBorderStyle(
        order.status
      )} shadow-sm hover:shadow-md transition-shadow duration-200`}
    >
      {/* Order Header */}
      <OrderHeader order={order} calculations={calculations} />

      {/* Products Section */}
      <div className="p-6">
        <div className="space-y-4">
          {regularItems.map((product) => (
            <ProductItem key={product._id} item={product} baseUrl={baseUrl} />
          ))}
        </div>
      </div>

      {/* Order Timeline - Only show when return request is initiated */}
      {order.returnRequestInitiated && <OrderTimeline order={order} />}

      {/* Status Section */}
      <OrderStatusSection
        order={order}
        onStartChat={onStartChat}
        onOpenReturnModal={onOpenReturnModal}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        orderDetails={orderDetails}
        setOrderDetails={setOrderDetails}
        orderImages={orderImages}
        setOrderImages={setOrderImages}
        isCurrentOrder={isCurrentOrder}
      />
    </div>
  );
};

export default OrderCard;
