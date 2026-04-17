"use client";

import type { FC } from 'react';
import type { Order } from '../types';
import { isReturnInitiated, getReturnStatusLabel } from '../utils';
import ReturnItemModal from './ReturnModal';

interface OrderStatusSectionProps {
  order: Order;
  onStartChat: (order: Order) => void;
  onOpenReturnModal: (order: Order) => void;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  selectedReason: string;
  setSelectedReason: (reason: string) => void;
  orderDetails: string;
  setOrderDetails: (details: string) => void;
  orderImages: { id: string; file: File }[];
  setOrderImages: React.Dispatch<React.SetStateAction<{ id: string; file: File }[]>>;
  isCurrentOrder: boolean;
}

// Chat Button Component
const ChatButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-green-600 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-colors"
  >
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
    Start Chat
  </button>
);

// Status Alert Component
const StatusAlert: FC<{
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
}> = ({ type, message }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
};

// Return Button Component
const ReturnButton: FC<{
  order: Order;
  onOpenReturnModal: (order: Order) => void;
}> = ({ order, onOpenReturnModal }) => {
  const returnInitiated = isReturnInitiated(order);
  const statusLabel = getReturnStatusLabel(order);

  if (returnInitiated) {
    return (
      <div className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-sm font-medium text-gray-500">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {statusLabel}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpenReturnModal(order)}
      className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
    >
      Return This Item
    </button>
  );
};

const OrderStatusSection: FC<OrderStatusSectionProps> = ({
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
  isCurrentOrder,
}) => {
  const handleStartChat = () => onStartChat(order);

  return (
    <div className="px-6 pb-6">
      {/* Failed Status */}
      {order.status === 'Failed' && (
        <div className="space-y-4">
          <StatusAlert
            type="error"
            message="Unfortunately, there was an issue with your order, and it has not been processed successfully. Please contact us for further assistance."
          />
          <ChatButton onClick={handleStartChat} />
        </div>
      )}

      {/* Pending Status */}
      {order.status === 'Pending' && (
        <div className="space-y-4">
          <StatusAlert
            type="warning"
            message="Your Order is Being Prepared and Will Be on Its Way Soon!"
          />
          <ChatButton onClick={handleStartChat} />
        </div>
      )}

      {/* Shipped Status */}
      {order.status === 'Shipped' && order.shippingDetails && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">
              Your Order Has Been Dispatched and is on Its Way
            </p>
            <p className="text-sm text-green-700">
              Your order has been dispatched via{' '}
              <span className="font-semibold">{order.shippingDetails.provider}</span>. The
              tracking number is{' '}
              <span className="font-semibold">{order.shippingDetails.trackingNumber}</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`https://www.royalmail.com/track-your-item#/${order.orderNumber}`}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Order Tracker
            </a>
            <ReturnButton order={order} onOpenReturnModal={onOpenReturnModal} />
            <ChatButton onClick={handleStartChat} />
          </div>
          {isCurrentOrder && (
            <ReturnItemModal
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              selectedReason={selectedReason}
              setSelectedReason={setSelectedReason}
              order={order}
              orderDetails={orderDetails}
              setOrderDetails={setOrderDetails}
              orderImages={orderImages}
              setOrderImages={setOrderImages}
            />
          )}
        </div>
      )}

      {/* Refunded Status */}
      {order.status === 'Refunded' && (
        <div className="space-y-4">
          <StatusAlert
            type="success"
            message="Your refund has been processed successfully and should reflect in your account in 3 to 5 Days"
          />
          <ChatButton onClick={handleStartChat} />
        </div>
      )}

      {/* Cancelled Status */}
      {order.status === 'Cancelled' && (
        <div className="space-y-4">
          <StatusAlert
            type="error"
            message="Your order has been successfully canceled. If you have any questions or need further assistance, feel free to contact us."
          />
          <ChatButton onClick={handleStartChat} />
        </div>
      )}

      {/* Approved/Delivered Status */}
      {(order.status === 'Approved' || order.status === 'Delivered') && (
        <div className="space-y-4">
          <StatusAlert
            type="success"
            message={
              order.status === 'Delivered'
                ? 'Your order has been delivered successfully!'
                : 'Your order has been approved and is being processed.'
            }
          />
          <div className="flex flex-col sm:flex-row gap-3">
            {order.status === 'Delivered' && (
              <ReturnButton order={order} onOpenReturnModal={onOpenReturnModal} />
            )}
            <ChatButton onClick={handleStartChat} />
          </div>
          {isCurrentOrder && order.status === 'Delivered' && (
            <ReturnItemModal
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              selectedReason={selectedReason}
              setSelectedReason={setSelectedReason}
              order={order}
              orderDetails={orderDetails}
              setOrderDetails={setOrderDetails}
              orderImages={orderImages}
              setOrderImages={setOrderImages}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OrderStatusSection;
