import type { FC } from 'react';
import type { RequestOrder } from '../types';
import ReturnHeader from './ReturnHeader';
import ReturnTimeline from './ReturnTimeline';
import ReturnProductItem from './ReturnProductItem';

interface ReturnCardProps {
  order: RequestOrder;
  baseUrl: string;
}

const ReturnCard: FC<ReturnCardProps> = ({ order, baseUrl }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <ReturnHeader order={order} />

      {/* Timeline */}
      <ReturnTimeline order={order} />

      {/* Order Items */}
      <div className="p-6">
        <div className="space-y-4">
          {order?.orderId?.cart?.map((product) => (
            <ReturnProductItem key={product._id} product={product} baseUrl={baseUrl} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReturnCard;
