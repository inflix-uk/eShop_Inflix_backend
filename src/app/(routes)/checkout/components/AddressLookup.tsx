"use client";

import React, { useState, useEffect } from 'react';
import { AddressService, AddressLookupResult } from '../services/addressService';

interface AddressLookupProps {
  onAddressSelect: (address: {
    address: string;
    city: string;
    county: string;
    postalCode: string;
  }) => void;
  initialPostcode?: string;
  className?: string;
}

const AddressLookup: React.FC<AddressLookupProps> = ({
  onAddressSelect,
  initialPostcode = '',
  className = '',
}) => {
  const [postcode, setPostcode] = useState(initialPostcode);
  const [addresses, setAddresses] = useState<AddressLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPostcodeValid, setIsPostcodeValid] = useState<boolean | null>(null);

  const addressService = AddressService.init();

  // Validate postcode format as user types
  useEffect(() => {
    if (postcode.length > 0) {
      const isValid = addressService.isValidPostcodeFormat(postcode);
      setIsPostcodeValid(isValid);
    } else {
      setIsPostcodeValid(null);
    }
  }, [postcode, addressService]);

  const handlePostcodeSearch = async () => {
    if (!postcode.trim()) {
      setError('Please enter a postcode');
      return;
    }

    if (!addressService.isValidPostcodeFormat(postcode)) {
      setError('Please enter a valid UK postcode');
      return;
    }

    setLoading(true);
    setError('');
    setAddresses([]);

    try {
      // First validate the postcode
      const validation = await addressService.validatePostcode(postcode);

      if (!validation.valid) {
        setError('Invalid postcode');
        setLoading(false);
        return;
      }

      // Then lookup addresses
      const result = await addressService.lookupAddressByPostcode(postcode);

      if (result.success && result.addresses.length > 0) {
        setAddresses(result.addresses);
        setShowDropdown(true);
      } else {
        setError(result.message || 'No addresses found for this postcode');
      }
    } catch (error) {
      console.error('Address lookup error:', error);
      setError('Failed to lookup addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (address: AddressLookupResult) => {
    const formattedAddress = {
      address: `${address.line_1}${address.line_2 ? `, ${address.line_2}` : ''}`,
      city: address.town_or_city,
      county: address.county,
      postalCode: postcode,
    };

    onAddressSelect(formattedAddress);
    setShowDropdown(false);
    setAddresses([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePostcodeSearch();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          UK Postcode Lookup
        </label>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter UK postcode (e.g., SW1A 1AA)"
              className={`
                block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm
                ${isPostcodeValid === false ? 'border-red-500' : ''}
                ${isPostcodeValid === true ? 'border-green-500' : ''}
              `}
              maxLength={8}
            />

            {/* Postcode format indicator */}
            {isPostcodeValid !== null && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isPostcodeValid ? (
                  <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handlePostcodeSearch}
            disabled={loading || !isPostcodeValid}
            className="
              px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
              bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
              disabled:bg-gray-300 disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Finding...
              </div>
            ) : (
              'Find'
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm mt-1">{error}</p>
        )}

        {/* Address dropdown */}
        {showDropdown && addresses.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <ul className="max-h-60 overflow-auto py-1">
              {addresses.map((address, index) => (
                <li
                  key={index}
                  onClick={() => handleAddressSelect(address)}
                  className="
                    px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm
                    border-b border-gray-100 last:border-b-0
                  "
                >
                  <div className="font-medium">
                    {address.line_1}
                    {address.line_2 && `, ${address.line_2}`}
                  </div>
                  <div className="text-gray-600">
                    {address.town_or_city}, {address.county}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Manual entry option */}
        <div className="text-xs text-gray-500">
          Can&apos;t find your address?{' '}
          <button
            type="button"
            onClick={() => setShowDropdown(false)}
            className="text-primary hover:underline"
          >
            Enter manually
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressLookup;