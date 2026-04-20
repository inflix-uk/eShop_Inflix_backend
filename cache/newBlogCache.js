// cache/newBlogCache.js

class NewBlogCache {
    constructor(ttlMs = 3600000) { // 1 hour default
        this.cache = new Map();
        this.TTL = ttlMs;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }

    set(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    del(key) {
        this.cache.delete(key);
    }
}

const blogCache = new NewBlogCache(3600000); // 1 hour TTL

async function getBlogPostBySlugCache(key, fetchFn) {
    const cached = blogCache.get(key);
    if (cached) return { data: cached, fromCache: true };
    const data = await fetchFn();
    if (data) blogCache.set(key, data);
    return { data, fromCache: false };
}

function invalidateBlogPostBySlugCache(key) {
    blogCache.del(key);
}

module.exports = {
    getBlogPostBySlugCache,
    invalidateBlogPostBySlugCache
};