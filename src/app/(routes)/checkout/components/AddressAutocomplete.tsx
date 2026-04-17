"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AddressService, AutocompleteSuggestion, GetAddressResult } from '../services/addressService';

interface AddressAutocompleteProps {
  onAddressSelect: (address: {
    address: string;
    apartment?: string;
    city: string;
    county: string;
    postalCode: string;
  }) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onAddressSelect,
  placeholder = "Start typing your address...",
  className = "",
  initialValue = "",
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addressService = AddressService.init();

  // Debounced search function
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const searchAddresses = useCallback(async (term: string) => {
    if (term.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const results = await addressService.getAutocompleteSuggestions(term, {
        top: 6,
        filter: {
          residential: true, // Focus on residential addresses
        }
      });

      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Address search failed:', error);
      setError('Failed to search addresses');
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, [addressService]);

  const debouncedSearch = useCallback((term: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      searchAddresses(term);
    }, 300);
  }, [searchAddresses]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleSuggestionClick = async (suggestion: AutocompleteSuggestion) => {
    setLoading(true);
    setShowDropdown(false);

    try {
      const addressDetails = await addressService.getAddressById(suggestion.id);

      if (addressDetails) {
        const formattedAddress = {
          address: addressDetails.line_1,
          apartment: addressDetails.line_2 || undefined,
          city: addressDetails.town_or_city,
          county: addressDetails.county,
          postalCode: addressDetails.postcode,
        };

        onAddressSelect(formattedAddress);
        setSearchTerm(suggestion.address);
      } else {
        setError('Failed to get address details');
      }
    } catch (error) {
      console.error('Failed to get address details:', error);
      setError('Failed to get address details');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Address Lookup
        </label>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            className="
              block w-full rounded-md border-gray-300 shadow-sm
              focus:border-primary focus:ring-primary sm:text-sm
              pr-10
            "
            autoComplete="off"
          />

          {/* Loading indicator */}
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}

          {/* Search icon */}
          {!loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {/* Suggestions dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`
                  px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0
                  ${index === selectedIndex ? 'bg-primary bg-opacity-10' : 'hover:bg-gray-50'}
                  transition-colors duration-150
                `}
              >
                <div className="text-sm font-medium text-gray-900">
                  {suggestion.address}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-gray-500">
          Type at least 3 characters to search for addresses
        </div>
      </div>
    </div>
  );
};

export default AddressAutocomplete;