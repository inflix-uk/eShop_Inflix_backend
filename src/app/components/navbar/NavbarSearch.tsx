"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Product } from "../../../../types";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

export default function NavbarSearch() {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const MIN_SEARCH_LENGTH = 2;

  // Debounced API call for search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length < MIN_SEARCH_LENGTH) {
        setFilteredSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/navbar/suggestions?q=${encodeURIComponent(searchTerm)}&limit=20`
        );
        const data = await response.json();

        if (data.status === 200 && data.suggestions) {
          setFilteredSuggestions(data.suggestions);
        } else {
          setFilteredSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setFilteredSuggestions([]);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchSuggestions, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() !== "") {
      const formattedSearchTerm = searchTerm
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-"); // Replace spaces with hyphens and avoid multiple hyphens
      router.push(`/searchproduct/${formattedSearchTerm}`);
    }
  };

  const handleSuggestionClick = (suggestion: Product) => {
    setSearchTerm(suggestion.producturl);
    const cleanSlug = suggestion.producturl?.replace(/-\d{13}$/, "") ?? "";
    const productUrl = `/products/${cleanSlug}`;
    if (pathname !== productUrl) {
      router.push(productUrl);
    }
  };

  return (
    <div className="relative w-full">
      <form className="w-full" onSubmit={handleSearchSubmit}>
        <label
          htmlFor="default-search"
          className="mb-2 text-sm font-medium text-gray-900 sr-only"
        >
          Search
        </label>
        <div className="relative">
          <button
            type="submit"
            className="absolute inset-y-0 right-2 flex items-center justify-center w-11 h-11 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:bg-gray-100 active:bg-gray-200"
            aria-label="Search products"
            title="Search"
          >
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-600 pointer-events-none" aria-hidden="true" focusable="false" />
          </button>
          <input
            type="search"
            id="default-search"
            className="block w-full p-4 pr-14 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary focus:border-primary"
            placeholder="Search for Products"
            required
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
            style={{
              WebkitAppearance: "none",
              MozAppearance: "none",
              fontSize: "16px", // Prevents zoom-in
            }}
          />
          {filteredSuggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto scrollbar-thin scrollbar-webkit">
              {filteredSuggestions.map((suggestion) => (
                <li
                  key={suggestion._id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="text-sm font-medium">{suggestion.name}</div>
                  <div className="text-xs text-gray-500">
                    {suggestion.condition}, {suggestion.category}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </div>
  );
}
