// Return reasons options
export const RETURN_REASONS = [
  'Ordered by mistake',
  'Arrived damaged',
  "Don't like it",
  'Missing parts or pieces',
  'Changed my mind',
  'Item is defective',
  'Received wrong item',
  "Doesn't fit",
  'Found a better price',
  "Doesn't match description or photos",
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

// Maximum images allowed for return request
export const MAX_RETURN_IMAGES = 10;

// Return status options
export const RETURN_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
} as const;
