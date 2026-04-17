import type { FC } from 'react';
import { RETURN_REASONS } from '../../constants';

interface ReasonSelectorProps {
  selectedReason: string;
  onSelectReason: (reason: string) => void;
  onNext: () => void;
}

const ReasonSelector: FC<ReasonSelectorProps> = ({
  selectedReason,
  onSelectReason,
  onNext,
}) => {
  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        <p className="text-gray-700 text-sm font-medium mb-3">
          Why are you returning this item?
        </p>
        <fieldset className="space-y-4">
          {RETURN_REASONS.map((reason, index) => (
            <div key={index} className="flex items-center">
              <input
                id={`return-reason-${index}`}
                name="return-reason"
                type="radio"
                value={reason}
                checked={selectedReason === reason}
                onChange={() => onSelectReason(reason)}
                className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <label
                htmlFor={`return-reason-${index}`}
                className="ml-3 block text-gray-700 font-medium"
              >
                {reason}
              </label>
            </div>
          ))}
        </fieldset>
      </div>
      <div className="flex justify-start md:justify-end mt-6">
        <button
          type="button"
          className={`bg-primary text-white py-2 px-6 rounded-md cursor-pointer hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${
            selectedReason ? '' : 'opacity-50 cursor-not-allowed'
          }`}
          onClick={onNext}
          disabled={!selectedReason}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ReasonSelector;
