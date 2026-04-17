import type { FC } from 'react';

const EmptyState: FC = () => {
  return (
    <div className="text-center bg-white shadow rounded-lg p-10">
      <svg
        className="h-16 w-16 mx-auto text-gray-300 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <p className="text-gray-500 text-lg">No return orders found.</p>
    </div>
  );
};

export default EmptyState;
