import type { FC } from 'react';
import { FILTER_OPTIONS } from '../utils';

interface ReturnFilterProps {
  filterStatus: string;
  onFilterChange: (status: string) => void;
}

const ReturnFilter: FC<ReturnFilterProps> = ({ filterStatus, onFilterChange }) => {
  return (
    <section className="mb-6 flex flex-col md:flex-row items-center justify-between">
      <h2 className="text-xl font-semibold flex items-center">
        <div className="w-6 h-6 mr-2 bg-green-500 rounded flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        Return Orders
      </h2>
      <div className="flex items-center space-x-2 mt-4 md:mt-0">
        <select
          id="statusFilter"
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value)}
          className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
};

export default ReturnFilter;
