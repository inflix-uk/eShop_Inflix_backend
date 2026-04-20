class BlogCache {
    constructor() {
        this.cache = new Map();
        this.TTL = 60 * 60 * 1000; // 1 hour in milliseconds
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if cache is still valid
        if (Date.now() - item.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear() {
        this.cache.clear();
    }

    // Remove all expired cache entries
    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.TTL) {
                this.cache.delete(key);
            }
        }
    }
}

// Create a singleton instance
const blogCache = new BlogCache();

// Clean up expired cache entries every hour
setInterval(() => blogCache.cleanup(), 60 * 60 * 1000);

module.exports = blogCache;