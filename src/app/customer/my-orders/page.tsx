"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Top from '@/app/customer/components/TopBar';
import Sidebar from '@/app/customer/components/Sidebar';
import { OrderCard } from './components';
import { useOrders } from './hooks/useOrders';
import type { Order } from './types';

export default function MyOrders() {
  const router = useRouter();
  const [selectedPage, setSelectedPage] = useState('My-Orders');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Use custom hook for orders management
  const {
    orders,
    isLoading,
    error,
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
  } = useOrders();

  // Sidebar handlers
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Navigation handler for starting chat
  const handleStartChat = (order: Order): void => {
    router.push(`/customer/messages?orderId=${order._id}&orderNumber=${order.orderNumber}`);
  };

  // Handler for opening return modal
  const handleOpenReturnModal = (order: Order): void => {
    openReturnModal(order);
  };

  // Handler for setting modal state (passed to OrderCard)
  const setIsModalOpen = (isOpen: boolean): void => {
    if (!isOpen) {
      closeReturnModal();
    }
  };

  return (
    <>
      <Sidebar
        selectedPage={selectedPage}
        setSelectedPage={setSelectedPage}
        isSidebarOpen={isSidebarOpen}
        closeSidebar={closeSidebar}
        toggleSidebar={toggleSidebar}
      />
      <div className={`lg:pl-72 ${isSidebarOpen ? 'pl-0' : ''}`}>
        <Top
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
        />
        <div className="px-4 sm:px-6 lg:px-8">
          <main className="py-16">
            {/* Page Header */}
            <div className="mx-auto w-full">
              <div className="mx-auto">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  Order history
                </h1>
                <p className="mt-2 text-sm text-gray-700">
                  Check the status of recent orders, manage returns, and discover similar
                  products.
                </p>
              </div>
            </div>

            {/* Orders Section */}
            <section aria-labelledby="recent-heading" className="mt-16">
              <h2 id="recent-heading" className="sr-only">
                Recent orders
              </h2>

              <div className="mx-auto">
                {/* Loading State */}
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    <span className="ml-3 text-gray-600">Loading orders...</span>
                  </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-red-400 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-red-800 mb-2">
                      Error Loading Orders
                    </h3>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && orders.length === 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-300 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
                    <p className="text-sm text-gray-500">
                      You haven&apos;t placed any orders yet. Start shopping to see your
                      orders here.
                    </p>
                    <button
                      onClick={() => router.push('/')}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Start Shopping
                    </button>
                  </div>
                )}

                {/* Orders List */}
                {!isLoading && !error && orders.length > 0 && (
                  <div className="space-y-6">
                    {orders.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        onStartChat={handleStartChat}
                        onOpenReturnModal={handleOpenReturnModal}
                        isModalOpen={isModalOpen}
                        setIsModalOpen={setIsModalOpen}
                        selectedReason={selectedReason}
                        setSelectedReason={setSelectedReason}
                        orderDetails={orderDetails}
                        setOrderDetails={setOrderDetails}
                        orderImages={orderImages}
                        setOrderImages={setOrderImages}
                        currentOrder={currentOrder}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
