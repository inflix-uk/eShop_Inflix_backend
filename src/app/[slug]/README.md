# Dynamic Catch-All Route for Footer Pages

This catch-all route handles any footer page slug at the root level (e.g., `/hello`, `/terms-and-conditions`, `/privacy-policy`).

## Route Structure

- **Path**: `app/[slug]/page.tsx`
- **URL Pattern**: `/{slug}` (e.g., `/hello`, `/terms-and-conditions`)

## How It Works

1. **Route Matching**: Next.js matches routes by specificity. More specific routes (like `/products`, `/checkout`) take precedence over the catch-all route.

2. **Page Fetching**:

   - Fetches page data from `GET /footer-pages/pagesBySlug/:slug`
   - Uses the slug from the URL parameter
   - URL-encodes the slug to handle special characters

3. **Publish Status Check**:

   - Only displays pages with `publishStatus === "published"`
   - Returns 404 for unpublished pages or pages that don't exist

4. **Rendering**:
   - Banner image (if exists)
   - Page title as h1
   - Blocks structure (rows → columns → blocks)
   - Text blocks render HTML content
   - Image blocks render images with optional headings and external links

## Features

✅ **SEO Optimized**

- Dynamic metadata from page data
- Open Graph tags
- Twitter cards
- Canonical URLs
- JSON-LD schemas

✅ **Loading States**

- Skeleton UI while fetching
- Proper error handling

✅ **Responsive Design**

- Mobile-first layout
- Flexbox for columns
- Responsive image handling

✅ **Image Handling**

- Proper URL construction from API paths
- Next.js Image optimization
- Support for external links

## Route Precedence

The catch-all route will **NOT** interfere with existing routes because Next.js matches more specific routes first:

- `/products` → Uses `app/(routes)/products/page.tsx`
- `/checkout` → Uses `app/(routes)/checkout/page.tsx`
- `/hello` → Uses `app/[slug]/page.tsx` (catch-all)
- `/terms-and-conditions` → Uses `app/[slug]/page.tsx` (catch-all)

## Environment Variables

Make sure these are set in your `.env` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## API Endpoint

The route fetches data from:

```
GET {NEXT_PUBLIC_API_URL}/footer-pages/pagesBySlug/:slug
```

## Example URLs

- `http://localhost:3000/hello` → Fetches page with slug "hello"
- `http://localhost:3000/terms-and-conditions` → Fetches page with slug "terms-and-conditions"
- `http://localhost:3000/privacy-policy` → Fetches page with slug "privacy-policy"

## Debugging

Check browser console for logs:

- `[DynamicFooterPage]` - Page rendering logs
- `[FooterPageService]` - API call logs

If a page returns 404:

1. Check if the page exists in the database
2. Verify `publishStatus === "published"`
3. Check the exact slug matches (case-insensitive)
4. Verify API base URL in environment variables
