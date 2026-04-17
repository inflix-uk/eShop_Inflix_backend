import type { FC } from 'react';
import type { RequestOrder } from '../types';
import { formatTimelineDate, formatTimelineTime, formatShortDate, getTimelineProgress } from '../utils';

interface ReturnTimelineProps {
  order: RequestOrder;
}

const ReturnTimeline: FC<ReturnTimelineProps> = ({ order }) => {
  const progressWidth = getTimelineProgress(order);

  return (
    <div className="px-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h4 className="text-sm font-semibold text-gray-700">Return Timeline</h4>
      </div>

      <div className="relative flex items-start justify-between">
        {/* Connecting Line Background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>

        {/* Progress Line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-green-500 z-0 transition-all duration-500"
          style={{ width: progressWidth }}
        ></div>

        {/* Step 1: Return Request Submitted */}
        <div className="relative z-10 flex flex-col items-center flex-1">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs font-semibold text-gray-900">Request Submitted</p>
            <p className="text-[10px] text-gray-500">
              {formatTimelineDate(order.createdAt)}
            </p>
            <p className="text-[10px] text-gray-400">
              {formatTimelineTime(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Step 2: Under Review / Decision Made */}
        <div className="relative z-10 flex flex-col items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all ${
              order.status === 'Pending'
                ? 'bg-yellow-500 animate-pulse'
                : order.status === 'Accepted'
                ? 'bg-green-500'
                : order.status === 'Rejected'
                ? 'bg-red-500'
                : 'bg-gray-200'
            }`}
          >
            {order.status === 'Pending' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : order.status === 'Accepted' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : order.status === 'Rejected' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <div className="mt-2 text-center">
            {order.status === 'Pending' ? (
              <>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <p className="text-xs font-semibold text-gray-900">Under Review</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">Awaiting decision...</p>
              </>
            ) : order.status === 'Accepted' ? (
              <>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <p className="text-xs font-semibold text-gray-900">Approved</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-800">
                    Accepted
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  {order.updatedAt ? formatShortDate(order.updatedAt) : '-'}
                </p>
              </>
            ) : order.status === 'Rejected' ? (
              <>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <p className="text-xs font-semibold text-gray-900">Rejected</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-800">
                    Rejected
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  {order.updatedAt ? formatShortDate(order.updatedAt) : '-'}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-400">Review</p>
                <p className="text-[10px] text-gray-400">-</p>
              </>
            )}
          </div>
        </div>

        {/* Step 3: Completed / Return Order Created */}
        <div className="relative z-10 flex flex-col items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all ${
              order.converted || order.status === 'Accepted'
                ? 'bg-blue-500'
                : order.status === 'Rejected'
                ? 'bg-gray-300'
                : order.status === 'Pending'
                ? 'bg-gray-200 animate-pulse'
                : 'bg-gray-200'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                order.converted || order.status === 'Accepted'
                  ? 'text-white'
                  : 'text-gray-400'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="mt-2 text-center">
            {order.converted || order.status === 'Accepted' ? (
              <>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <p className="text-xs font-semibold text-gray-900">Completed</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-800">
                    Done
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  {order.convertedAt
                    ? formatShortDate(order.convertedAt)
                    : order.updatedAt
                    ? formatShortDate(order.updatedAt)
                    : '-'}
                </p>
              </>
            ) : order.status === 'Rejected' ? (
              <>
                <p className="text-xs font-medium text-gray-400">Completed</p>
                <p className="text-[10px] text-gray-400">Request denied</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-400">Completed</p>
                <p className="text-[10px] text-gray-400">Awaiting...</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnTimeline;
