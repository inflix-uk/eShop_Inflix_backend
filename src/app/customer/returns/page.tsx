"use client";

import { useState } from 'react';
import Top from '@/app/customer/components/TopBar';
import Sidebar from '@/app/customer/components/Sidebar';
import {
  ReturnSummary,
  ReturnFilter,
  ReturnCard,
  EmptyState,
} from './components';
import { useReturns } from './hooks/useReturns';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

export default function ReturnsPage() {
  const [selectedPage, setSelectedPage] = useState('Returns');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Use custom hook for returns management
  const {
    filteredReturns,
    summary,
    isLoading,
    error,
    filterStatus,
    setFilterStatus,
  } = useReturns();

  // Sidebar handlers
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      <Sidebar
        selectedPage={selectedPage}
        setSelectedPage={setSelectedPage}
        isSidebarOpen={isSidebarOpen}
        closeSidebar={closeSidebar}
        toggleSidebar={toggleSidebar}
      />
      <div
        className={`lg:pl-72 ${isSidebarOpen ? 'pl-0' : ''} transition-all duration-300`}
      >
        <Top
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
        />
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <main className="max-w-screen-2xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Returns</h1>
              <p className="mt-2 text-sm text-gray-600">
                Check the status of return orders, manage returns, and discover
                similar products.
              </p>
            </div>

            {/* Summary Section */}
            <ReturnSummary summary={summary} />

            {/* Filter Section */}
            <ReturnFilter
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
            />

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Loading returns...</span>
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
                  Error Loading Returns
                </h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Returns List */}
            {!isLoading && !error && (
              <section>
                {filteredReturns.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-6">
                    {filteredReturns.map((order) => (
                      <ReturnCard
                        key={order._id}
                        order={order}
                        baseUrl={baseUrl}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
