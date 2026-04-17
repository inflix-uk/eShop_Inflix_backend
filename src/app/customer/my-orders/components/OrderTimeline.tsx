import type { FC } from 'react';
import type { Order } from '../types';
import { formatTimelineDate, formatTimelineTime, getTimelineProgress } from '../utils';
import { useAuth } from '@/app/context/Auth';

interface OrderTimelineProps {
  order: Order;
}

const OrderTimeline: FC<OrderTimelineProps> = ({ order }) => {
  const progressWidth = getTimelineProgress(order);
  const auth = useAuth();

  // Get label URL if available
  const getLabelUrl = (): string | null => {
    if (order.returnOrderLabel?.filePath) {
      const filePath = order.returnOrderLabel.filePath;
      const uploadsIndex = filePath.indexOf('uploads');
      if (uploadsIndex !== -1) {
        return `${auth.ip}uploads${filePath.slice(uploadsIndex + 7)}`;
      }
    }
    return null;
  };

  const labelUrl = getLabelUrl();

  return (
    <div className="px-6 py-4 border-t border-gray-100">
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
        <h4 className="text-sm font-semibold text-gray-700">Order Timeline</h4>
      </div>

      <div className="relative flex items-start justify-between">
        {/* Connecting Line Background */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>

        {/* Progress Line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-green-500 z-0 transition-all duration-500"
          style={{ width: progressWidth }}
        ></div>

        {/* Step 1: Order Created */}
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
            <p className="text-xs font-semibold text-gray-900">Order Created</p>
            <p className="text-[10px] text-gray-500">
              {formatTimelineDate(order.createdAt)}
            </p>
            <p className="text-[10px] text-gray-400">
              {formatTimelineTime(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Step 2: Return Request */}
        <div className="relative z-10 flex flex-col items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all ${
              order.returnRequestInitiated ? 'bg-yellow-500' : 'bg-gray-200'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                order.returnRequestInitiated ? 'text-white' : 'text-gray-400'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </div>
          <div className="mt-2 text-center">
            {order.returnRequestInitiated ? (
              <>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <p className="text-xs font-semibold text-gray-900">Return Request</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  {order.returnRequestInitiatedAt
                    ? formatTimelineDate(order.returnRequestInitiatedAt)
                    : '-'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {order.returnRequestInitiatedAt
                    ? formatTimelineTime(order.returnRequestInitiatedAt)
                    : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-400">Return Request</p>
                <p className="text-[10px] text-gray-400">Not initiated</p>
              </>
            )}
          </div>
        </div>

        {/* Step 3: Return Order */}
        <div className="relative z-10 flex flex-col items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all ${
              order.returnOrderId
                ? 'bg-blue-500'
                : order.returnRequestInitiated
                ? 'bg-gray-200 animate-pulse'
                : 'bg-gray-200'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                order.returnOrderId ? 'text-white' : 'text-gray-400'
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
            {order.returnOrderId ? (
              <>
                <div className="flex items-center justify-center gap-1 flex-wrap">
                  <p className="text-xs font-semibold text-gray-900">Return Order</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-800">
                    Approved
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">
                  {order.returnOrderConvertedAt
                    ? formatTimelineDate(order.returnOrderConvertedAt)
                    : '-'}
                </p>
                <p className="text-[10px] text-gray-400">
                  {order.returnOrderConvertedAt
                    ? formatTimelineTime(order.returnOrderConvertedAt)
                    : ''}
                </p>
                {/* Download Label Button */}
                {labelUrl && (
                  <a
                    href={labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Label
                  </a>
                )}
              </>
            ) : order.returnRequestInitiated ? (
              <>
                <p className="text-xs font-medium text-gray-400">Return Order</p>
                <p className="text-[10px] text-gray-400">Awaiting approval...</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-400">Return Order</p>
                <p className="text-[10px] text-gray-400">-</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;
