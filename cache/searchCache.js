/**
 * Simple in-memory cache implementation for device search results
 * This can be extended or replaced with a more robust solution like Redis in the future
 */

class SearchCache {
    constructor(options = {}) {
        // Cache storage
        this.cache = {};
        
        // Cache configuration
        this.ttl = options.ttl || 12 * 60 * 60 * 1000; // Default: 12 hours in milliseconds
        this.maxSize = options.maxSize || 100;   // Maximum number of entries
        this.keys = [];                          // For tracking entry order (for LRU eviction)
    }

    /**
     * Generate a unique cache key from search parameters
     * @param {string} modelTypeName - The search query
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {string} - Unique cache key
     */
    generateKey(modelTypeName, page, limit) {
        return `${modelTypeName}:${page}:${limit}`;
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {object|null} - Cached value or null if not found/expired
     */
    get(key) {
        const item = this.cache[key];
        
        // Return null if item doesn't exist or has expired
        if (!item || Date.now() > item.expiry) {
            if (item) {
                // Clean up expired item
                delete this.cache[key];
                this.keys = this.keys.filter(k => k !== key);
            }
            return null;
        }
        
        // Move this key to the end of the keys array (most recently used)
        this.keys = this.keys.filter(k => k !== key);
        this.keys.push(key);
        
        return item.value;
    }

    /**
     * Store a value in cache
     * @param {string} key - Cache key
     * @param {object} value - Value to cache
     */
    set(key, value) {
        // Evict least recently used item if cache is full
        if (this.keys.length >= this.maxSize && !this.cache[key]) {
            const oldestKey = this.keys.shift();
            delete this.cache[oldestKey];
        }
        
        // Remove existing key from keys array if it exists
        if (this.cache[key]) {
            this.keys = this.keys.filter(k => k !== key);
        }
        
        // Add new entry
        this.cache[key] = {
            value,
            expiry: Date.now() + this.ttl
        };
        
        // Add key to the end of keys array (most recently used)
        this.keys.push(key);
    }

    /**
     * Clear the entire cache or a specific key
     * @param {string} [key] - Optional key to clear. If not provided, clears entire cache
     */
    clear(key) {
        if (key) {
            delete this.cache[key];
            this.keys = this.keys.filter(k => k !== key);
        } else {
            this.cache = {};
            this.keys = [];
        }
    }
}

// Create and export a singleton instance with default options
const searchCache = new SearchCache();

module.exports = searchCache;
